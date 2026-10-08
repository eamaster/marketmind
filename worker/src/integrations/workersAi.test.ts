import { describe, expect, it, vi } from 'vitest';
import {
    AiProviderError,
    analyzeMarketContext,
    extractWorkersAiErrorCode,
    normalizeWorkersAiResponse,
} from './workersAi';
import type { Env } from '../core/types';

const baseInput = {
    assetType: 'stock' as const,
    symbol: 'AAPL',
    timeframe: '7D' as const,
    chartData: [
        { timestamp: '2026-01-01T00:00:00.000Z', close: 100 },
        { timestamp: '2026-01-02T00:00:00.000Z', close: 110 },
    ],
    news: [
        {
            id: 'n1',
            title: 'Apple rises',
            url: 'https://example.com/a',
            snippet: 'up',
            publishedAt: '2026-01-02T12:00:00.000Z',
            source: 'TestWire',
            sentimentScore: 0.4,
        },
    ],
    question: 'What is the trend?',
};

describe('normalizeWorkersAiResponse', () => {
    it('extracts assistant content from a chat-completion envelope', () => {
        const text = normalizeWorkersAiResponse({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            choices: [
                {
                    index: 0,
                    finish_reason: 'stop',
                    message: { role: 'assistant', content: '  Trend is upward.  ' },
                },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        });
        expect(text).toBe('Trend is upward.');
    });

    it('rejects choices: [null], empty choices, and missing message', () => {
        expect(() => normalizeWorkersAiResponse({ choices: [null] })).toThrow(/choices\[0\]/);
        expect(() => normalizeWorkersAiResponse({ choices: [] })).toThrow(/no choices/);
        expect(() => normalizeWorkersAiResponse({ choices: [{ message: null }] })).toThrow(
            /missing message/
        );
        expect(() => normalizeWorkersAiResponse({ choices: [{}] })).toThrow(/missing message/);
    });

    it('rejects missing/empty/non-string assistant content', () => {
        expect(() =>
            normalizeWorkersAiResponse({ choices: [{ message: { content: '' } }] })
        ).toThrow(AiProviderError);
        expect(() =>
            normalizeWorkersAiResponse({ choices: [{ message: { content: 42 as unknown as string } }] })
        ).toThrow(AiProviderError);
    });

    it('rejects malformed envelopes (no Llama response / no Gemini candidates)', () => {
        expect(() => normalizeWorkersAiResponse({ response: 'llama style' })).toThrow(
            /missing choices/
        );
        expect(() =>
            normalizeWorkersAiResponse({
                candidates: [{ content: { parts: [{ text: 'gemini' }] } }],
            })
        ).toThrow(/missing choices/);
    });

    it('rejects tool-call-only and tool_calls finish reasons', () => {
        expect(() =>
            normalizeWorkersAiResponse({
                choices: [
                    {
                        finish_reason: 'tool_calls',
                        message: {
                            role: 'assistant',
                            content: null,
                            tool_calls: [{ id: 'call_1', type: 'function' }],
                        },
                    },
                ],
            })
        ).toThrow(/tool/);
    });

    it('rejects truncated output', () => {
        expect(() =>
            normalizeWorkersAiResponse({
                choices: [
                    {
                        finish_reason: 'length',
                        message: { role: 'assistant', content: 'Partial...' },
                    },
                ],
            })
        ).toThrow(/truncated/);
    });

    it('does not return reasoning fields as the analysis', () => {
        const text = normalizeWorkersAiResponse({
            choices: [
                {
                    finish_reason: 'stop',
                    message: {
                        role: 'assistant',
                        content: 'User-facing answer',
                        reasoning_content: 'secret chain of thought',
                        reasoning: 'more secret',
                    },
                },
            ],
        });
        expect(text).toBe('User-facing answer');
        expect(text).not.toContain('secret');
    });
});

describe('error classification', () => {
    it('extracts documented Workers AI codes', () => {
        expect(extractWorkersAiErrorCode({ code: 3036 })).toBe(3036);
        expect(extractWorkersAiErrorCode(new Error('Out of capacity 3040'))).toBe(3040);
        expect(extractWorkersAiErrorCode({ errors: [{ code: 3007 }] })).toBe(3007);
    });

    it('maps quota / capacity / throttle distinctly without raw leakage', async () => {
        const quotaRun = vi.fn().mockRejectedValue(new Error('Account limited 3036'));
        await expect(
            analyzeMarketContext(baseInput, 'prompt', { AI: { run: quotaRun } } as unknown as Env)
        ).rejects.toMatchObject({ category: 'quota', providerCode: 3036, statusHint: 429 });

        const capacityRun = vi.fn().mockRejectedValue(new Error('3040 Capacity temporarily exceeded'));
        await expect(
            analyzeMarketContext(baseInput, 'prompt', {
                AI: { run: capacityRun },
            } as unknown as Env)
        ).rejects.toMatchObject({ category: 'capacity', providerCode: 3040 });

        const throttleRun = vi.fn().mockRejectedValue(new Error('HTTP 429 Too Many Requests'));
        const throttleErr = await analyzeMarketContext(baseInput, 'prompt', {
            AI: { run: throttleRun },
        } as unknown as Env).catch(e => e);
        expect(throttleErr.category).toBe('throttle');
        expect(throttleErr.message).not.toMatch(/stack|at Object/);
    });
});

describe('analyzeMarketContext', () => {
    it('requires the AI binding and does not fall back to Gemini', async () => {
        await expect(
            analyzeMarketContext(baseInput, 'prompt', {} as Env)
        ).rejects.toThrow(/binding "AI" is missing/);
    });

    it('returns normalized assistant text from a mocked binding', async () => {
        const run = vi.fn().mockResolvedValue({
            choices: [
                {
                    finish_reason: 'stop',
                    message: { role: 'assistant', content: 'Based on supplied data, trend is up.' },
                },
            ],
            usage: { total_tokens: 42 },
        });
        const env = {
            AI: { run },
            AI_MODEL: '@cf/zai-org/glm-4.7-flash',
        } as unknown as Env;

        const answer = await analyzeMarketContext(baseInput, 'user prompt body', env);
        expect(answer).toBe('Based on supplied data, trend is up.');
        expect(run).toHaveBeenCalledTimes(1);
        const [, inputs] = run.mock.calls[0];
        expect(inputs.messages).toHaveLength(2);
        expect(inputs.messages[0].role).toBe('system');
        expect(inputs.messages[1].content).toBe('user prompt body');
        expect(inputs.max_completion_tokens).toBe(2048);
        expect(inputs.chat_template_kwargs.enable_thinking).toBe(false);
    });
});
