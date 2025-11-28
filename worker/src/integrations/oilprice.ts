import type { Env, PricePoint, Timeframe } from '../core/types';

// OilPriceAPI client
// Docs: https://docs.oilpriceapi.com/

export async function getOilPrice(
    code: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.OILPRICE_API_KEY;

    if (!apiKey) {
        console.warn('[OilPrice] No API key configured, using mock data');
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

function getMockOilData(code: string, timeframe: Timeframe): PricePoint[] {
    console.log(`[OilPrice] Generating ${timeframe} mock data for ${code}`);

    const basePrice = code === 'WTI_USD' ? 75.5 : 78.2;
    const points = timeframe === '1D' ? 78 : timeframe === '1W' ? 168 : 30;
    const interval = timeframe === '1D' ? 5 * 60 * 1000 : timeframe === '1W' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const now = Date.now();
    const data: PricePoint[] = [];

    for (let i = 0; i < points; i++) {
        const timestamp = new Date(now - (points - i - 1) * interval).toISOString();
        const volatility = (Math.random() - 0.5) * 2;
        const trend = i * 0.01;
        const close = basePrice + volatility + trend;

        data.push({
            timestamp,
            close: Number(close.toFixed(2)),
            open: Number((close + (Math.random() - 0.5) * 0.5).toFixed(2)),
            high: Number((close + Math.random() * 0.5).toFixed(2)),
            low: Number((close - Math.random() * 0.5).toFixed(2)),
        });
    }

    return data;
}
