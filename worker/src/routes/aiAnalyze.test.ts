import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    buildAiCacheKey,
    buildInferenceInputHash,
    handleAiAnalyzeRequest,
} from './aiAnalyze';
import * as workersAi from '../integrations/workersAi';
import { AI_CONFIG_DEFAULTS, resolveAiConfig } from '../core/aiConfig';
import { ANALYST_SYSTEM_PROMPT, buildPrompt } from '../core/promptBuilder';
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
        { timestamp: '2026-01-02T00:00:00.000Z', close: 101 },
        { timestamp: '2026-01-03T00:00:00.000Z', close: 105 },
    ],
    news: [
        {
            id: 'n1',
            title: 'News',
            url: 'https://example.com',
            snippet: 's',
            publishedAt: '2026-01-02T00:00:00.000Z',
            source: 'Wire',
            sentimentScore: 0.2,
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

function promptFor(body: typeof validBody) {
    return buildPrompt({
        assetType: body.assetType as 'stock',
        symbol: body.symbol,
        timeframe: body.timeframe as '7D',
        chartData: body.chartData,
        news: body.news,
        question: body.question,
    });
}

describe('inference cache identity', () => {
    it('changes when first close changes', async () => {
        const config = resolveAiConfig({});
        const a = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, promptFor(validBody));
        const altered = {
            ...validBody,
            chartData: [
                { timestamp: '2026-01-01T00:00:00.000Z', close: 90 },
                validBody.chartData[1],
                validBody.chartData[2],
            ],
        };
        const b = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, promptFor(altered));
        expect(a).not.toBe(b);
    });

    it('changes when an interior close changes the prompt', async () => {
        const config = resolveAiConfig({});
        const a = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, promptFor(validBody));
        const altered = {
            ...validBody,
            chartData: [
                validBody.chartData[0],
                { timestamp: '2026-01-02T00:00:00.000Z', close: 150 },
                validBody.chartData[2],
            ],
        };
        // Interior close affects high/low/volatility/mean in the prompt summary.
        expect(promptFor(altered)).not.toBe(promptFor(validBody));
        const b = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, promptFor(altered));
        expect(a).not.toBe(b);
    });

    it('changes when article title/source/date/sentiment change with same id', async () => {
        const config = resolveAiConfig({});
        const a = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, promptFor(validBody));
        const altered = {
            ...validBody,
            news: [
                {
                    ...validBody.news[0],
                    title: 'Different title',
                    source: 'OtherWire',
                    publishedAt: '2026-01-03T00:00:00.000Z',
                    sentimentScore: -0.5,
                },
            ],
        };
        const b = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, promptFor(altered));
        expect(a).not.toBe(b);
    });

    it('changes when generation settings change', async () => {
        const base = resolveAiConfig({});
        const tuned = resolveAiConfig({ AI_TEMPERATURE: '0.1', AI_MAX_COMPLETION_TOKENS: '512' });
        const prompt = promptFor(validBody);
        const a = await buildInferenceInputHash(base, ANALYST_SYSTEM_PROMPT, prompt);
        const b = await buildInferenceInputHash(tuned, ANALYST_SYSTEM_PROMPT, prompt);
        expect(a).not.toBe(b);
    });

    it('keeps case-distinct questions distinct', async () => {
        const config = resolveAiConfig({});
        const lower = { ...validBody, question: 'trend?' };
        const upper = { ...validBody, question: 'Trend?' };
        const a = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, promptFor(lower));
        const b = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, promptFor(upper));
        expect(a).not.toBe(b);
    });

    it('produces identical hashes for identical effective inputs', async () => {
        const config = resolveAiConfig({});
        const prompt = promptFor(validBody);
        const a = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, prompt);
        const b = await buildInferenceInputHash(config, ANALYST_SYSTEM_PROMPT, prompt);
        expect(a).toBe(b);
        expect(buildAiCacheKey({
            cacheNamespace: AI_CONFIG_DEFAULTS.cacheNamespace,
            inputHash: a,
            hourBucket: 1,
        }).startsWith('ai:wai:v2:')).toBe(true);
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

    it('returns 400 for malformed JSON and invalid payloads', async () => {
        const badJson = new Request('https://example.com/api/ai/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{not-json',
        });
        const resJson = await handleAiAnalyzeRequest(
            badJson,
            { AI: { run: vi.fn() } as unknown as Ai },
            cors
        );
        expect(resJson.status).toBe(400);

        const resFields = await handleAiAnalyzeRequest(
            makeRequest({ assetType: 'stock', question: 'x' }),
            { AI: { run: vi.fn() } as unknown as Ai },
            cors
        );
        expect(resFields.status).toBe(400);
        const body = (await resFields.json()) as { error: string };
        expect(body.error).toBe('Invalid request');
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
            new workersAi.AiProviderError('quota exhausted', 'quota', 429, 3036)
        );
        const env = { AI: { run: vi.fn() } as unknown as Ai } as Env;
        const res = await handleAiAnalyzeRequest(makeRequest(validBody), env, cors);
        expect(res.status).toBe(429);
        const body = (await res.json()) as {
            error: string;
            category: string;
            providerCode?: number;
        };
        expect(body.error).toBe('Failed to analyze market data');
        expect(body.category).toBe('quota');
        expect(body.providerCode).toBe(3036);
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
        const aiPuts = put.mock.calls.filter(
            (call: unknown[]) => typeof call[0] === 'string' && String(call[0]).startsWith('ai:wai:')
        );
        expect(aiPuts).toHaveLength(0);
    });

    it('still returns a successful answer if cache write fails', async () => {
        const put = vi.fn(async (key: string, value: string) => {
            if (String(key).startsWith('ai:wai:')) {
                throw new Error('kv down');
            }
            // Rate-limit writes succeed
            void value;
        });
        const get = vi.fn().mockResolvedValue(null);
        vi.spyOn(workersAi, 'analyzeMarketContext').mockResolvedValue('ok answer');
        const env = {
            AI: { run: vi.fn() } as unknown as Ai,
            MARKETMIND_CACHE: { get, put, delete: vi.fn(), list: vi.fn() },
        } as unknown as Env;

        const res = await handleAiAnalyzeRequest(makeRequest(validBody), env, cors);
        expect(res.status).toBe(200);
        await expect(res.json()).resolves.toEqual({ answer: 'ok answer' });
    });

    it('serves a cache hit for identical effective inputs', async () => {
        const stored: Record<string, string> = {};
        const put = vi.fn(async (key: string, value: string) => {
            stored[key] = value;
        });
        const get = vi.fn(async (key: string, type?: string) => {
            const raw = stored[key];
            if (raw == null) return null;
            return type === 'json' ? JSON.parse(raw) : raw;
        });
        vi.spyOn(workersAi, 'analyzeMarketContext').mockResolvedValue('cached-or-fresh');
        const env = {
            AI: { run: vi.fn() } as unknown as Ai,
            MARKETMIND_CACHE: { get, put, delete: vi.fn(), list: vi.fn() },
        } as unknown as Env;

        const first = await handleAiAnalyzeRequest(makeRequest(validBody), env, cors);
        expect(first.headers.get('X-Cache-Status')).toBe('MISS');
        const second = await handleAiAnalyzeRequest(makeRequest(validBody), env, cors);
        expect(second.headers.get('X-Cache-Status')).toBe('HIT');
        expect(workersAi.analyzeMarketContext).toHaveBeenCalledTimes(1);
    });

    it('supports crypto and metal payloads', async () => {
        const spy = vi.spyOn(workersAi, 'analyzeMarketContext').mockResolvedValue('ok');
        const env = { AI: { run: vi.fn() } as unknown as Ai } as Env;

        for (const assetType of ['crypto', 'metal'] as const) {
            const res = await handleAiAnalyzeRequest(
                makeRequest({
                    ...validBody,
                    assetType,
                    symbol: assetType === 'crypto' ? 'BTC' : 'XAU',
                }),
                env,
                cors
            );
            expect(res.status).toBe(200);
        }
        expect(spy).toHaveBeenCalledTimes(2);
    });
});
