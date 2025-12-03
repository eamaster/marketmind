import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

// Alpha Vantage client for stock candles with KV caching
// Docs: https://www.alphavantage.co/documentation/
// Rate limit: 500 calls/day, 25 calls/minute

const CANDLES_TTL = 60; // 60 seconds cache
const RATE_LIMIT_DELAY = 2500; // 2.5 seconds between calls (24 calls/minute, under 25 limit)
let lastApiCallTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;

    if (timeSinceLastCall < RATE_LIMIT_DELAY) {
        const waitTime = RATE_LIMIT_DELAY - timeSinceLastCall;
        console.log(`[AlphaVantage] Rate limit protection: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    lastApiCallTime = Date.now();
    return fetch(url);
}

export async function getAlphaVantageCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.ALPHAVANTAGE_API_KEY;

    if (!apiKey) {
        throw new Error('ALPHAVANTAGE_API_KEY not configured');
    }

    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `av:candles:${symbol}:${timeframe}`;

    // 1. Check KV cache first (fresh data)
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[AlphaVantage] Cache hit (fresh) for ${symbol} ${timeframe}`);
            return cached.data;
        }
    }

    // 2. Call Alpha Vantage API
    try {
        const data = await fetchAlphaVantageCandles(symbol, timeframe, apiKey);

        if (cache) {
            await cache.set(cacheKey, data, CANDLES_TTL);
        }

        console.log(`[AlphaVantage] API success for ${symbol} ${timeframe} - ${data.length} candles`);
        return data;
    } catch (error) {
        // 3. Stale cache fallback
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[AlphaVantage] Using stale cache for ${symbol} ${timeframe}`);
                return staleData;
            }
        }
        throw error;
    }
}

async function fetchAlphaVantageCandles(
    symbol: string,
    timeframe: Timeframe,
    apiKey: string
): Promise<PricePoint[]> {
    const outputsize = getOutputSize(timeframe);

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol.toUpperCase()}&outputsize=${outputsize}&apikey=${apiKey}`;

    console.log(`[AlphaVantage] Fetching ${symbol} ${timeframe} (outputsize: ${outputsize})`);

    const response = await rateLimitedFetch(url);

    if (!response.ok) {
        throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
        'Time Series (Daily)'?: any;
        'Note'?: string;
        'Error Message'?: string;
        'Information'?: string;
    };

    // Check for rate limiting BEFORE checking for timeSeries
    if (data['Note']) {
        if (data['Note'].includes('25 requests per day')) {
            throw new Error('Alpha Vantage free tier limit reached (25 calls/day). Please upgrade or try again tomorrow.');
        }
        if (data['Note'].includes('Thank you for using Alpha Vantage')) {
            throw new Error('Alpha Vantage API call frequency is 25 requests per minute. Please wait 60 seconds.');
        }
    }

    if (data['Information']) {
        throw new Error('Alpha Vantage rate limit reached (25 calls/minute). Please wait 60 seconds and try again.');
    }

    // Now check for time series data
    const timeSeries = data['Time Series (Daily)'];

    if (!timeSeries) {
        if (data['Error Message']) {
            throw new Error(`Alpha Vantage error: ${data['Error Message']}`);
        }
        throw new Error('No data available from Alpha Vantage for this symbol');
    }

    return normalizeAlphaVantageData(timeSeries, timeframe);
}

function getOutputSize(timeframe: Timeframe): 'compact' | 'full' {
    // compact = last 100 days (faster API response)
    // full = 20+ years (slower, use only for long timeframes)
    switch (timeframe) {
        case '1D':
        case '1W':
        case '1M':
            return 'compact'; // 100 days is enough
        default:
            return 'full'; // Need more historical data
    }
}

function normalizeAlphaVantageData(timeSeries: any, timeframe: Timeframe): PricePoint[] {
    const points: PricePoint[] = [];
    const days = getDaysForTimeframe(timeframe);

    // Alpha Vantage returns dates in descending order (newest first)
    const allDates = Object.keys(timeSeries).sort().reverse();
    const targetDates = allDates.slice(0, days);

    for (const date of targetDates) {
        const dayData = timeSeries[date];
        points.push({
            timestamp: new Date(date + 'T00:00:00Z').toISOString(),
            open: parseFloat(dayData['1. open']),
            high: parseFloat(dayData['2. high']),
            low: parseFloat(dayData['3. low']),
            close: parseFloat(dayData['4. close']),
            volume: parseInt(dayData['5. volume'], 10),
        });
    }

    // Return oldest to newest (reverse order for charts)
    return points.reverse();
}

function getDaysForTimeframe(timeframe: Timeframe): number {
    switch (timeframe) {
        case '1D': return 1;
        case '1W': return 7;
        case '1M': return 30;
        default: return 30;
    }
}

export async function testAlphaVantageCandles(env: Env): Promise<any> {
    const apiKey = env.ALPHAVANTAGE_API_KEY;
    if (!apiKey) {
        return { error: 'No ALPHAVANTAGE_API_KEY configured' };
    }

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=AAPL&outputsize=compact&apikey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json() as {
            'Time Series (Daily)'?: any;
            'Note'?: string;
            'Error Message'?: string;
            'Information'?: string;
        };

        const timeSeries = data['Time Series (Daily)'];

        if (!timeSeries) {
            return {
                status: response.status,
                hasData: false,
                error: data['Note'] || data['Information'] || data['Error Message'] || 'No data',
                rawResponse: data,
            };
        }

        const sampleDates = Object.keys(timeSeries).sort().reverse().slice(0, 3);

        return {
            status: response.status,
            statusText: response.statusText,
            hasData: true,
            dataPoints: Object.keys(timeSeries).length,
            sampleDates: sampleDates,
            firstCandle: sampleDates.length > 0 ? timeSeries[sampleDates[0]] : null,
            url: url.replace(apiKey, 'REDACTED'),
        };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
