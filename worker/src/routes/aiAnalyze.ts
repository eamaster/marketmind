import type { Env, AiAnalyzeResponse } from '../core/types';
import { ANALYST_SYSTEM_PROMPT, buildPrompt } from '../core/promptBuilder';
import { analyzeMarketContext, AiProviderError } from '../integrations/workersAi';
import { AiConfigError, resolveAiConfig, type ResolvedAiConfig } from '../core/aiConfig';
import { AiRequestValidationError, validateAiAnalyzeRequest } from '../core/requestValidation';
import { KVCache } from '../core/cache';

const AI_CACHE_TTL_SECONDS = 1800; // 30 minutes

async function checkRateLimit(
    clientId: string,
    env: Env
): Promise<{ allowed: boolean; remaining: number }> {
    if (!env.MARKETMIND_CACHE) {
        return { allowed: true, remaining: 999 };
    }

    try {
        const cache = new KVCache(env.MARKETMIND_CACHE);
        const rateLimitKey = `ratelimit:ai:${clientId}`;
        const LIMIT = 10;
        const WINDOW = 3600;

        const cached = await cache.get<{ count: number; resetAt: number }>(rateLimitKey);

        if (!cached || cached.isStale) {
            await cache.set(rateLimitKey, { count: 1, resetAt: Date.now() + WINDOW * 1000 }, WINDOW);
            return { allowed: true, remaining: LIMIT - 1 };
        }

        const { count } = cached.data;
        if (count >= LIMIT) {
            return { allowed: false, remaining: 0 };
        }

        await cache.set(rateLimitKey, { count: count + 1, resetAt: cached.data.resetAt }, WINDOW);
        return { allowed: true, remaining: LIMIT - count - 1 };
    } catch {
        console.error('[AI] rate-limit KV failure');
        throw new AiProviderError(
            'Unable to enforce AI rate limits right now. Please try again shortly.',
            'provider',
            503
        );
    }
}

export async function sha256Hex(value: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Deterministic fingerprint of the effective model input + generation settings.
 * Hashes system/user content so unbounded text is never placed in the KV key.
 */
export async function buildInferenceInputHash(
    config: ResolvedAiConfig,
    systemPrompt: string,
    userPrompt: string
): Promise<string> {
    const material = JSON.stringify({
        model: config.model,
        promptVersion: config.promptVersion,
        maxCompletionTokens: config.maxCompletionTokens,
        temperature: config.temperature,
        enableThinking: config.enableThinking,
        system: systemPrompt,
        user: userPrompt,
    });
    return sha256Hex(material);
}

export function buildAiCacheKey(parts: {
    cacheNamespace: string;
    inputHash: string;
    hourBucket: number;
}): string {
    return [parts.cacheNamespace, parts.inputHash, String(parts.hourBucket)].join(':');
}

function jsonError(
    body: Record<string, unknown>,
    status: number,
    corsHeaders: Record<string, string>,
    extraHeaders: Record<string, string> = {}
): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...extraHeaders,
            ...corsHeaders,
        },
    });
}

async function parseJsonBody(request: Request): Promise<unknown> {
    try {
        return await request.json();
    } catch {
        throw new AiRequestValidationError('Request body must be valid JSON');
    }
}

export async function handleAiAnalyzeRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    if (request.method !== 'POST') {
        return jsonError({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    let remaining = 999;
    try {
        const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
        const rate = await checkRateLimit(clientIp, env);
        remaining = rate.remaining;

        const rateHeaders = {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': remaining.toString(),
        };

        if (!rate.allowed) {
            return jsonError(
                {
                    error: 'Rate limit exceeded',
                    message:
                        'You have reached the maximum number of AI requests (10 per hour). Please try again later.',
                    retryAfter: 3600,
                    category: 'throttle',
                },
                429,
                corsHeaders,
                {
                    ...rateHeaders,
                    'X-RateLimit-Remaining': '0',
                    'Retry-After': '3600',
                }
            );
        }

        let config: ResolvedAiConfig;
        try {
            config = resolveAiConfig(env);
        } catch (error) {
            const message =
                error instanceof AiConfigError ? error.message : 'Invalid AI configuration';
            return jsonError(
                { error: 'AI configuration error', message, category: 'config' },
                500,
                corsHeaders,
                rateHeaders
            );
        }

        const rawBody = await parseJsonBody(request);
        const { assetType, symbol, timeframe, chartData, news, question } =
            validateAiAnalyzeRequest(rawBody);

        // Build the user prompt once; reuse for cache identity and inference.
        const userPrompt = buildPrompt({
            assetType,
            symbol,
            timeframe,
            chartData,
            news,
            question,
        });
        const systemPrompt = ANALYST_SYSTEM_PROMPT;

        const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
        const inputHash = await buildInferenceInputHash(config, systemPrompt, userPrompt);
        const hourBucket = Math.floor(Date.now() / (AI_CACHE_TTL_SECONDS * 1000));
        const cacheKey = buildAiCacheKey({
            cacheNamespace: config.cacheNamespace,
            inputHash,
            hourBucket,
        });

        if (cache) {
            try {
                const cached = await cache.get<string>(cacheKey);
                if (cached && !cached.isStale && typeof cached.data === 'string' && cached.data.trim()) {
                    console.log('[AI] cache=HIT');
                    return new Response(JSON.stringify({ answer: cached.data }), {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Cache-Status': 'HIT',
                            ...rateHeaders,
                            ...corsHeaders,
                        },
                    });
                }
            } catch {
                console.error('[AI] cache read failure; continuing with inference');
            }
        }

        console.log('[AI] cache=MISS model=' + config.model);
        const answer = await analyzeMarketContext(
            { assetType, symbol, timeframe, chartData, news, question },
            userPrompt,
            env
        );

        if (cache && answer.trim()) {
            try {
                await cache.set(cacheKey, answer, AI_CACHE_TTL_SECONDS);
                console.log('[AI] cached TTL=1800s');
            } catch {
                // Successful inference must still be returned if answer caching fails.
                console.error('[AI] cache write failure; returning uncached answer');
            }
        }

        const response: AiAnalyzeResponse = { answer };
        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                'X-Cache-Status': 'MISS',
                ...rateHeaders,
                ...corsHeaders,
            },
        });
    } catch (error) {
        const rateHeaders = {
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': remaining.toString(),
        };

        if (error instanceof AiRequestValidationError) {
            return jsonError(
                { error: 'Invalid request', message: error.message },
                400,
                corsHeaders,
                rateHeaders
            );
        }

        if (error instanceof AiProviderError) {
            console.error(`[AI] error category=${error.category}`);
            return jsonError(
                {
                    error: 'Failed to analyze market data',
                    message: error.message,
                    category: error.category,
                    ...(error.providerCode != null ? { providerCode: error.providerCode } : {}),
                },
                error.statusHint,
                corsHeaders,
                rateHeaders
            );
        }

        if (error instanceof AiConfigError) {
            return jsonError(
                { error: 'AI configuration error', message: error.message, category: 'config' },
                500,
                corsHeaders,
                rateHeaders
            );
        }

        console.error('[AI] unexpected error');
        return jsonError(
            {
                error: 'Failed to analyze market data',
                message: 'An unexpected error occurred while analyzing market data.',
                category: 'provider',
            },
            500,
            corsHeaders,
            rateHeaders
        );
    }
}
