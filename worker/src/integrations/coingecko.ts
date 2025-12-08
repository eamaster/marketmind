// worker/src/integrations/coingecko.ts
// CoinGecko API integration for crypto OHLC candles
// Docs: https://docs.coingecko.com/v3.0.1/reference/coins-id-ohlc
// Using Demo API with API key authentication

import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Cache TTL: 2 minutes (safe vs 30 calls/min & 10k/month limits)
const COINGECKO_CACHE_TTL = 120;

/**
 * Normalize crypto symbol to canonical form
 * Handles legacy formats: ETH_USD, ETHUSDT, ETH/USD -> ETH
 */
function normalizeCryptoSymbol(symbol: string): string {
    if (!symbol) return symbol;

    // Uppercase for consistency
    let s = symbol.toUpperCase().trim();

    // Strip common quote suffixes
    if (s.endsWith('_USD')) s = s.slice(0, -4);
    if (s.endsWith('/USD')) s = s.slice(0, -4);
    if (s.endsWith('USD')) s = s.slice(0, -3);
    if (s.endsWith('USDT')) s = s.slice(0, -4);

    // Remove any leftover separators
    s = s.replace(/[^A-Z0-9]/g, '');

    return s;
}

// Map our CryptoSymbol to CoinGecko coin ID (API identifier)
// IDs from CoinGecko API documentation
const COINGECKO_ID_MAP: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    SOL: 'solana',
    BNB: 'binancecoin',
    XRP: 'ripple',
    ADA: 'cardano',
    DOGE: 'dogecoin',
    MATIC: 'polygon-ecosystem-token', // Updated from 'matic-network' to POL (ex-MATIC)
};

// Map our Timeframe -> number of days for OHLC endpoint
// CoinGecko OHLC supports: 7, 30, 90, 180, 365 days max
function daysForTimeframe(timeframe: Timeframe): number {
    switch (timeframe) {
        case '1D': return 7;    // Shows 7 days (7D in UI)
        case '1W': return 30;   // Shows ~1 month
        case '1M': return 90;   // Shows ~3 months
        case '3M': return 180;  // Shows ~6 months
        case '1Y': return 365;  // Shows ~1 year
        default: return 30;
    }
}

/**
 * Fetch price history from CoinGecko market_chart endpoint (fallback when OHLC unavailable)
 * Endpoint: /coins/{id}/market_chart
 * Returns: Synthetic PricePoint array from price data
 */
async function fetchCoinGeckoPriceHistory(
    id: string,
    days: number,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.COINGECKO_API_KEY;
    if (!apiKey) {
        throw new Error('COINGECKO_API_KEY not configured');
    }

    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `coingecko:price-history:${id}:usd:${days}`;

    // Check cache first
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[CoinGecko/PriceHistory] Cache hit for ${id} days=${days}`);
            return cached.data;
        }
    }

    const url = `${COINGECKO_BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}&interval=daily`;
    console.log(`[CoinGecko/PriceHistory] Fetching ${id} for ${days} days (fallback mode)`);

    try {
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'x-cg-demo-api-key': apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[CoinGecko/PriceHistory] HTTP ${response.status} for ${url}`);
            console.error(`[CoinGecko/PriceHistory] Error body:`, errorText);
            throw new Error(`CoinGecko market_chart error for ${id}: HTTP ${response.status}`);
        }

        // CoinGecko market_chart returns: { prices: [[timestamp_ms, price], ...], ... }
        const raw = await response.json() as { prices?: number[][] };

        if (!raw || !Array.isArray(raw.prices) || raw.prices.length === 0) {
            throw new Error(`CoinGecko returned no price history for ${id}`);
        }

        // Convert price data to synthetic PricePoint format (price-only, no real OHLC)
        const pricePoints: PricePoint[] = raw.prices.map(([tsMs, price]) => {
            return {
                timestamp: new Date(tsMs).toISOString(),
                open: Number(price),   // Synthetic: use price for all OHLC
                high: Number(price),
                low: Number(price),
                close: Number(price),
                volume: 0, // No volume data in market_chart
            };
        });

        // Sort ascending by timestamp
        pricePoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Cache the result
        if (cache) {
            await cache.set(cacheKey, pricePoints, COINGECKO_CACHE_TTL);
        }

        const latest = pricePoints[pricePoints.length - 1];
        console.warn(`[CoinGecko/PriceHistory] ${id}: ${pricePoints.length} price points (OHLC unavailable), latest close=$${latest.close.toFixed(2)}`);

        return pricePoints;
    } catch (error) {
        console.error(`[CoinGecko/PriceHistory] Fetch error for ${id}:`, error);

        // Try stale cache as fallback
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[CoinGecko/PriceHistory] Using stale cache for ${id} days=${days}`);
                return staleData;
            }
        }

        throw error;
    }
}

/**
 * Fetch OHLC candles from CoinGecko
 * Endpoint: /coins/{id}/ohlc
 * Returns: Array of [timestamp_ms, open, high, low, close]
 */
async function fetchCoinGeckoOhlc(
    id: string,
    days: number,
    env: Env
): Promise<PricePoint[]> {
    const apiKey = env.COINGECKO_API_KEY;
    if (!apiKey) {
        throw new Error('COINGECKO_API_KEY not configured');
    }

    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `coingecko:ohlc:${id}:usd:${days}`;

    // Check cache first
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[CoinGecko/OHLC] Cache hit for ${id} days=${days}`);
            return cached.data;
        }
    }

    const url = `${COINGECKO_BASE_URL}/coins/${id}/ohlc?vs_currency=usd&days=${days}`;
    console.log(`[CoinGecko/OHLC] Fetching ${id} for ${days} days`);

    try {
        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'x-cg-demo-api-key': apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[CoinGecko/OHLC] HTTP ${response.status} for ${url}`);
            console.error(`[CoinGecko/OHLC] Error body:`, errorText);
            throw new Error(`CoinGecko OHLC error for ${id}: HTTP ${response.status}`);
        }

        // CoinGecko OHLC returns: [[timestamp_ms, open, high, low, close], ...]
        const raw = (await response.json()) as number[][];

        if (!raw || !Array.isArray(raw)) {
            throw new Error(`CoinGecko returned invalid data for ${id}`);
        }

        // Convert to PricePoint format
        const candles: PricePoint[] = raw.map((row) => {
            const [tsMs, open, high, low, close] = row;
            return {
                timestamp: new Date(tsMs).toISOString(),
                open: Number(open),
                high: Number(high),
                low: Number(low),
                close: Number(close),
                volume: 0, // OHLC endpoint doesn't include volume
            };
        });

        // Empty OHLC is not an error - fallback will handle it
        if (candles.length === 0) {
            console.warn(`[CoinGecko/OHLC] Empty OHLC data for ${id}, will use price history fallback`);
            return []; // Return empty array to signal fallback needed
        }

        // Sort ascending by timestamp
        candles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Cache the result
        if (cache) {
            await cache.set(cacheKey, candles, COINGECKO_CACHE_TTL);
        }

        const latest = candles[candles.length - 1];
        console.log(`[CoinGecko/OHLC] ${id}: ${candles.length} candles, latest close=$${latest.close.toFixed(2)}`);

        return candles;
    } catch (error) {
        console.error(`[CoinGecko/OHLC] Fetch error for ${id}:`, error);

        // Try stale cache as fallback
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[CoinGecko/OHLC] Using stale cache for ${id} days=${days}`);
                return staleData;
            }
        }

        throw error;
    }
}

/**
 * Get crypto candles for MarketMind
 * Public API for /api/crypto route
 * Returns data and hasOhlc flag to indicate whether full OHLC or price-only data
 */
export async function getCoinGeckoCryptoCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<{ data: PricePoint[]; hasOhlc: boolean }> {
    const normalized = normalizeCryptoSymbol(symbol);
    const id = COINGECKO_ID_MAP[normalized];

    if (!id) {
        console.error(`[CoinGecko/Crypto] Unsupported crypto symbol: ${symbol} (normalized: ${normalized})`);
        throw new Error(`Unsupported crypto symbol for CoinGecko: ${symbol}`);
    }

    const days = daysForTimeframe(timeframe);

    // Try OHLC first
    console.log(`[CoinGecko/Crypto] Attempting OHLC fetch for ${symbol} (${id})`);
    const ohlcData = await fetchCoinGeckoOhlc(id, days, env);

    // If OHLC has data, return it
    if (ohlcData.length > 0) {
        console.log(`[CoinGecko/Crypto] OHLC data available for ${symbol}`);
        return { data: ohlcData, hasOhlc: true };
    }

    // Fallback to price history when OHLC is empty
    console.warn(`[CoinGecko/Crypto] OHLC unavailable for ${symbol}, falling back to price history`);
    const priceData = await fetchCoinGeckoPriceHistory(id, days, env);
    return { data: priceData, hasOhlc: false };
}

/**
 * Get current crypto quote (price, change, changePercent)
 * Derived from OHLC candles
 */
export async function getCoinGeckoCryptoQuote(
    symbol: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    try {
        // Use 7 days (timeframe '1D') for quote calculation
        const { data: candles } = await getCoinGeckoCryptoCandles(symbol, '1D', env);

        if (candles.length < 2) {
            const last = candles[candles.length - 1];
            return {
                price: Number(last.close.toFixed(2)),
                change: 0,
                changePercent: 0,
            };
        }

        const latest = candles[candles.length - 1];
        const prev = candles[candles.length - 2];

        const price = latest.close;
        const change = price - prev.close;
        const changePercent = (change / prev.close) * 100;

        return {
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
        };
    } catch (error) {
        console.error(`[CoinGecko] Failed to get quote for ${symbol}:`, error);
        return { price: 0, change: 0, changePercent: 0 };
    }
}
