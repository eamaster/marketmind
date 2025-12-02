import type { Env, PricePoint, Timeframe } from '../core/types';
import { MOCK_PRICES } from '../core/constants';
import { seededRandom, generateSeed } from '../core/random';

// Twelve Data client for stock data
// Docs: https://twelvedata.com/docs

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

    try {
        // First attempt: Try the requested timeframe
        return await fetchCandles(symbol, timeframe, apiKey);
    } catch (error) {
        // Check if it's a rate limit error (429) or other API error
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('429')) {
            console.warn(`[Twelve Data] Rate limit exceeded. Falling back to mock data.`);
            return getMockStockData(symbol, timeframe);
        } else if (errorMessage.includes('error')) {
            console.warn(`[Twelve Data] API error. Falling back to mock data.`);
            return getMockStockData(symbol, timeframe);
        }

        // For other errors, throw with debug info
        throw enhanceError(error, apiKey);
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

        // Implement exponential backoff for rate limit errors
        if (response.status === 429) {
            console.warn('[Twelve Data] Rate limit exceeded (429). Implement retry with exponential backoff.');
            throw new Error(`Twelve Data API rate limit: 429 - ${errorText}`);
        }

        throw new Error(`Twelve Data API error: ${response.status} ${response.statusText} - Body: ${errorText}`);
    }

    const data = await response.json() as any;

    // Check for error status in response body
    if (data.status === 'error') {
        throw new Error(`Twelve Data API error: ${data.message || 'Unknown error'}`);
    }

    return normalizeStockData(data);
}

function enhanceError(error: any, apiKey: string): Error {
    const keyDebug = apiKey
        ? `(Key configured: Yes, Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 4)}...)`
        : '(Key configured: No)';

    return new Error(`Twelve Data API Error: ${error instanceof Error ? error.message : 'Unknown'} ${keyDebug}`);
}

function getTimeframeParams(timeframe: Timeframe): { interval: string; outputsize: number } {
    switch (timeframe) {
        case '1D':
            return {
                interval: '1min', // 1-minute intervals
                outputsize: 390,   // Full trading day (6.5 hours * 60 minutes)
            };
        case '1W':
            return {
                interval: '1h',    // 1-hour intervals
                outputsize: 168,   // 7 days * 24 hours
            };
        case '1M':
            return {
                interval: '1day',  // Daily intervals
                outputsize: 30,    // 30 days
            };
        default: // Fallback to daily
            return {
                interval: '1day',
                outputsize: 30,
            };
    }
}

function normalizeStockData(apiData: any): PricePoint[] {
    // Twelve Data returns: { meta: {...}, values: [{datetime, open, high, low, close, volume}], status: "ok" }
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
        // CRITICAL: Twelve Data returns strings, convert to numbers with parseFloat
        // Handle null/undefined gracefully with fallback to 0
        data.push({
            timestamp: point.datetime ? new Date(point.datetime).toISOString() : new Date().toISOString(),
            open: point.open ? parseFloat(point.open) : 0,
            high: point.high ? parseFloat(point.high) : 0,
            low: point.low ? parseFloat(point.low) : 0,
            close: point.close ? parseFloat(point.close) : 0,
            volume: point.volume ? parseFloat(point.volume) : 0,
        });
    }

    // Twelve Data returns newest first, reverse to get chronological order
    return data.reverse();
}

export async function getStockQuote(
    symbol: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    const apiKey = env.TWELVEDATA_API_KEY;

    if (!apiKey) {
        return getMockQuote(symbol);
    }

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
                console.warn('[Twelve Data] Rate limit exceeded. Falling back to mock data.');
                return getMockQuote(symbol);
            }

            throw new Error(`Twelve Data API error: ${response.status} ${response.statusText} - Body: ${errorText}`);
        }

        const data = await response.json() as any;

        // Check for error status in response body
        if (data.status === 'error') {
            console.warn('[Twelve Data] API error, falling back to mock data:', data.message);
            return getMockQuote(symbol);
        }

        // Twelve Data quote response: { symbol, name, close, change, percent_change, ... }
        // CRITICAL: Apply parseFloat() to all numeric fields
        return {
            price: data.close ? parseFloat(data.close) : 0,
            change: data.change ? parseFloat(data.change) : 0,
            changePercent: data.percent_change ? parseFloat(data.percent_change) : 0,
        };
    } catch (error) {
        console.error('[Twelve Data] Error fetching quote:', error);
        // Gracefully fall back to mock data instead of throwing
        return getMockQuote(symbol);
    }
}

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
