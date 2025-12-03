import type { Env, NewsResponse, AssetType, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';
import { getNews } from '../integrations/marketaux';

const NEWS_TTL = 30 * 60; // 30 minutes

export async function handleNewsRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const assetType = (url.searchParams.get('assetType') || 'stock') as AssetType;
    const symbol = url.searchParams.get('symbol') || undefined;
    const timeframe = (url.searchParams.get('timeframe') || '1D') as Timeframe;

    // Build cache key
    const cacheKey = `news:${assetType}:${symbol || 'general'}:${timeframe}`;

    // Initialize KV cache if available
    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;

    try {
        // 1. Check KV cache first (fresh data)
        if (cache) {
            const cached = await cache.get<NewsResponse>(cacheKey);
            if (cached && !cached.isStale) {
                return new Response(JSON.stringify(cached.data), {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Cache': 'HIT',
                        ...corsHeaders,
                    },
                });
            }
        }

        // 2. Not in cache, fetch from Marketaux
        const newsData = await getNews(assetType, symbol, timeframe, env);

        // Store in cache
        if (cache) {
            await cache.set(cacheKey, newsData, NEWS_TTL);
        }

        return new Response(JSON.stringify(newsData), {
            headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'MISS',
                ...corsHeaders,
            },
        });
    } catch (error) {
        // 3. Try stale cache on error
        if (cache) {
            const staleData = await cache.getStale<NewsResponse>(cacheKey);
            if (staleData) {
                return new Response(JSON.stringify(staleData), {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Cache': 'STALE',
                        ...corsHeaders,
                    },
                });
            }
        }

        // 4. No cache available, return error
        return new Response(
            JSON.stringify({
                error: 'Failed to fetch news data',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }
}
