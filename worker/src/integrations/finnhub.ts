import type { Env, PricePoint, Timeframe } from '../core/types';

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
        const { resolution, from, to } = getTimeframeParams(timeframe);

        const url = new URL('https://finnhub.io/api/v1/stock/candle');
        url.searchParams.set('symbol', symbol);
        url.searchParams.set('resolution', resolution);
        url.searchParams.set('from', from.toString());
        url.searchParams.set('to', to.toString());
        url.searchParams.set('token', apiKey);

        console.log(`[Finnhub] Fetching ${symbol} candles: ${timeframe} (resolution: ${resolution})`);
        console.log(`[Finnhub] URL: ${url.toString().replace(apiKey, 'API_KEY')}`);

        const response = await fetch(url.toString());

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Finnhub] API error:', response.status, response.statusText, errorText);
            throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[Finnhub] Raw API response status:`, data.s);
        console.log(`[Finnhub] Data points count:`, data.t?.length || 0);

        const normalizedData = normalizeStockData(data);
        console.log(`[Finnhub] Normalized ${normalizedData.length} candles`);

        return normalizedData;
    } catch (error) {
        console.error('[Finnhub] Error fetching data:', error);

        // Add debug info to the error message
        const keyDebug = apiKey
            ? `(Key configured: Yes, Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 4)}...)`
            : '(Key configured: No)';

        const enhancedError = new Error(`Finnhub API Error: ${error instanceof Error ? error.message : 'Unknown'} ${keyDebug}`);

        // If we have an API key but failed, throw the error.
        // DO NOT fallback to mock data if the user expects real data.
        throw enhancedError;
    }
}

function getTimeframeParams(timeframe: Timeframe): { resolution: string; from: number; to: number } {
    const now = Math.floor(Date.now() / 1000);

    switch (timeframe) {
        case '1D':
            return {
                resolution: '5', // 5-minute intervals
                from: now - 24 * 60 * 60,
                to: now,
            };
        case '1W':
            return {
                resolution: '60', // 1-hour intervals
                from: now - 7 * 24 * 60 * 60,
                to: now,
            };
        case '1M':
            return {
                resolution: 'D', // Daily intervals
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

    console.log(`[Finnhub] Processing ${apiData.t.length} candles`);
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

import { MOCK_PRICES } from '../core/constants';
import { seededRandom, generateSeed } from '../core/random';

function getMockStockData(symbol: string, timeframe: Timeframe): PricePoint[] {
    console.log(`[Finnhub] Generating ${timeframe} mock data for ${symbol}`);

    const targetPrice = MOCK_PRICES[symbol] || 150.00;
    const points = timeframe === '1D' ? 78 : timeframe === '1W' ? 168 : 30;
    const interval = timeframe === '1D' ? 5 * 60 * 1000 : timeframe === '1W' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const now = Date.now();
    // Use current hour as seed to ensure consistency across reloads/environments for the same hour
    const timeBlock = Math.floor(now / (1000 * 60 * 60));
    const seed = generateSeed(symbol + timeframe, timeBlock);
    const rng = seededRandom(seed);

    const data: PricePoint[] = [];

    // Generate a random walk first
    let currentPrice = targetPrice;
    const tempPoints: { close: number; open: number; high: number; low: number; volume: number }[] = [];

    // Work backwards from target price
    for (let i = 0; i < points; i++) {
        const volatility = (rng() - 0.5) * (targetPrice * 0.01);
        // Reverse trend: if we want upward trend, we subtract it when going backwards
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

    // Assign timestamps
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
            throw new Error(`Finnhub API error: ${response.status}`);
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

        // Add debug info to the error message
        const keyDebug = apiKey
            ? `(Key configured: Yes, Length: ${apiKey.length}, Prefix: ${apiKey.substring(0, 4)}...)`
            : '(Key configured: No)';

        const enhancedError = new Error(`Finnhub API Error: ${error instanceof Error ? error.message : 'Unknown'} ${keyDebug}`);

        // If we have an API key but failed, throw the error so the user knows something is wrong
        // instead of showing fake data.
        throw enhancedError;
    }
}

function getMockQuote(symbol: string): { price: number; change: number; changePercent: number } {
    const basePrice = MOCK_PRICES[symbol] || 150.00;

    // Use seeded random for consistent daily change
    const now = Date.now();
    const timeBlock = Math.floor(now / (1000 * 60 * 60)); // Hourly consistency
    const seed = generateSeed(symbol + 'quote', timeBlock);
    const rng = seededRandom(seed);

    // Return the EXACT base price so it matches the chart's last candle
    const price = basePrice;

    // Random change for display purposes (balanced 50/50 chance of gain/loss)
    const change = (rng() * 5) * (rng() > 0.5 ? 1 : -1);
    const changePercent = (change / basePrice) * 100;

    return {
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
    };
}
