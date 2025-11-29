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
        console.warn('[Finnhub] Falling back to mock data');
        return getMockStockData(symbol, timeframe);
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

function getMockStockData(symbol: string, timeframe: Timeframe): PricePoint[] {
    console.log(`[Finnhub] Generating ${timeframe} mock data for ${symbol}`);

    const basePrice = symbol === 'AAPL' ? 180 : symbol === 'TSLA' ? 240 : 450;
    const points = timeframe === '1D' ? 78 : timeframe === '1W' ? 168 : 30;
    const interval = timeframe === '1D' ? 5 * 60 * 1000 : timeframe === '1W' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const now = Date.now();
    const data: PricePoint[] = [];

    for (let i = 0; i < points; i++) {
        const timestamp = new Date(now - (points - i - 1) * interval).toISOString();
        const volatility = (Math.random() - 0.5) * (basePrice * 0.02);
        const trend = i * 0.1;
        const close = basePrice + volatility + trend;

        const open = close + (Math.random() - 0.5) * 2;
        const high = Math.max(open, close) + Math.random() * 1.5;
        const low = Math.min(open, close) - Math.random() * 1.5;

        data.push({
            timestamp,
            open: Number(open.toFixed(2)),
            high: Number(high.toFixed(2)),
            low: Number(low.toFixed(2)),
            close: Number(close.toFixed(2)),
            volume: Math.floor(Math.random() * 10000000),
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
        return getMockQuote(symbol);
    }
}

function getMockQuote(symbol: string): { price: number; change: number; changePercent: number } {
    const basePrice = symbol === 'AAPL' ? 189.45 : symbol === 'TSLA' ? 242.84 : 150.00;
    const volatility = (Math.random() - 0.5) * 2;
    const price = basePrice + volatility;
    const change = volatility;
    const changePercent = (change / basePrice) * 100;

    return {
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
    };
}
