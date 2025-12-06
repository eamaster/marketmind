// worker/src/integrations/goldApi.ts
// Gold-API.com integration with proper gram-to-ounce conversion
import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

const GOLDAPI_CACHE_TTL = 3600; // 1 hour

export async function getGoldPrice(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.GOLD_API_KEY;

    if (!apiKey) {
        throw new Error('GOLD_API_KEY not configured');
    }

    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `goldapi:${symbol}:${timeframe}`;

    // Check cache first
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[Gold-API] Cache hit for ${symbol} ${timeframe}`);
            return cached.data;
        }
    }

    try {
        const data = await fetchGoldApiHistory(symbol, timeframe, apiKey);

        if (cache) {
            await cache.set(cacheKey, data, GOLDAPI_CACHE_TTL);
        }

        console.log(`[Gold-API] Success for ${symbol} ${timeframe} - ${data.length} candles`);
        return data;
    } catch (error) {
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[Gold-API] Using stale cache for ${symbol} ${timeframe}`);
                return staleData;
            }
        }
        throw error;
    }
}

async function fetchGoldApiHistory(
    symbol: string,
    timeframe: Timeframe,
    apiKey: string
): Promise<PricePoint[]> {
    const { startDate, endDate, totalDays } = getDateRange(timeframe);

    console.log(`[Gold-API] Fetching ${symbol} from ${startDate} to ${endDate} (${totalDays} days)`);

    // Sample 8 dates to stay within quota
    const dates = sampleDates(startDate, endDate, totalDays, 8);
    const candles: PricePoint[] = [];

    console.log(`[Gold-API] Sampling ${dates.length} dates`);

    for (const date of dates) {
        try {
            const formattedDate = date.replace(/-/g, '');
            const url = `https://api.gold-api.com/history/${apiKey}/${symbol}/${formattedDate}`;

            console.log(`[Gold-API] Fetching ${symbol} for ${date}`);

            const response = await fetch(url);

            if (!response.ok) {
                console.warn(`[Gold-API] HTTP ${response.status} for ${date}`);
                continue;
            }

            const data = await response.json() as {
                timestamp?: number;
                metal: string;
                currency: string;
                price: number;
                price_gram_24k: number;
            };

            console.log(`[Gold-API] Response for ${date}:`, JSON.stringify(data));

            // CRITICAL FIX: Gold-API returns price per GRAM
            // We need to convert to price per TROY OUNCE
            let pricePerOz: number;

            if (data.price && data.price > 0) {
                // If 'price' exists and is reasonable (>$1000 for gold, >$10 for silver)
                if (symbol === 'XAU' && data.price > 1000) {
                    pricePerOz = data.price; // Already per ounce
                } else if (symbol === 'XAG' && data.price > 10) {
                    pricePerOz = data.price; // Already per ounce
                } else if (data.price_gram_24k && data.price_gram_24k > 0) {
                    // Convert from gram to troy ounce (1 troy oz = 31.1035 grams)
                    pricePerOz = data.price_gram_24k * 31.1035;
                } else {
                    // Fallback: assume 'price' is per gram
                    pricePerOz = data.price * 31.1035;
                }
            } else if (data.price_gram_24k && data.price_gram_24k > 0) {
                // Use price_gram_24k and convert
                pricePerOz = data.price_gram_24k * 31.1035;
            } else {
                console.warn(`[Gold-API] No valid price for ${symbol} on ${date}`);
                continue;
            }

            // Sanity check: Gold should be $1000-$5000, Silver $10-$100
            if (symbol === 'XAU' && (pricePerOz < 1000 || pricePerOz > 10000)) {
                console.warn(`[Gold-API] Price out of range for gold: $${pricePerOz}`);
                continue;
            }
            if (symbol === 'XAG' && (pricePerOz < 10 || pricePerOz > 200)) {
                console.warn(`[Gold-API] Price out of range for silver: $${pricePerOz}`);
                continue;
            }

            candles.push({
                timestamp: new Date(`${date}T00:00:00Z`).toISOString(),
                open: pricePerOz,
                high: pricePerOz,
                low: pricePerOz,
                close: pricePerOz,
                volume: 0,
            });

            console.log(`[Gold-API] ${symbol} ${date}: $${pricePerOz.toFixed(2)}`);

            // Rate limit: 500ms delay
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
            console.error(`[Gold-API] Error for ${date}:`, error);
        }
    }

    if (candles.length === 0) {
        throw new Error(`No candles returned for ${symbol}`);
    }

    const lastCandle = candles[candles.length - 1];
    console.log(`[Gold-API] ${symbol}: ${candles.length} candles, Latest: $${lastCandle.close.toFixed(2)}`);

    return candles;
}

function getDateRange(timeframe: Timeframe): { startDate: string; endDate: string; totalDays: number } {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    let daysBack = 7;
    switch (timeframe) {
        case '1D': daysBack = 10; break;
        case '1W': daysBack = 30; break;
        case '1M': daysBack = 90; break;
        case '3M': daysBack = 180; break;
        case '1Y': daysBack = 365; break;
    }

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - daysBack);

    return {
        startDate: formatDate(startDate),
        endDate: formatDate(today),
        totalDays: daysBack,
    };
}

function sampleDates(start: string, end: string, totalDays: number, maxSamples: number): string[] {
    const interval = Math.ceil(totalDays / maxSamples);
    const dates: string[] = [];
    const current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + interval);
    }

    const endDateStr = end;
    if (dates[dates.length - 1] !== endDateStr) {
        dates.push(endDateStr);
    }

    return dates.slice(0, maxSamples);
}

export async function getGoldQuote(
    symbol: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    try {
        const data = await getGoldPrice(symbol, '1D', env);

        if (data.length < 2) {
            throw new Error('Insufficient data for quote calculation');
        }

        const latestCandle = data[data.length - 1];
        const previousCandle = data[data.length - 2];

        const price = latestCandle.close;
        const change = price - previousCandle.close;
        const changePercent = (change / previousCandle.close) * 100;

        return {
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
        };
    } catch (error) {
        console.error(`[Gold-API] Failed to get quote for ${symbol}:`, error);
        return { price: 0, change: 0, changePercent: 0 };
    }
}
