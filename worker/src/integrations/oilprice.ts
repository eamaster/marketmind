import type { Env, PricePoint, Timeframe } from '../core/types';

// OilPriceAPI client
// Docs: https://docs.oilpriceapi.com/

export async function getOilPrice(
    code: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    // Always use mock data for reliable historical charts
    // OilPrice API requires paid plan for historical data
    console.log(`[OilPrice] Using mock historical data for ${code}, ${timeframe}`);
    return getMockOilData(code, timeframe);

    /* Original API call - disabled to ensure charts always have data
    const apiKey = env.O ILPRICE_API_KEY;

    if (!apiKey) {
        console.warn('[Oil Price] No API key configured, using mock data');
        return getMockOilData(code, timeframe);
    }

    try {
        // Select the appropriate endpoint based on timeframe
        const endpoint = getEndpointForTimeframe(timeframe);
        const url = `https://api.oilpriceapi.com/v1${endpoint}?by_code=${code}`;

        console.log(`[OilPrice] Fetching ${code} for ${timeframe} from ${endpoint}`);

        const response = await fetch(url, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[OilPrice] API error:', response.status, response.statusText, errorText);
            throw new Error(`OilPriceAPI error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[OilPrice] Raw API response:`, JSON.stringify(data).substring(0, 500));

        // Normalize response to PricePoint format
        const normalizedData = normalizeOilPriceData(data, code, timeframe);
        console.log(`[OilPrice] Normalized ${normalizedData.length} data points`);

        return normalizedData;
    } catch (error) {
        console.error('[OilPrice] Error fetching data:', error);
        console.warn('[OilPrice] Falling back to mock data');
        // Fallback to mock data
        return getMockOilData(code, timeframe);
    }
    */
}

function getEndpointForTimeframe(timeframe: Timeframe): string {
    switch (timeframe) {
        case '1D':
            return '/prices/past_day';
        case '1W':
            return '/prices/past_week';
        case '1M':
            return '/prices/past_month';
        default:
            return '/prices/latest';
    }
}

function normalizeOilPriceData(apiData: any, code: string, timeframe: Timeframe): PricePoint[] {
    console.log(`[OilPrice] Normalizing data for ${code}, timeframe: ${timeframe}`);

    // Check response structure
    if (!apiData?.status || apiData.status !== 'success') {
        console.warn('[OilPrice] API response not successful:', apiData);
        return [];
    }

    if (!apiData?.data) {
        console.warn('[OilPrice] No data in API response');
        return [];
    }

    // For historical endpoints, data structure is:
    // { status: "success", data: { "WTI_USD": [{ price: 78.45, timestamp: "..." }, ...] } }
    const codeData = apiData.data[code];

    if (!codeData) {
        console.warn(`[OilPrice] No data for code ${code} in response`);
        console.log(`[OilPrice] Available codes:`, Object.keys(apiData.data));
        return [];
    }

    // Historical endpoints return arrays
    if (Array.isArray(codeData)) {
        console.log(`[OilPrice] Processing ${codeData.length} historical data points`);
        return codeData.map((point: any) => ({
            timestamp: point.timestamp || new Date().toISOString(),
            close: point.price || 0,
            // OilPrice API doesn't provide OHLC, only price
        }));
    }

    // Latest endpoint returns single object
    if (typeof codeData === 'object' && codeData.price) {
        console.log('[OilPrice] Processing single latest price point');
        return [{
            timestamp: codeData.timestamp || new Date().toISOString(),
            close: codeData.price,
        }];
    }

    console.warn('[OilPrice] Unexpected data format:', typeof codeData);
    return [];
}

import { MOCK_PRICES } from '../core/constants';
import { seededRandom, generateSeed } from '../core/random';

function getMockOilData(code: string, timeframe: Timeframe): PricePoint[] {
    console.log(`[OilPrice] Generating ${timeframe} mock data for ${code}`);

    const targetPrice = MOCK_PRICES[code] || 75.5;
    const points = timeframe === '1D' ? 78 : timeframe === '1W' ? 168 : 30;
    const interval = timeframe === '1D' ? 5 * 60 * 1000 : timeframe === '1W' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const now = Date.now();
    const timeBlock = Math.floor(now / (1000 * 60 * 60));
    const seed = generateSeed(code + timeframe, timeBlock);
    const rng = seededRandom(seed);

    const data: PricePoint[] = [];

    let currentPrice = targetPrice;
    const tempPoints: { close: number; open: number; high: number; low: number; volume: number }[] = [];

    for (let i = 0; i < points; i++) {
        const volatility = (rng() - 0.5) * (targetPrice * 0.02);
        const trend = (targetPrice * 0.0005);

        const prevPrice = currentPrice - volatility - trend;

        tempPoints.unshift({
            close: currentPrice,
            open: prevPrice,
            high: Math.max(prevPrice, currentPrice) + rng() * 0.5,
            low: Math.min(prevPrice, currentPrice) - rng() * 0.5,
            volume: Math.floor(rng() * 1000000) + 500000,
        });

        currentPrice = prevPrice;
    }

    for (let i = 0; i < points; i++) {
        const timestamp = new Date(now - (points - i - 1) * interval).toISOString();
        const p = tempPoints[i];

        data.push({
            timestamp,
            close: Number(p.close.toFixed(2)),
            open: Number(p.open.toFixed(2)),
            high: Number(p.high.toFixed(2)),
            low: Number(p.low.toFixed(2)),
            volume: p.volume,
        });
    }

    return data;
}
