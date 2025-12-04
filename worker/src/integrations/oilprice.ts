import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

// Oil prices using Massive.com (Polygon.io) - REAL DATA
// Docs: https://massive.com/docs/rest/quickstart

const CANDLES_TTL = 60; // 60 seconds cache for real-time feel

// Map oil codes to Massive.com forex pairs
function convertToMassiveSymbol(code: string): string {
    const mapping: Record<string, string> = {
        'WTI_USD': 'C:WTIUSD',    // WTI Crude Oil
        'BRENT_USD': 'C:BRTUSD',  // Brent Crude Oil
        'NATURAL_GAS': 'C:NGUSD', // Natural Gas (if available)
    };
    return mapping[code] || code;
}

function getTimeframeParams(timeframe: Timeframe): { from: string; to: string } {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0]; // YYYY-MM-DD

    let fromDate = new Date(today);

    switch (timeframe) {
        case '1D':
            fromDate.setDate(today.getDate() - 10); // 10 calendar days ≈ 7 trading days
            break;
        case '1W':
            fromDate.setDate(today.getDate() - 30); // 30 calendar days ≈ 21 trading days
            break;
        case '1M':
            fromDate.setDate(today.getDate() - 90); // 90 calendar days ≈ 63 trading days
            break;
        case '3M':
            fromDate.setDate(today.getDate() - 180); // 180 calendar days ≈ 126 trading days
            break;
        case '1Y':
            fromDate.setFullYear(today.getFullYear() - 1); // 365 calendar days ≈ 252 trading days
            break;
        default:
            fromDate.setDate(today.getDate() - 30);
    }

    return {
        from: formatDate(fromDate),
        to: formatDate(today),
    };
}

async function fetchMassiveCandles(
    code: string,
    timeframe: Timeframe,
    apiKey: string
): Promise<PricePoint[]> {
    const { from, to } = getTimeframeParams(timeframe);
    const massiveSymbol = convertToMassiveSymbol(code);

    // Use api.polygon.io (backward compatible endpoint)
    const url = `https://api.polygon.io/v2/aggs/ticker/${massiveSymbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&apiKey=${apiKey}`;

    console.log(`[Massive/Oil] Fetching ${code} (${massiveSymbol}) from ${from} to ${to}`);
    console.log(`[Massive/Oil] URL: ${url.replace(apiKey, 'REDACTED')}`);

    const response = await fetch(url);

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Massive/Oil] API Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Massive.com API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json() as {
        status: string;
        results?: Array<{
            t: number;  // timestamp in milliseconds
            o: number;  // open
            h: number;  // high
            l: number;  // low
            c: number;  // close
            v: number;  // volume
        }>;
    };

    console.log(`[Massive/Oil] Response status: ${json.status}`);
    console.log(`[Massive/Oil] First 500 chars:`, JSON.stringify(json).substring(0, 500));

    if (json.status !== 'OK' && json.status !== 'DELAYED') {
        console.error(`[Massive/Oil] Unexpected status: ${json.status}`);
        throw new Error(`Massive.com returned status: ${json.status}`);
    }

    if (!json.results || json.results.length === 0) {
        console.error(`[Massive/Oil] No candles returned for ${code}`);
        throw new Error('No candle data available');
    }

    const candles: PricePoint[] = json.results.map(candle => ({
        timestamp: new Date(candle.t).toISOString(),
        open: candle.o,
        high: candle.h,
        low: candle.l,
        close: candle.c,
        volume: candle.v,
    }));

    // Log first and last candle for verification
    const firstCandle = candles[0];
    const lastCandle = candles[candles.length - 1];

    console.log(`[Massive/Oil] ${code}: ${candles.length} candles`);
    console.log(`[Massive/Oil] First: ${firstCandle.timestamp} @ $${firstCandle.close}`);
    console.log(`[Massive/Oil] Last: ${lastCandle.timestamp} @ $${lastCandle.close}`);

    // Data freshness validation
    const lastCandleDate = new Date(lastCandle.timestamp);
    const today = new Date();
    const daysSinceLastCandle = Math.floor((today.getTime() - lastCandleDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`[Massive/Oil] Data freshness: ${daysSinceLastCandle} days old`);

    if (daysSinceLastCandle > 5) {
        console.warn(`[Massive/Oil] ⚠️ WARNING: Data is ${daysSinceLastCandle} days old!`);
    }

    return candles;
}

export async function getOilPrice(
    code: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.MASSIVE_API_KEY;

    if (!apiKey) {
        throw new Error('MASSIVE_API_KEY not configured');
    }

    // Add date to cache key for daily invalidation
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `massive:oil:${code}:${timeframe}:${today}`;

    // 1. Check KV cache first (fresh data)
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[Massive/Oil] Cache hit (fresh) for ${code} ${timeframe}`);
            return cached.data;
        }
    }

    // 2. Call Massive API
    try {
        const data = await fetchMassiveCandles(code, timeframe, apiKey);

        if (cache) {
            await cache.set(cacheKey, data, CANDLES_TTL);
        }

        console.log(`[Massive/Oil] API success for ${code} ${timeframe} - ${data.length} candles`);
        return data;
    } catch (error) {
        // 3. Stale cache fallback
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[Massive/Oil] Using stale cache for ${code} ${timeframe}`);
                return staleData;
            }
        }
        throw error;
    }
}

export async function getOilQuote(
    code: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    // Get latest candle from 7D data
    try {
        const data = await getOilPrice(code, '1D', env);
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
        console.error(`[Massive/Oil] Failed to get quote for ${code}:`, error);
        // Return zero values instead of mock data
        return {
            price: 0,
            change: 0,
            changePercent: 0,
        };
    }
}
