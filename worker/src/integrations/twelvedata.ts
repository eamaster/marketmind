import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

// Twelve Data API client for stock candles with KV caching
// Docs: https://twelvedata.com/docs#time-series
// Rate limit: 8 calls/minute, 800 calls/day (free tier)

const CANDLES_TTL = 300; // 5 minutes cache for fresh data
const RATE_LIMIT_DELAY = 8000; // 8 seconds between calls (8 calls/min = 7.5s, add buffer)
let lastApiCallTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;

    if (timeSinceLastCall < RATE_LIMIT_DELAY) {
        const waitTime = RATE_LIMIT_DELAY - timeSinceLastCall;
        console.log(`[TwelveData] Rate limit protection: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastApiCallTime = Date.now();
    return fetch(url);
}

export async function getTwelveDataCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
        throw new Error('TWELVE_DATA_API_KEY not configured');
    }

    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `twelvedata:candles:${symbol}:${timeframe}`;

    // 1. Check KV cache first (fresh data)
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[TwelveData] Cache hit (fresh) for ${symbol} ${timeframe}`);
            return cached.data;
        }
    }

    // 2. Call Twelve Data API
    try {
        const data = await fetchTwelveDataCandles(symbol, timeframe, apiKey);

        if (cache) {
            await cache.set(cacheKey, data, CANDLES_TTL);
        }

        console.log(`[TwelveData] API success for ${symbol} ${timeframe} - ${data.length} candles`);
        return data;
    } catch (error) {
        // 3. Stale cache fallback
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[TwelveData] Using stale cache for ${symbol} ${timeframe}`);
                return staleData;
            }
        }
        throw error;
    }
}

async function fetchTwelveDataCandles(
    symbol: string,
    timeframe: Timeframe,
    apiKey: string
): Promise<PricePoint[]> {
    const { interval, outputsize } = getTimeframeParams(timeframe);

    // Twelve Data Time Series endpoint
    // https://twelvedata.com/docs#time-series
    const url = `https://api.twelvedata.com/time_series?symbol=${symbol.toUpperCase()}&interval=1day&outputsize=${outputsize}&apikey=${apiKey}`;

    console.log(`[TwelveData] Fetching ${symbol} ${timeframe} (outputsize: ${outputsize})`);

    const response = await rateLimitedFetch(url);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Twelve Data API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json() as {
        status?: string;
        code?: number;
        message?: string;
        values?: Array<{
            datetime: string;
            open: string;
            high: string;
            low: string;
            close: string;
            volume: string;
        }>;
    };

    // Handle API errors
    if (data.status === 'error' || data.code) {
        throw new Error(`Twelve Data API error: ${data.message || 'Unknown error'}`);
    }

    if (!data.values || data.values.length === 0) {
        throw new Error(`No data available from Twelve Data for symbol ${symbol}`);
    }

    return normalizeTwelveDataData(data.values);
}

function getTimeframeParams(timeframe: Timeframe): { interval: string; outputsize: number } {
    // Twelve Data uses "outputsize" parameter to control number of candles returned
    // We use daily interval for all timeframes, control history with outputsize
    switch (timeframe) {
        case '7D':
            return { interval: '1day', outputsize: 7 }; // 7 trading days (1 week)
        case '1M':
            return { interval: '1day', outputsize: 21 }; // 21 trading days (1 month)
        case '3M':
            return { interval: '1day', outputsize: 63 }; // 63 trading days (3 months)
        case '6M':
            return { interval: '1day', outputsize: 126 }; // 126 trading days (6 months)
        case '1Y':
            return { interval: '1day', outputsize: 252 }; // 252 trading days (1 year)
        default:
            return { interval: '1day', outputsize: 30 };
    }
}

function normalizeTwelveDataData(values: any[]): PricePoint[] {
    const points: PricePoint[] = [];

    // Twelve Data returns newest first, we need oldest first for charts
    const reversedValues = [...values].reverse();

    for (const candle of reversedValues) {
        points.push({
            timestamp: new Date(candle.datetime).toISOString(),
            open: parseFloat(candle.open),
            high: parseFloat(candle.high),
            low: parseFloat(candle.low),
            close: parseFloat(candle.close),
            volume: parseFloat(candle.volume),
        });
    }

    return points;
}
