// worker/src/integrations/goldApi.ts
// Real Gold-API.com integration (NOT Massive.com)
import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

// Gold-API.com: 10 history API requests/hour FREE
// Docs: https://www.gold-api.com/docs
// Strategy: 1 hour cache + sample dates to conserve quota

const GOLDAPI_CACHE_TTL = 3600; // 1 HOUR (critical for staying within 10 requests/hour)

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

    // Check cache FIRST (critical to conserve 10 requests/hour)
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
        // Fallback to stale cache
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
    const { startDate, endDate, totalDays } = getDateRange(timeframe);

    console.log(`[Gold-API] Fetching ${symbol} from ${startDate} to ${endDate} (${totalDays} days)`);

    // Strategy: Sample dates intelligently to stay within 10 requests/hour
    // With 1-hour cache, we can use up to 8 API calls per chart load
    const dates = sampleDates(startDate, endDate, totalDays, 8);
    const candles: PricePoint[] = [];

    console.log(`[Gold-API] Sampling ${dates.length} dates to conserve quota`);

    for (const date of dates) {
        try {
            // Gold-API format: GET https://api.gold-api.com/history/{api_key}/{symbol}/{date}
            // Date format: YYYYMMDD
            const formattedDate = date.replace(/-/g, ''); // "2025-12-05" → "20251205"
            const url = `https://api.gold-api.com/history/${apiKey}/${symbol}/${formattedDate}`;

            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`[Gold-API] Failed for ${symbol} on ${date}: ${response.status}`);
                continue;
            }

            const data = await response.json() as {
                timestamp?: number;
                metal: string;
                currency: string;
                price: number; // USD per troy ounce
            };

            if (!data.price || data.price === 0) {
                console.warn(`[Gold-API] No price for ${symbol} on ${date}`);
                continue;
            }

            const pricePerOz = data.price;

            candles.push({
                timestamp: new Date(`${date}T00:00:00Z`).toISOString(),
                open: pricePerOz,
                high: pricePerOz,
                low: pricePerOz,
                close: pricePerOz,
                volume: 0,
            });

            console.log(`[Gold-API] ${symbol} ${date}: $${pricePerOz.toFixed(2)}`);

            // Rate limit protection: 500ms delay between calls
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`[Gold-API] Error fetching ${symbol} on ${date}:`, error);
        }
    }

    if (candles.length === 0) {
        throw new Error(`No candles returned for ${symbol}`);
    }

    // Log data freshness
    const lastCandle = candles[candles.length - 1];
    const daysSinceLastCandle = Math.floor(
        (Date.now() - new Date(lastCandle.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`[Gold-API] ${symbol}: ${candles.length} candles, freshness: ${daysSinceLastCandle} days old`);
    console.log(`[Gold-API] Latest price: $${lastCandle.close.toFixed(2)}`);

    return candles;
}

function getDateRange(timeframe: Timeframe): { startDate: string; endDate: string; totalDays: number } {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    let daysBack = 7;
    switch (timeframe) {
        case '1D': daysBack = 10; break;   // 7 trading days
        case '1W': daysBack = 30; break;   // 1 month
        case '1M': daysBack = 90; break;   // 3 months
        case '3M': daysBack = 180; break;  // 6 months
        case '1Y': daysBack = 365; break;  // 1 year
    }

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack);

    return {
        startDate: formatDate(startDate),
        endDate: formatDate(today),
        totalDays: daysBack,
    };
}

function sampleDates(start: string, end: string, totalDays: number, maxSamples: number): string[] {
    // Sample dates evenly across the range
    const interval = Math.ceil(totalDays / maxSamples);
    const dates: string[] = [];
    const current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + interval);
    }

    // Always include the most recent date
    const endDateStr = end;
    if (dates[dates.length - 1] !== endDateStr) {
        dates.push(endDateStr);
    }

    return dates.slice(0, maxSamples); // Cap at maxSamples
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
