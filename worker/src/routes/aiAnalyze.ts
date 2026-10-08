import type { Env, AiAnalyzeRequest, AiAnalyzeResponse, PricePoint, NewsArticle } from '../core/types';
import { buildPrompt } from '../core/promptBuilder';
import { analyzeMarketContext, AiProviderError } from '../integrations/workersAi';
import { AiConfigError, resolveAiConfig } from '../core/aiConfig';
import { KVCache } from '../core/cache';

// Rate limiting: 10 requests per hour per IP
async function checkRateLimit(clientId: string, env: Env): Promise<{ allowed: boolean; remaining: number }> {
    if (!env.MARKETMIND_CACHE) {
        return { allowed: true, remaining: 999 }; // No KV = no limiting (dev mode)
    }

    const cache = new KVCache(env.MARKETMIND_CACHE);
    const rateLimitKey = `ratelimit:ai:${clientId}`;

    const LIMIT = 10;
    const WINDOW = 3600; // 1 hour in seconds

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
}

async function sha256Hex(value: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(value);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Hash question text for cache keys (never put raw unbounded user text in the key). */
export async function hashQuestion(question: string): Promise<string> {
    return sha256Hex(question.toLowerCase().trim());
}

/**
 * Compact fingerprint of market context so materially different payloads miss cache
 * without embedding unbounded chart/news text in the key.
 */
export async function hashMarketContext(
    chartData: PricePoint[],
    news: NewsArticle[]
): Promise<string> {
    const last = chartData.length > 0 ? chartData[chartData.length - 1] : null;
    const first = chartData.length > 0 ? chartData[0] : null;
    const newsIds = news
        .slice(0, 5)
        .map(a => a.id || a.url || a.title)
        .join('|');
    const material = [
        String(chartData.length),
        first?.timestamp ?? '',
        last?.timestamp ?? '',
        last?.close != null ? String(last.close) : '',
        String(news.length),
        newsIds,
    ].join('::');
    const hex = await sha256Hex(material);
    return hex.slice(0, 16);
}

export function buildAiCacheKey(parts: {
    cacheNamespace: string;
    model: string;
    promptVersion: string;
    assetType: string;
    symbol?: string;
    timeframe: string;
    hourBucket: number;
    questionHash: string;
    contextHash: string;
}): string {
    return [
        parts.cacheNamespace,
        parts.model,
        parts.promptVersion,
        parts.assetType,
        parts.symbol ?? '',
        parts.timeframe,
        String(parts.hourBucket),
        parts.questionHash,
        parts.contextHash,
    ].join(':');
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

export async function handleAiAnalyzeRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    if (request.method !== 'POST') {
        return jsonError({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { allowed, remaining } = await checkRateLimit(clientIp, env);

    const rateHeaders = {
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': remaining.toString(),
    };

    if (!allowed) {
        return jsonError(
            {
                error: 'Rate limit exceeded',
                message:
                    'You have reached the maximum number of AI requests (10 per hour). Please try again later.',
                retryAfter: 3600,
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

    try {
        let config;
        try {
            config = resolveAiConfig(env);
        } catch (error) {
            const message =
                error instanceof AiConfigError
                    ? error.message
                    : 'Invalid AI configuration';
            return jsonError(
                { error: 'AI configuration error', message },
                500,
                corsHeaders,
                rateHeaders
            );
        }

        const body: AiAnalyzeRequest = await request.json();
        const { assetType, symbol, timeframe, chartData, news, question } = body;

        if (!assetType || !timeframe || !chartData || !news || !question) {
            return jsonError(
                { error: 'Missing required fields' },
                400,
                corsHeaders,
                rateHeaders
            );
        }

        if (typeof question !== 'string' || !question.trim()) {
            return jsonError(
                { error: 'Missing required fields', message: 'question must be a non-empty string' },
                400,
                corsHeaders,
                rateHeaders
            );
        }

        if (!Array.isArray(chartData) || !Array.isArray(news)) {
            return jsonError(
                {
                    error: 'Missing required fields',
                    message: 'chartData and news must be arrays',
                },
                400,
                corsHeaders,
                rateHeaders
            );
        }

        const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
        const questionHash = await hashQuestion(question);
        const contextHash = await hashMarketContext(chartData, news);
        const hourBucket = Math.floor(Date.now() / (1800 * 1000)); // 30-min buckets
        const cacheKey = buildAiCacheKey({
            cacheNamespace: config.cacheNamespace,
            model: config.model,
            promptVersion: config.promptVersion,
            assetType,
            symbol,
            timeframe,
            hourBucket,
            questionHash,
            contextHash,
        });
        const CACHE_TTL = 1800; // 30 minutes

        if (cache) {
            const cached = await cache.get<string>(cacheKey);
            if (cached && !cached.isStale) {
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
        }

        const prompt = buildPrompt({
            assetType,
            symbol,
            timeframe,
            chartData,
            news,
            question,
        });

        console.log('[AI] cache=MISS model=' + config.model);
        const answer = await analyzeMarketContext(
            { assetType, symbol, timeframe, chartData, news, question },
            prompt,
            env
        );

        // Only cache successful, non-empty analyst text (never failures/mocks).
        if (cache && answer.trim()) {
            await cache.set(cacheKey, answer, CACHE_TTL);
            console.log('[AI] cached TTL=1800s');
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
        console.error('[AI] error category=', error instanceof AiProviderError ? error.category : 'unknown');

        if (error instanceof AiProviderError) {
            return jsonError(
                {
                    error: 'Failed to analyze market data',
                    message: error.message,
                    category: error.category,
                },
                error.statusHint,
                corsHeaders,
                rateHeaders
            );
        }

        if (error instanceof AiConfigError) {
            return jsonError(
                { error: 'AI configuration error', message: error.message },
                500,
                corsHeaders,
                rateHeaders
            );
        }

        return jsonError(
            {
                error: 'Failed to analyze market data',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            500,
            corsHeaders,
            rateHeaders
        );
    }
}
