import { describe, expect, it, vi } from 'vitest';
import {
    AiProviderError,
    analyzeMarketContext,
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

    it('rejects missing/empty assistant content', () => {
        expect(() =>
            normalizeWorkersAiResponse({ choices: [{ message: { content: '' } }] })
        ).toThrow(AiProviderError);
        expect(() => normalizeWorkersAiResponse({ choices: [{}] })).toThrow(AiProviderError);
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

    it('rejects tool-call-only output', () => {
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
        ).toThrow(/tool calls/);
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

    it('does not return reasoning_content as the analysis', () => {
        const text = normalizeWorkersAiResponse({
            choices: [
                {
                    finish_reason: 'stop',
                    message: {
                        role: 'assistant',
                        content: 'User-facing answer',
                        reasoning_content: 'secret chain of thought',
                    },
                },
            ],
        });
        expect(text).toBe('User-facing answer');
        expect(text).not.toContain('secret chain');
    });
});

describe('analyzeMarketContext', () => {
    it('requires the AI binding and does not fall back to Gemini', async () => {
        await expect(
            analyzeMarketContext(baseInput, 'prompt', {} as Env)
        ).rejects.toThrow(/binding "AI" is missing/);
    });

    it('maps quota failures without inventing analysis text', async () => {
        const run = vi.fn().mockRejectedValue(new Error('error code 3036 daily free allocation'));
        const env = { AI: { run } } as unknown as Env;

        await expect(analyzeMarketContext(baseInput, 'prompt', env)).rejects.toMatchObject({
            category: 'quota',
            statusHint: 429,
        });
        expect(run).toHaveBeenCalledTimes(1);
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
