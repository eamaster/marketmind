import type { Env, PricePoint, Timeframe } from '../core/types';

// Gold API client
// Docs: https://www.goldapi.io/documentation

export async function getGoldPrice(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    // Gold API only provides current price (1 data point),
    // but charts need historical data to render properly.
    // Always use mock data for historical charts.
    console.log(`[GoldAPI] Using mock historical data for ${symbol}, ${timeframe}`);
    return getMockGoldData(symbol, timeframe);

    /* Original API call - only returns 1 point, doesn't work for charts
    const apiKey = env.GOLD_API_KEY;

    if (!apiKey) {
        console.warn('[GoldAPI] No API key configured, using mock data');
        return getMockGoldData(symbol, time frame);
    }

    try {
        // Fetch current price for the symbol
        // Gold API uses symbols like XAU/USD, XAG/USD
        const pairSymbol = `${symbol}/USD`;
        const url = `https://www.goldapi.io/api/${pairSymbol}`;

        console.log(`[GoldAPI] Fetching ${pairSymbol} for ${timeframe}`);

        const response = await fetch(url, {
            headers: {
                'x-access-token': apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[GoldAPI] API error:', response.status, response.statusText, errorText);
            throw new Error(`Gold API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[GoldAPI] Raw API response:`, JSON.stringify(data).substring(0, 300));

        const normalized = normalizeGoldPriceData(data);
        console.log(`[GoldAPI] Normalized ${normalized.length} data points`);

        return normalized;
    } catch (error) {
        console.error('[GoldAPI] Error fetching data:', error);
        console.warn('[GoldAPI] Falling back to mock data');
        return getMockGoldData(symbol, timeframe);
    }
    */
}

function normalizeGoldPriceData(apiData: any): PricePoint[] {
    // API response structure: { price: number, timestamp: number, ... }
    if (!apiData?.price) {
        console.warn('[GoldAPI] No price in API response');
        return [];
    }

    console.log(`[GoldAPI] Price: ${apiData.price}, Timestamp: ${apiData.timestamp}`);

    return [{
        timestamp: new Date((apiData.timestamp || Date.now()) * 1000).toISOString(),
        close: apiData.price,
        open: apiData.open_price,
        high: apiData.high_price,
        low: apiData.low_price,
    }];
}

import { MOCK_PRICES } from '../core/constants';

function getMockGoldData(symbol: string, timeframe: Timeframe): PricePoint[] {
    console.log(`[GoldAPI] Generating ${timeframe} mock data for ${symbol}`);

    const basePrice = MOCK_PRICES[symbol] || 2050.00;
    const points = timeframe === '1D' ? 78 : timeframe === '1W' ? 168 : 30;
    const interval = timeframe === '1D' ? 5 * 60 * 1000 : timeframe === '1W' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const now = Date.now();
    const data: PricePoint[] = [];

    for (let i = 0; i < points; i++) {
        const timestamp = new Date(now - (points - i - 1) * interval).toISOString();
        const volatility = (Math.random() - 0.5) * (basePrice * 0.01);
        const trend = i * (basePrice * 0.0005);
        const close = basePrice + volatility + trend;

        data.push({
            timestamp,
            close: Number(close.toFixed(2)),
            open: Number((close + (Math.random() - 0.5) * 2).toFixed(2)),
            high: Number((close + Math.random() * 2).toFixed(2)),
            low: Number((close - Math.random() * 2).toFixed(2)),
            volume: Math.floor(Math.random() * 500000) + 100000,
        });
    }

    return data;
}
