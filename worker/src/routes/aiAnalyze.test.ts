import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    buildAiCacheKey,
    hashMarketContext,
    hashQuestion,
    handleAiAnalyzeRequest,
} from './aiAnalyze';
import * as workersAi from '../integrations/workersAi';
import { AI_CONFIG_DEFAULTS } from '../core/aiConfig';
import type { Env } from '../core/types';

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const validBody = {
    assetType: 'stock',
    symbol: 'AAPL',
    timeframe: '7D',
    chartData: [
        { timestamp: '2026-01-01T00:00:00.000Z', close: 100 },
        { timestamp: '2026-01-02T00:00:00.000Z', close: 105 },
    ],
    news: [
        {
            id: 'n1',
            title: 'News',
            url: 'https://example.com',
            snippet: 's',
            publishedAt: '2026-01-02T00:00:00.000Z',
            source: 'Wire',
        },
    ],
    question: 'What is the trend?',
};

function makeRequest(body: unknown, method = 'POST'): Request {
    return new Request('https://example.com/api/ai/analyze', {
        method,
        headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '1.2.3.4' },
        body: method === 'POST' ? JSON.stringify(body) : undefined,
    });
}

describe('AI cache key helpers', () => {
    it('changes when model or prompt version changes', () => {
        const base = {
            cacheNamespace: AI_CONFIG_DEFAULTS.cacheNamespace,
            model: AI_CONFIG_DEFAULTS.model,
            promptVersion: AI_CONFIG_DEFAULTS.promptVersion,
            assetType: 'stock',
            symbol: 'AAPL',
            timeframe: '7D',
            hourBucket: 1,
            questionHash: 'abc',
            contextHash: 'def',
        };
        const a = buildAiCacheKey(base);
        const b = buildAiCacheKey({ ...base, model: '@cf/other/model' });
        const c = buildAiCacheKey({ ...base, promptVersion: 'wai-v2' });
        expect(a).not.toBe(b);
        expect(a).not.toBe(c);
        expect(a.startsWith('ai:wai:v1:')).toBe(true);
        expect(a.includes('ai:')).toBe(true);
        // Old Gemini-era prefix alone is not the full key namespace
        expect(a.startsWith('ai:') && !a.startsWith('ai:wai:')).toBe(false);
    });

    it('hashes questions and market context stably', async () => {
        const q1 = await hashQuestion('  Hello World  ');
        const q2 = await hashQuestion('hello world');
        expect(q1).toBe(q2);

        const c1 = await hashMarketContext(validBody.chartData, validBody.news as any);
        const c2 = await hashMarketContext(
            [...validBody.chartData, { timestamp: '2026-01-03T00:00:00.000Z', close: 200 }],
            validBody.news as any
        );
        expect(c1).not.toBe(c2);
    });
});

describe('handleAiAnalyzeRequest', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('rejects non-POST methods', async () => {
        const res = await handleAiAnalyzeRequest(makeRequest(validBody, 'GET'), {}, cors);
        expect(res.status).toBe(405);
    });

    it('validates required fields', async () => {
        const res = await handleAiAnalyzeRequest(
            makeRequest({ assetType: 'stock', question: 'x' }),
            { AI: { run: vi.fn() } as unknown as Ai },
            cors
        );
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toBe('Missing required fields');
    });

    it('returns { answer } and sets CORS / rate-limit headers', async () => {
        vi.spyOn(workersAi, 'analyzeMarketContext').mockResolvedValue('Analyst text');
        const env = { AI: { run: vi.fn() } as unknown as Ai } as Env;

        const res = await handleAiAnalyzeRequest(makeRequest(validBody), env, cors);
        expect(res.status).toBe(200);
        expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
        expect(res.headers.get('X-RateLimit-Limit')).toBe('10');
        expect(res.headers.get('X-Cache-Status')).toBe('MISS');
        await expect(res.json()).resolves.toEqual({ answer: 'Analyst text' });
    });

    it('maps provider quota errors without Gemini fallback', async () => {
        vi.spyOn(workersAi, 'analyzeMarketContext').mockRejectedValue(
            new workersAi.AiProviderError('quota exhausted', 'quota', 429)
        );
        const env = { AI: { run: vi.fn() } as unknown as Ai } as Env;
        const res = await handleAiAnalyzeRequest(makeRequest(validBody), env, cors);
        expect(res.status).toBe(429);
        const body = await res.json();
        expect(body.error).toBe('Failed to analyze market data');
        expect(body.category).toBe('quota');
        expect(JSON.stringify(body)).not.toMatch(/Gemini|GEMINI/i);
    });

    it('does not cache invalid provider failures', async () => {
        const put = vi.fn();
        const get = vi.fn().mockResolvedValue(null);
        vi.spyOn(workersAi, 'analyzeMarketContext').mockRejectedValue(
            new workersAi.AiProviderError('empty', 'invalid_output', 502)
        );
        const env = {
            AI: { run: vi.fn() } as unknown as Ai,
            MARKETMIND_CACHE: { get, put, delete: vi.fn(), list: vi.fn() },
        } as unknown as Env;

        const res = await handleAiAnalyzeRequest(makeRequest(validBody), env, cors);
        expect(res.status).toBe(502);
        // Rate-limit counter may write to KV; analysis answers must not.
        const aiPuts = put.mock.calls.filter(
            (call: unknown[]) => typeof call[0] === 'string' && call[0].startsWith('ai:wai:')
        );
        expect(aiPuts).toHaveLength(0);
    });

    it('supports crypto and metal payloads', async () => {
        const spy = vi
            .spyOn(workersAi, 'analyzeMarketContext')
            .mockResolvedValue('ok');
        const env = { AI: { run: vi.fn() } as unknown as Ai } as Env;

        for (const assetType of ['crypto', 'metal'] as const) {
            const res = await handleAiAnalyzeRequest(
                makeRequest({ ...validBody, assetType, symbol: assetType === 'crypto' ? 'BTC' : 'XAU' }),
                env,
                cors
            );
            expect(res.status).toBe(200);
        }
        expect(spy).toHaveBeenCalledTimes(2);
    });
});
