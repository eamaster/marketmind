import type { Env, PricePoint, Timeframe } from '../core/types';
import { MOCK_PRICES } from '../core/constants';
import { seededRandom, generateSeed } from '../core/random';

// Finnhub client for stock data
// Docs: https://finnhub.io/docs/api

export async function getStockCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.FINNHUB_API_KEY;

    if (!apiKey) {
        console.warn('[Finnhub] No API key configured, using mock data');
        return getMockStockData(symbol, timeframe);
    }

    try {
        // First attempt: Try the requested timeframe
        return await fetchCandles(symbol, timeframe, apiKey);
    } catch (error) {
        // Check if it's a 403 Forbidden error (Plan Limit)
        const errorMessage = error instanceof Error ? error.message : '';
        if (errorMessage.includes('403')) {
            console.warn(`[Finnhub] 403 Forbidden for ${timeframe}. Falling back to Daily resolution (Free Tier compatible).`);

            // Fallback: Fetch Daily data for the last month
            // This ensures Free Tier users still see REAL data instead of an error
            try {
                return await fetchCandles(symbol, '1M', apiKey);
            } catch (fallbackError) {
                // If even fallback fails (e.g. Key doesn't support Candles at all),
                // return Mock Data so the app doesn't crash.
                console.warn(`[Finnhub] Real data failed (403). Falling back to Mock Data.`);
                return getMockStockData(symbol, timeframe);
            }
        }

        // For other errors, throw with debug info
        throw enhanceError(error, apiKey);
    }
}

async function fetchCandles(symbol: string, timeframe: Timeframe, apiKey: string): Promise<PricePoint[]> {
    const { resolution, from, to } = getTimeframeParams(timeframe);

    const url = new URL('https://finnhub.io/api/v1/stock/candle');
    url.searchParams.set('symbol', symbol);
    url.searchParams.set('resolution', resolution);
    url.searchParams.set('from', from.toString());
    url.searchParams.set('to', to.toString());
    url.searchParams.set('token', apiKey);

    console.log(`[Finnhub] Fetching ${symbol} candles: ${timeframe} (resolution: ${resolution})`);

    const response = await fetch(url.toString());

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Finnhub API error: ${response.status} ${response.statusText} - Body: ${errorText}`);
    }

    const data = await response.json();
    return normalizeStockData(data);
}

function enhanceError(error: any, apiKey: string): Error {
    const keyDebug = apiKey
        ? `(Key configured: Yes, Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 4)}...)`
        : '(Key configured: No)';

    return new Error(`Finnhub API Error: ${error instanceof Error ? error.message : 'Unknown'} ${keyDebug}`);
}

function getTimeframeParams(timeframe: Timeframe): { resolution: string; from: number; to: number } {
    const now = Math.floor(Date.now() / 1000);

    switch (timeframe) {
        case '1D':
            return {
                resolution: '5', // 5-minute intervals (Paid)
                from: now - 24 * 60 * 60,
                to: now,
            };
        case '1W':
            return {
                resolution: '60', // 1-hour intervals (Paid)
                from: now - 7 * 24 * 60 * 60,
                to: now,
            };
        case '1M':
            return {
                resolution: 'D', // Daily intervals (Free)
                from: now - 30 * 24 * 60 * 60,
                to: now,
            };
        default: // Fallback to daily
            return {
                resolution: 'D',
                from: now - 30 * 24 * 60 * 60,
                to: now,
            };
    }
}

function normalizeStockData(apiData: any): PricePoint[] {
    // Finnhub returns: { c: [close], h: [high], l: [low], o: [open], t: [timestamp], v: [volume], s: status }
    if (apiData.s !== 'ok') {
        console.warn('[Finnhub] API response status not OK:', apiData.s);
        return [];
    }

    if (!apiData.t || apiData.t.length === 0) {
        console.warn('[Finnhub] No timestamp data in response');
        return [];
    }

    const data: PricePoint[] = [];

    for (let i = 0; i < apiData.t.length; i++) {
        data.push({
            timestamp: new Date(apiData.t[i] * 1000).toISOString(),
            open: apiData.o?.[i],
            high: apiData.h?.[i],
            low: apiData.l?.[i],
            close: apiData.c[i],
            volume: apiData.v?.[i],
        });
    }

    return data;
}

export async function getStockQuote(
    symbol: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    const apiKey = env.FINNHUB_API_KEY;

    if (!apiKey) {
        return getMockQuote(symbol);
    }

    try {
        const url = new URL('https://finnhub.io/api/v1/quote');
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('token', apiKey);

        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Finnhub API error: ${response.status} ${response.statusText} - Body: ${errorText}`);
        }

        const data = await response.json();

        // Finnhub quote response: { c: current, d: change, dp: percent change, ... }
        return {
            price: data.c || 0,
            change: data.d || 0,
            changePercent: data.dp || 0,
        };
    } catch (error) {
        console.error('[Finnhub] Error fetching quote:', error);
        throw enhanceError(error, apiKey);
    }
}

function getMockStockData(symbol: string, timeframe: Timeframe): PricePoint[] {
    console.log(`[Finnhub] Generating ${timeframe} mock data for ${symbol}`);

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
