import type { Env, NewsResponse, AssetType, Timeframe } from '../core/types';
import { getCachedData, setCachedData } from '../core/cache';
import { getNews } from '../integrations/marketaux';

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

    try {
        // Try to get from cache first
        const cached = await getCachedData<NewsResponse>(cacheKey);
        if (cached) {
            return new Response(JSON.stringify(cached), {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Cache': 'HIT',
                    ...corsHeaders,
                },
            });
        }

        // Not in cache, fetch from Marketaux
        const newsData = await getNews(assetType, symbol, timeframe, env);

        // Cache for 30 minutes
        await setCachedData(cacheKey, newsData, 30 * 60);

        return new Response(JSON.stringify(newsData), {
            headers: {
                'Content-Type': 'application/json',
                'X-Cache': 'MISS',
                ...corsHeaders,
            },
        });
    } catch (error) {
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
