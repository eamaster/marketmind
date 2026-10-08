import { describe, expect, it } from 'vitest';
import {
    AI_CONFIG_DEFAULTS,
    AiConfigError,
    requireAiBinding,
    resolveAiConfig,
    SUPPORTED_AI_MODELS,
} from './aiConfig';
import type { Env } from './types';

function env(partial: Partial<Env> = {}): Env {
    return partial;
}

describe('resolveAiConfig', () => {
    it('uses documented defaults when overrides are absent', () => {
        const config = resolveAiConfig(env());
        expect(config.model).toBe(AI_CONFIG_DEFAULTS.model);
        expect(config.maxCompletionTokens).toBe(AI_CONFIG_DEFAULTS.maxCompletionTokens);
        expect(config.temperature).toBe(AI_CONFIG_DEFAULTS.temperature);
        expect(config.promptVersion).toBe(AI_CONFIG_DEFAULTS.promptVersion);
        expect(config.cacheNamespace).toBe(AI_CONFIG_DEFAULTS.cacheNamespace);
        expect(config.enableThinking).toBe(false);
    });

    it('accepts the verified GLM model override', () => {
        const config = resolveAiConfig(
            env({
                AI_MODEL: '@cf/zai-org/glm-4.7-flash',
                AI_MAX_COMPLETION_TOKENS: '1024',
                AI_TEMPERATURE: '0.2',
            })
        );
        expect(config.model).toBe('@cf/zai-org/glm-4.7-flash');
        expect(config.maxCompletionTokens).toBe(1024);
        expect(config.temperature).toBe(0.2);
    });

    it('rejects unsupported Workers AI models even with @cf/ prefix', () => {
        expect(() => resolveAiConfig(env({ AI_MODEL: '@cf/meta/llama-3.3-70b-instruct' }))).toThrow(
            AiConfigError
        );
        expect(() => resolveAiConfig(env({ AI_MODEL: 'gemini-3-pro-preview' }))).toThrow(
            AiConfigError
        );
        expect(SUPPORTED_AI_MODELS).toEqual(['@cf/zai-org/glm-4.7-flash']);
    });

    it('rejects out-of-range numeric settings', () => {
        expect(() =>
            resolveAiConfig(env({ AI_MAX_COMPLETION_TOKENS: '10' }))
        ).toThrow(AiConfigError);
        expect(() => resolveAiConfig(env({ AI_TEMPERATURE: '3' }))).toThrow(AiConfigError);
    });
});

describe('requireAiBinding', () => {
    it('throws when AI binding is missing', () => {
        expect(() => requireAiBinding(env())).toThrow(/binding "AI" is missing/);
    });

    it('returns the binding when present', () => {
        const fakeAi = { run: async () => ({}) } as unknown as Ai;
        expect(requireAiBinding(env({ AI: fakeAi }))).toBe(fakeAi);
    });
});
