import type { Env, PricePoint, Timeframe } from '../core/types';

// OilPriceAPI client
// Docs: https://www.oilpriceapi.com/documentation

export async function getOilPrice(
    code: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.OILPRICE_API_KEY;

    if (!apiKey) {
        console.warn('OILPRICE_API_KEY not configured, returning mock data');
        return getMockOilData(code, timeframe);
    }

    try {
        // For now, fetch latest price
        // TODO: Implement historical time series based on timeframe
        const response = await fetch(`https://api.oilpriceapi.com/v1/prices/latest`, {
            headers: {
                'Authorization': `Token ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`OilPriceAPI error: ${response.statusText}`);
        }

        const data = await response.json();

        // Normalize response to PricePoint format
        // API structure: { data: { price: number, formatted: string, currency: string, code: string } }
        return normalizeOilPriceData(data, code);
    } catch (error) {
        console.error('OilPrice API error:', error);
        // Fallback to mock data
        return getMockOilData(code, timeframe);
    }
}

function normalizeOilPriceData(apiData: any, code: string): PricePoint[] {
    // Extract price for the requested code
    if (!apiData?.data) {
        return [];
    }

    const price = apiData.data.price || 75.5;
    const now = new Date().toISOString();

    // Return single current price point
    // TODO: Parse historical data when available
    return [{
        timestamp: now,
        close: price,
    }];
}

function getMockOilData(code: string, timeframe: Timeframe): PricePoint[] {
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
