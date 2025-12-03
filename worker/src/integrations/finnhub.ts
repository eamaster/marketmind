import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

// Finnhub client for stock data with KV caching + stale fallback
// Docs: https://finnhub.io/docs/api
// Strategy: Fresh cache (10s) -> API call -> Stale cache -> Error (NO MOCK DATA)

const QUOTE_TTL = 10; // 10 seconds for real-time quotes
const CANDLES_TTL = 60; // 60 seconds for historical candles

export async function getStockCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.FINNHUB_API_KEY;

    if (!apiKey) {
        throw new Error('FINNHUB_API_KEY not configured');
    }

    // Initialize KV cache if available
    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `candles:${symbol}:${timeframe}`;

    // 1. Check KV cache first (fresh data)
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[Finnhub] Cache hit (fresh) for ${symbol} ${timeframe}`);
            return cached.data;
        }
    }

    // 2. Call Finnhub API
    try {
        const data = await fetchCandles(symbol, timeframe, apiKey);

        // Store in cache for future requests
        if (cache) {
            await cache.set(cacheKey, data, CANDLES_TTL);
        }

        console.log(`[Finnhub] API success for ${symbol} ${timeframe}`);
        return data;
    } catch (error) {
        // 3. If API fails, try stale cache
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[Finnhub] API failed, returning stale cache for ${symbol} ${timeframe}`);
                return staleData;
            }
        }

        // 4. No cache available, throw error (no mock data!)
        throw enhanceError(error, apiKey);
    }
}

async function fetchCandles(symbol: string, timeframe: Timeframe, apiKey: string): Promise<PricePoint[]> {
    const { resolution, from, to } = getTimeframeParams(timeframe);

    // Build URL with ALL required parameters
    const url = new URL('https://finnhub.io/api/v1/stock/candle');
    url.searchParams.set('symbol', symbol.toUpperCase()); // Ensure uppercase
    url.searchParams.set('resolution', resolution);
    url.searchParams.set('from', from.toString());
    url.searchParams.set('to', to.toString());
    url.searchParams.set('token', apiKey); // Token as URL parameter

    console.log(`[Finnhub] Fetching candles: ${url.toString().replace(apiKey, 'REDACTED')}`);
    console.log(`[Finnhub] Parameters: symbol=${symbol.toUpperCase()}, resolution=${resolution}, from=${from}, to=${to}`);

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Finnhub] API Error ${response.status}:`, errorText);
        throw new Error(`Finnhub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();

    // Log the raw response for debugging
    console.log(`[Finnhub] Raw response for ${symbol}:`, JSON.stringify(data).substring(0, 200));

    return normalizeStockData(data);
}

function enhanceError(error: any, apiKey: string): Error {
    const keyDebug = apiKey
        ? `(Key configured: Yes, Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 4)}...)`
        : '(Key configured: No)';

    return new Error(`Finnhub API Error: ${error instanceof Error ? error.message : 'Unknown'} ${keyDebug}`);
}

function getTimeframeParams(timeframe: Timeframe): { resolution: string; from: number; to: number } {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const oneDay = 24 * 60 * 60;

    switch (timeframe) {
        case '1D':
            return {
                resolution: 'D',
                from: now - (2 * oneDay), // Get 2 days to ensure at least 1 candle
                to: now,
            };
        case '1W':
            return {
                resolution: 'D',
                from: now - (8 * oneDay), // Get 8 days to ensure 7 trading days
                to: now,
            };
        case '1M':
            return {
                resolution: 'D',
                from: now - (35 * oneDay), // Get 35 days to ensure 30 trading days
                to: now,
            };
        default:
            return {
                resolution: 'D',
                from: now - (35 * oneDay),
                to: now,
            };
    }
}

function normalizeStockData(apiData: any): PricePoint[] {
    // Finnhub returns: { c: [close], h: [high], l: [low], o: [open], t: [timestamp], v: [volume], s: status }

    // Check status first
    if (apiData.s === 'no_data') {
        console.warn('[Finnhub] No data available for this symbol/timeframe');
        throw new Error('No data available from Finnhub');
    }

    if (apiData.s !== 'ok') {
        console.warn('[Finnhub] API response status not OK:', apiData.s);
        throw new Error(`Finnhub API returned status: ${apiData.s}`);
    }

    // Verify we have timestamp data
    if (!apiData.t || !Array.isArray(apiData.t) || apiData.t.length === 0) {
        console.warn('[Finnhub] No timestamp data in response:', apiData);
        throw new Error('No candle data available');
    }

    const data: PricePoint[] = [];

    for (let i = 0; i < apiData.t.length; i++) {
        data.push({
            timestamp: new Date(apiData.t[i] * 1000).toISOString(),
            open: apiData.o?.[i] ?? apiData.c[i],
            high: apiData.h?.[i] ?? apiData.c[i],
            low: apiData.l?.[i] ?? apiData.c[i],
            close: apiData.c[i],
            volume: apiData.v?.[i] ?? 0,
        });
    }

    console.log(`[Finnhub] Normalized ${data.length} candles`);
    return data;
}

export async function getStockQuote(
    symbol: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    const apiKey = env.FINNHUB_API_KEY;

    if (!apiKey) {
        throw new Error('FINNHUB_API_KEY not configured');
    }

    // Initialize KV cache if available
    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `quote:${symbol}`;

    // 1. Check KV cache first (fresh data)
    if (cache) {
        const cached = await cache.get<{ price: number; change: number; changePercent: number }>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[Finnhub] Cache hit (fresh) for quote ${symbol}`);
            return cached.data;
        }
    }

    // 2. Call Finnhub API
    try {
        const url = new URL('https://finnhub.io/api/v1/quote');
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('token', apiKey);

        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Finnhub API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json() as { c: number; d: number; dp: number };

        // Finnhub quote response: { c: current, d: change, dp: percent change, ... }
        const quote = {
            price: data.c || 0,
            change: data.d || 0,
            changePercent: data.dp || 0,
        };

        // Store in cache
        if (cache) {
            await cache.set(cacheKey, quote, QUOTE_TTL);
        }

        console.log(`[Finnhub] API success for quote ${symbol}`);
        return quote;
    } catch (error) {
        // 3. If API fails, try stale cache
        if (cache) {
            const staleData = await cache.getStale<{ price: number; change: number; changePercent: number }>(cacheKey);
            if (staleData) {
                console.warn(`[Finnhub] API failed, returning stale cache for quote ${symbol}`);
                return staleData;
            }
        }

        // 4. No cache available, throw error
        throw enhanceError(error, apiKey);
    }
}

// TEMPORARY: Test function to verify API access
export async function testFinnhubCandles(env: Env): Promise<any> {
    const apiKey = env.FINNHUB_API_KEY;
    if (!apiKey) {
        return { error: 'No API key' };
    }

    const now = Math.floor(Date.now() / 1000);
    const from = now - (7 * 24 * 60 * 60); // 7 days ago

    const url = `https://finnhub.io/api/v1/stock/candle?symbol=AAPL&resolution=D&from=${from}&to=${now}&token=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        return {
            status: response.status,
            statusText: response.statusText,
            data: data,
            url: url.replace(apiKey, 'REDACTED'),
        };
    } catch (error) {
        return {
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}
