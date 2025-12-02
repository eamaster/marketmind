import type { Env, PricePoint, Timeframe } from '../core/types';
import { MOCK_PRICES } from '../core/constants';
import { seededRandom, generateSeed } from '../core/random';

// Twelve Data client for stock data with comprehensive caching
// Docs: https://twelvedata.com/docs

// ============================================================================
// CACHE SYSTEM - Store recent real API data to avoid showing old mock data
// ============================================================================

interface CachedData<T> {
    data: T;
    timestamp: number;
}

// In-memory cache with 1-hour TTL
const cache = new Map<string, CachedData<any>>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get cached data if available and not expired
 */
function getCachedData<T>(key: string, ignoreExpiry: boolean = false): T | null {
    const cached = cache.get(key);
    if (!cached) return null;
    
    const ageSeconds = Math.round((Date.now() - cached.timestamp) / 1000);
    
    // When rate limited, return cache regardless of age
    if (ignoreExpiry) {
        console.log(`[Cache] Hit for ${key} (${ageSeconds}s old) - ignoring expiry`);
        return cached.data;
    }
    
    // Normal: check TTL
    if ((Date.now() - cached.timestamp) < CACHE_TTL) {
        console.log(`[Cache] Hit for ${key} (${ageSeconds}s old)`);
        return cached.data;
    }
    
    return null;
}

/**
 * Store data in cache
 */
function setCachedData<T>(key: string, data: T): void {
    cache.set(key, {
        data,
        timestamp: Date.now()
    });
    console.log(`[Cache] Stored ${key}`);
}

// ============================================================================
// STOCK CANDLES API
// ============================================================================

export async function getStockCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.TWELVEDATA_API_KEY;

    if (!apiKey) {
        console.warn('[Twelve Data] No API key configured, using mock data');
        return getMockStockData(symbol, timeframe);
    }

    const cacheKey = `candles_${symbol}_${timeframe}`;

    try {
        // Attempt to fetch from API
        const data = await fetchCandles(symbol, timeframe, apiKey);

        // Cache successful response
        setCachedData(cacheKey, data);

        return data;
    } catch (error) {
        // Check if it's a rate limit error
        const errorMessage = error instanceof Error ? error.message : '';

        if (errorMessage.includes('429')) {
            console.warn(`[Twelve Data] Rate limit exceeded for ${symbol}/${timeframe}`);

            // Try to return cached data first
            const cachedData = getCachedData<PricePoint[]>(cacheKey, true);
            if (cachedData) {
                console.log(`[Twelve Data] Returning cached candles instead of mock data`);
                return cachedData;
            }
        }

        // No cache available or other error, fall back to mock
        console.warn(`[Twelve Data] No cache available, using mock data for ${symbol}/${timeframe}`);
        return getMockStockData(symbol, timeframe);
    }
}

async function fetchCandles(symbol: string, timeframe: Timeframe, apiKey: string): Promise<PricePoint[]> {
    const { interval, outputsize } = getTimeframeParams(timeframe);

    const url = new URL('https://api.twelvedata.com/time_series');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('interval', interval);
    url.searchParams.set('outputsize', outputsize.toString());
    url.searchParams.set('apikey', apiKey);

    console.log(`[Twelve Data] Fetching ${symbol} candles: ${timeframe} (interval: ${interval}, outputsize: ${outputsize})`);

    const response = await fetch(url.toString());

    // Check rate limit headers
    const rateLimitRemaining = response.headers.get('x-api-rate-limit-remaining');
    if (rateLimitRemaining) {
        const remaining = parseInt(rateLimitRemaining, 10);
        if (remaining < 50) {
            console.warn(`[Twelve Data] Rate limit warning: ${remaining} requests remaining`);
        }
    }

    if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 429) {
            throw new Error(`Twelve Data API rate limit: 429 - ${errorText}`);
        }

        throw new Error(`Twelve Data API error: ${response.status} ${response.statusText} - Body: ${errorText}`);
    }

    const data = await response.json() as any;

    if (data.status === 'error') {
        throw new Error(`Twelve Data API error: ${data.message || 'Unknown error'}`);
    }

    return normalizeStockData(data);
}

function getTimeframeParams(timeframe: Timeframe): { interval: string; outputsize: number } {
    switch (timeframe) {
        case '1D':
            return {
                interval: '1min',
                outputsize: 390,
            };
        case '1W':
            return {
                interval: '1h',
                outputsize: 168,
            };
        case '1M':
            return {
                interval: '1day',
                outputsize: 30,
            };
        default:
            return {
                interval: '1day',
                outputsize: 30,
            };
    }
}

function normalizeStockData(apiData: any): PricePoint[] {
    if (apiData.status !== 'ok') {
        console.warn('[Twelve Data] API response status not OK:', apiData.status);
        return [];
    }

    if (!apiData.values || apiData.values.length === 0) {
        console.warn('[Twelve Data] No values data in response');
        return [];
    }

    const data: PricePoint[] = [];

    for (const point of apiData.values) {
        data.push({
            timestamp: point.datetime ? new Date(point.datetime).toISOString() : new Date().toISOString(),
            open: point.open ? parseFloat(point.open) : 0,
            high: point.high ? parseFloat(point.high) : 0,
            low: point.low ? parseFloat(point.low) : 0,
            close: point.close ? parseFloat(point.close) : 0,
            volume: point.volume ? parseFloat(point.volume) : 0,
        });
    }

    return data.reverse();
}

// ============================================================================
// STOCK QUOTE API  
// ============================================================================

export async function getStockQuote(
    symbol: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    const apiKey = env.TWELVEDATA_API_KEY;

    if (!apiKey) {
        console.warn('[Twelve Data] No API key configured, using mock data');
        return getMockQuote(symbol);
    }

    const cacheKey = `quote_${symbol}`;

    try {
        const url = new URL('https://api.twelvedata.com/quote');
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('apikey', apiKey);

        const response = await fetch(url.toString());

        // Check rate limit headers
        const rateLimitRemaining = response.headers.get('x-api-rate-limit-remaining');
        if (rateLimitRemaining) {
            const remaining = parseInt(rateLimitRemaining, 10);
            if (remaining < 50) {
                console.warn(`[Twelve Data] Rate limit warning: ${remaining} requests remaining`);
            }
        }

        if (!response.ok) {
            const errorText = await response.text();

            if (response.status === 429) {
                console.warn(`[Twelve Data] Rate limit exceeded for ${symbol} quote`);

                // Try to return cached data first
                const cachedData = getCachedData<{ price: number; change: number; changePercent: number }>(cacheKey, true);
                if (cachedData) {
                    console.log(`[Twelve Data] Returning cached quote instead of mock data`);
                    return cachedData;
                }

                // No cache, use mock
                console.warn(`[Twelve Data] No cache available, using mock data`);
                return getMockQuote(symbol);
            }

            throw new Error(`Twelve Data API error: ${response.status} ${response.statusText} - Body: ${errorText}`);
        }

        const data = await response.json() as any;

        if (data.status === 'error') {
            console.warn('[Twelve Data] API error:', data.message);

            // Try cache on error
            const cachedData = getCachedData<{ price: number; change: number; changePercent: number }>(cacheKey, true);
            if (cachedData) {
                console.log(`[Twelve Data] Returning cached quote on error`);
                return cachedData;
            }

            return getMockQuote(symbol);
        }

        // Parse and cache successful response
        const result = {
            price: data.close ? parseFloat(data.close) : 0,
            change: data.change ? parseFloat(data.change) : 0,
            changePercent: data.percent_change ? parseFloat(data.percent_change) : 0,
        };

        setCachedData(cacheKey, result);

        return result;
    } catch (error) {
        console.error('[Twelve Data] Error fetching quote:', error);

        // Try to return cached data on any error
        const cachedData = getCachedData<{ price: number; change: number; changePercent: number }>(cacheKey, true);
        if (cachedData) {
            console.log(`[Twelve Data] Returning cached quote on exception`);
            return cachedData;
        }

        // Last resort: mock data
        return getMockQuote(symbol);
    }
}

// ============================================================================
// MOCK DATA GENERATORS (Fallback only - cache is preferred)
// ============================================================================

function getMockStockData(symbol: string, timeframe: Timeframe): PricePoint[] {
    console.log(`[Twelve Data] Generating ${timeframe} mock data for ${symbol}`);

    const targetPrice = MOCK_PRICES[symbol] || 150.00;
    const points = timeframe === '1D' ? 78 : timeframe === '1W' ? 168 : 30;
    const interval = timeframe === '1D' ? 5 * 60 * 1000 : timeframe === '1W' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const now = Date.now();
    const timeBlock = Math.floor(now / (1000 * 60 * 60));
    const seed = generateSeed(symbol + timeframe, timeBlock);
    const rng = seededRandom(seed);

    const data: PricePoint[] = [];
    let currentPrice = targetPrice;
    const tempPoints: { close: number; open: number; high: number; low: number; volume: number }[] = [];

    for (let i = 0; i < points; i++) {
        const volatility = (rng() - 0.5) * (targetPrice * 0.01);
        const trend = (targetPrice * 0.0005);
        const prevPrice = currentPrice - volatility - trend;

        tempPoints.unshift({
            close: currentPrice,
            open: prevPrice,
            high: Math.max(prevPrice, currentPrice) + rng() * (targetPrice * 0.005),
            low: Math.min(prevPrice, currentPrice) - rng() * (targetPrice * 0.005),
            volume: Math.floor(rng() * 1000000) + 500000,
        });

        currentPrice = prevPrice;
    }

    for (let i = 0; i < points; i++) {
        const timestamp = new Date(now - (points - i - 1) * interval).toISOString();
        const p = tempPoints[i];
        data.push({
            timestamp,
            open: Number(p.open.toFixed(2)),
            high: Number(p.high.toFixed(2)),
            low: Number(p.low.toFixed(2)),
            close: Number(p.close.toFixed(2)),
            volume: p.volume,
        });
    }

    return data;
}

function getMockQuote(symbol: string): { price: number; change: number; changePercent: number } {
    const basePrice = MOCK_PRICES[symbol] || 150.00;
    const now = Date.now();
    const timeBlock = Math.floor(now / (1000 * 60 * 60));
    const seed = generateSeed(symbol + 'quote', timeBlock);
    const rng = seededRandom(seed);
    const price = basePrice;
    const change = (rng() * 5) * (rng() > 0.5 ? 1 : -1);
    const changePercent = (change / basePrice) * 100;

    return {
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
    };
}
