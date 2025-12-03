import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

// Massive.com (formerly Polygon.io) client for stock candles with KV caching
// Docs: https://massive.com/docs/rest/quickstart
// Rate limit: 5 calls/minute (free tier), unlimited daily calls

const CANDLES_TTL = 60; // 60 seconds cache
const RATE_LIMIT_DELAY = 12000; // 12 seconds between calls (5 calls/minute)
let lastApiCallTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;

    if (timeSinceLastCall < RATE_LIMIT_DELAY) {
        const waitTime = RATE_LIMIT_DELAY - timeSinceLastCall;
        console.log(`[Massive] Rate limit protection: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastApiCallTime = Date.now();
    return fetch(url);
}

export async function getMassiveCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.MASSIVE_API_KEY;

    if (!apiKey) {
        throw new Error('MASSIVE_API_KEY not configured');
    }

    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `massive:candles:${symbol}:${timeframe}`;

    // 1. Check KV cache first (fresh data)
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[Massive] Cache hit (fresh) for ${symbol} ${timeframe}`);
            return cached.data;
        }
    }

    // 2. Call Massive API
    try {
        const data = await fetchMassiveCandles(symbol, timeframe, apiKey);

        if (cache) {
            await cache.set(cacheKey, data, CANDLES_TTL);
        }

        console.log(`[Massive] API success for ${symbol} ${timeframe} - ${data.length} candles`);
        return data;
    } catch (error) {
        // 3. Stale cache fallback
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[Massive] Using stale cache for ${symbol} ${timeframe}`);
                return staleData;
            }
        }
        throw error;
    }
}

async function fetchMassiveCandles(
    symbol: string,
    timeframe: Timeframe,
    apiKey: string
): Promise<PricePoint[]> {
    const { from, to } = getTimeframeParams(timeframe);

    // Massive API: /v2/aggs/ticker/{stocksTicker}/range/{multiplier}/{timespan}/{from}/{to}
    // Using api.polygon.io (still fully supported) for backward compatibility
    const url = `https://api.polygon.io/v2/aggs/ticker/${symbol.toUpperCase()}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;

    console.log(`[Massive] Fetching ${symbol} ${timeframe} (${from} to ${to})`);

    const response = await rateLimitedFetch(url);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Massive API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as {
        status?: string;
        error?: string;
        results?: any[];
    };

    // Massive returns: { status: "OK" | "DELAYED", results: [ { o, h, l, c, v, t } ] }
    // DELAYED means delayed data (free tier), but still valid
    if (data.status !== 'OK' && data.status !== 'DELAYED') {
        if (data.status === 'ERROR' && data.error) {
            throw new Error(`Massive API error: ${data.error}`);
        }
        throw new Error(`Massive API returned status: ${data.status}`);
    }

    if (!data.results || data.results.length === 0) {
        throw new Error(`No data available from Massive.com for symbol ${symbol}`);
    }

    return normalizeMassiveData(data.results);
}

function getTimeframeParams(timeframe: Timeframe): { from: string; to: string } {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

    let fromDate = new Date(today);

    switch (timeframe) {
        case '1D':
            fromDate.setDate(today.getDate() - 2); // Get 2 days
            break;
        case '1W':
            fromDate.setDate(today.getDate() - 8); // Get 8 days
            break;
        case '1M':
            fromDate.setDate(today.getDate() - 35); // Get 35 days
            break;
        case '3M':
            fromDate.setDate(today.getDate() - 100); // Get 100 days
            break;
        case '1Y':
            fromDate.setDate(today.getDate() - 370); // Get 370 days
            break;
        default:
            fromDate.setDate(today.getDate() - 35);
    }

    return {
        from: formatDate(fromDate),
        to: formatDate(today),
    };
}

function normalizeMassiveData(results: any[]): PricePoint[] {
    const points: PricePoint[] = [];

    for (const candle of results) {
        points.push({
            timestamp: new Date(candle.t).toISOString(), // t is in milliseconds
            open: candle.o,
            high: candle.h,
            low: candle.l,
            close: candle.c,
            volume: candle.v,
        });
    }

    return points;
}

// TEMPORARY: Test function
export async function testMassiveCandles(env: Env): Promise<any> {
    const apiKey = env.MASSIVE_API_KEY;
    if (!apiKey) {
        return { error: 'No MASSIVE_API_KEY configured' };
    }

    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const url = `https://api.polygon.io/v2/aggs/ticker/AAPL/range/1/day/${weekAgo}/${today}?adjusted=true&sort=asc&apiKey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json() as {
            status?: string;
            results?: any[];
        };

        return {
            status: response.status,
            statusText: response.statusText,
            massiveStatus: data.status,
            resultsCount: data.results ? data.results.length : 0,
            sampleCandle: data.results && data.results.length > 0 ? data.results[0] : null,
            dateRange: `${weekAgo} to ${today}`,
            url: url.replace(apiKey, 'REDACTED'),
        };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
