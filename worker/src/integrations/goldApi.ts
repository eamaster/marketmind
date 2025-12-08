// worker/src/integrations/goldApi.ts
// Gold-API.com integration with CORRECT endpoint format
import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

const GOLDAPI_CACHE_TTL = 3600; // 1 hour

export async function getGoldPrice(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.GOLD_API_KEY;

    if (!apiKey) {
        throw new Error('GOLD_API_KEY not configured');
    }

    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `goldapi:${symbol}:${timeframe}`;

    // Check cache first
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[Gold-API] Cache hit for ${symbol} ${timeframe}`);
            return cached.data;
        }
    }

    try {
        const data = await fetchGoldApiHistory(symbol, timeframe, apiKey);

        if (cache) {
            await cache.set(cacheKey, data, GOLDAPI_CACHE_TTL);
        }

        console.log(`[Gold-API] Success for ${symbol} ${timeframe} - ${data.length} candles`);
        return data;
    } catch (error) {
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[Gold-API] Using stale cache for ${symbol} ${timeframe}`);
                return staleData;
            }
        }
        throw error;
    }
}

async function fetchGoldApiHistory(
    symbol: string,
    timeframe: Timeframe,
    apiKey: string
): Promise<PricePoint[]> {
    const { startTimestamp, endTimestamp, daysBack } = getDateRange(timeframe);

    console.log(`[Gold-API] Fetching ${symbol} from ${new Date(startTimestamp * 1000).toISOString()} to ${new Date(endTimestamp * 1000).toISOString()} (${daysBack} days)`);

    // Build URL with query parameters - CORRECT FORMAT
    const url = new URL('https://api.gold-api.com/history');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('startTimestamp', startTimestamp.toString());
    url.searchParams.set('endTimestamp', endTimestamp.toString());
    url.searchParams.set('groupBy', 'day'); // Daily aggregation
    url.searchParams.set('aggregation', 'avg'); // Average price
    url.searchParams.set('orderBy', 'asc'); // Oldest first

    console.log(`[Gold-API] Request: ${url.toString()}`);

    try {
        const response = await fetch(url.toString(), {
            headers: {
                'x-api-key': apiKey, // CORRECT: API key in header
            },
        });

        console.log(`[Gold-API] HTTP ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Gold-API] Error response:`, errorText);
            throw new Error(`Gold-API HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json() as Array<{
            day?: string;
            avg_price?: number;
            max_price?: number;
            min_price?: number;
        }>;

        console.log(`[Gold-API] Received ${data.length} data points`);

        if (!data || data.length === 0) {
            throw new Error(`No data returned from Gold-API for ${symbol}`);
        }

        // Convert to PricePoint format
        const candles: PricePoint[] = data.map(point => {
            const price = Number(point.avg_price || point.max_price || point.min_price || 0);

            // Gold API returns day as "2025-11-06 00:00:00" - extract date part only
            const dateOnly = point.day ? point.day.split(' ')[0] : new Date().toISOString().split('T')[0];
            const timestamp = `${dateOnly}T00:00:00Z`;

            return {
                timestamp,
                open: price,
                high: price,
                low: price,
                close: price,
                // Note: Gold-API.com doesn't provide trading volume data for precious metals
                // Volume is set to 0 as spot prices are OTC traded without centralized volume reporting
                volume: 0,
            };
        });

        console.log(`[Gold-API] Converted to ${candles.length} candles`);
        if (candles.length > 0) {
            console.log(`[Gold-API] First: ${candles[0].timestamp} = $${candles[0].close.toFixed(2)}`);
            console.log(`[Gold-API] Last: ${candles[candles.length - 1].timestamp} = $${candles[candles.length - 1].close.toFixed(2)}`);
        }

        return candles;
    } catch (error) {
        console.error(`[Gold-API] Fetch error:`, error);
        throw error;
    }
}

function getDateRange(timeframe: Timeframe): { startTimestamp: number; endTimestamp: number; daysBack: number } {
    const now = new Date();
    const endTimestamp = Math.floor(now.getTime() / 1000); // Current time in Unix timestamp

    let daysBack = 7;
    switch (timeframe) {
        case '1D': daysBack = 7; break;
        case '1W': daysBack = 30; break;
        case '1M': daysBack = 90; break;
        case '3M': daysBack = 180; break;
        case '1Y': daysBack = 365; break;
    }

    const startDate = new Date(now);
    startDate.setDate(now.getDate() - daysBack);
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    return {
        startTimestamp,
        endTimestamp,
        daysBack,
    };
}

export async function getGoldQuote(
    symbol: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    try {
        const data = await getGoldPrice(symbol, '1D', env);

        if (data.length < 2) {
            throw new Error('Insufficient data for quote calculation');
        }

        const latestCandle = data[data.length - 1];
        const previousCandle = data[data.length - 2];

        const price = latestCandle.close;
        const change = price - previousCandle.close;
        const changePercent = (change / previousCandle.close) * 100;

        return {
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
        };
    } catch (error) {
        console.error(`[Gold-API] Failed to get quote for ${symbol}:`, error);
        return { price: 0, change: 0, changePercent: 0 };
    }
}
