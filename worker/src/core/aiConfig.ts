import type { Env } from './types';

/**
 * Single authoritative defaults for Workers AI market analysis.
 * Optional env vars (wrangler [vars]) may override these after validation.
 */
export const AI_CONFIG_DEFAULTS = {
    model: '@cf/zai-org/glm-4.7-flash',
    maxCompletionTokens: 2048,
    temperature: 0.7,
    /** Bump when prompt/system instructions change in a way that must invalidate KV answers. */
    promptVersion: 'wai-v1',
    /** AI response cache namespace; change invalidates Gemini-era `ai:` keys. */
    cacheNamespace: 'ai:wai:v1',
} as const;

const MIN_MAX_COMPLETION_TOKENS = 64;
const MAX_MAX_COMPLETION_TOKENS = 8192;
const MIN_TEMPERATURE = 0;
const MAX_TEMPERATURE = 2;

export interface ResolvedAiConfig {
    model: string;
    maxCompletionTokens: number;
    temperature: number;
    promptVersion: string;
    cacheNamespace: string;
}

export class AiConfigError extends Error {
    readonly category = 'config' as const;

    constructor(message: string) {
        super(message);
        this.name = 'AiConfigError';
    }
}

function parseOptionalInt(raw: string | undefined, label: string): number | undefined {
    if (raw === undefined || raw === '') return undefined;
    const value = Number(raw);
    if (!Number.isInteger(value)) {
        throw new AiConfigError(`${label} must be an integer (got "${raw}")`);
    }
    return value;
}

function parseOptionalFloat(raw: string | undefined, label: string): number | undefined {
    if (raw === undefined || raw === '') return undefined;
    const value = Number(raw);
    if (!Number.isFinite(value)) {
        throw new AiConfigError(`${label} must be a finite number (got "${raw}")`);
    }
    return value;
}

/**
 * Resolve and validate AI settings from env vars + defaults.
 */
export function resolveAiConfig(env: Env): ResolvedAiConfig {
    const model = (env.AI_MODEL?.trim() || AI_CONFIG_DEFAULTS.model).trim();
    if (!model.startsWith('@cf/')) {
        throw new AiConfigError(
            `AI_MODEL must be a Workers AI model id starting with "@cf/" (got "${model}")`
        );
    }

    const maxCompletionTokens =
        parseOptionalInt(env.AI_MAX_COMPLETION_TOKENS, 'AI_MAX_COMPLETION_TOKENS') ??
        AI_CONFIG_DEFAULTS.maxCompletionTokens;

    if (
        maxCompletionTokens < MIN_MAX_COMPLETION_TOKENS ||
        maxCompletionTokens > MAX_MAX_COMPLETION_TOKENS
    ) {
        throw new AiConfigError(
            `AI_MAX_COMPLETION_TOKENS must be between ${MIN_MAX_COMPLETION_TOKENS} and ${MAX_MAX_COMPLETION_TOKENS}`
        );
    }

    const temperature =
        parseOptionalFloat(env.AI_TEMPERATURE, 'AI_TEMPERATURE') ??
        AI_CONFIG_DEFAULTS.temperature;

    if (temperature < MIN_TEMPERATURE || temperature > MAX_TEMPERATURE) {
        throw new AiConfigError(
            `AI_TEMPERATURE must be between ${MIN_TEMPERATURE} and ${MAX_TEMPERATURE}`
        );
    }

    return {
        model,
        maxCompletionTokens,
        temperature,
        promptVersion: AI_CONFIG_DEFAULTS.promptVersion,
        cacheNamespace: AI_CONFIG_DEFAULTS.cacheNamespace,
    };
}

/**
 * Require the native Workers AI binding.
 */
export function requireAiBinding(env: Env): Ai {
    if (!env.AI) {
        throw new AiConfigError(
            'Workers AI binding "AI" is missing. Add `[ai] binding = "AI"` to wrangler.toml and restart the Worker.'
        );
    }
    return env.AI;
}
