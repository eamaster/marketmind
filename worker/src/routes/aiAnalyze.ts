import type { Env, AiAnalyzeRequest, AiAnalyzeResponse } from '../core/types';
import { buildPrompt } from '../core/promptBuilder';
import { analyzeMarketContext } from '../integrations/gemini';
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
        // First request or expired window
        await cache.set(rateLimitKey, { count: 1, resetAt: Date.now() + WINDOW * 1000 }, WINDOW);
        return { allowed: true, remaining: LIMIT - 1 };
    }

    const { count } = cached.data;

    if (count >= LIMIT) {
        return { allowed: false, remaining: 0 };
    }

    // Increment count
    await cache.set(rateLimitKey, { count: count + 1, resetAt: cached.data.resetAt }, WINDOW);
    return { allowed: true, remaining: LIMIT - count - 1 };
}

// Hash a question for caching
async function hashQuestion(question: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(question.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function handleAiAnalyzeRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    // Rate limiting check
    const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    const { allowed, remaining } = await checkRateLimit(clientIp, env);

    if (!allowed) {
        return new Response(
            JSON.stringify({
                error: 'Rate limit exceeded',
                message: 'You have reached the maximum number of AI requests (10 per hour). Please try again later.',
                retryAfter: 3600,
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Limit': '10',
                    'X-RateLimit-Remaining': '0',
                    'Retry-After': '3600',
                    ...corsHeaders,
                },
            }
        );
    }

    try {
        const body: AiAnalyzeRequest = await request.json();
        const { assetType, symbol, timeframe, chartData, news, question } = body;

        // Validate required fields
        if (!assetType || !timeframe || !chartData || !news || !question) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
            );
        }

        // Try cache for common questions
        const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
        const questionHash = await hashQuestion(question);

        // Add time bucket to prevent stale cached responses
        const hourBucket = Math.floor(Date.now() / (1800 * 1000)); // 30-min buckets
        const cacheKey = `ai:${assetType}:${symbol}:${timeframe}:${hourBucket}:${questionHash}`;
        const CACHE_TTL = 1800; // 30 minutes

        if (cache) {
            const cached = await cache.get<string>(cacheKey);
            if (cached && !cached.isStale) {
                console.log('[AI] ✅ Cache HIT for question:', question.substring(0, 50));
                return new Response(JSON.stringify({ answer: cached.data }), {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Cache-Status': 'HIT',
                        'X-RateLimit-Limit': '10',
                        'X-RateLimit-Remaining': remaining.toString(),
                        ...corsHeaders,
                    },
                });
            }
        }

        // Build structured prompt
        const prompt = buildPrompt({
            assetType,
            symbol,
            timeframe,
            chartData,
            news,
            question,
        });

        // Call Gemini API
        console.log('[AI] 🌐 API call for question:', question.substring(0, 50));
        const answer = await analyzeMarketContext(
            { assetType, symbol, timeframe, chartData, news, question },
            prompt,
            env
        );

        // Cache the response
        if (cache) {
            await cache.set(cacheKey, answer, CACHE_TTL);
            console.log('[AI] 💾 Cached response for 30 minutes');
        }

        const response: AiAnalyzeResponse = { answer };

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                'X-Cache-Status': 'MISS',
                'X-RateLimit-Limit': '10',
                'X-RateLimit-Remaining': remaining.toString(),
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error('[AI] ❌ Error:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to analyze market data',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Limit': '10',
                    'X-RateLimit-Remaining': remaining.toString(),
                    ...corsHeaders,
                },
            }
        );
    }
}
