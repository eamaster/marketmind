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
    MATIC: 'matic-network',
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

        if (candles.length === 0) {
            throw new Error(`CoinGecko returned no OHLC data for ${id}`);
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
 */
export async function getCoinGeckoCryptoCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const normalized = normalizeCryptoSymbol(symbol);
    const id = COINGECKO_ID_MAP[normalized];

    if (!id) {
        console.error(`[CoinGecko/Crypto] Unsupported crypto symbol: ${symbol} (normalized: ${normalized})`);
        throw new Error(`Unsupported crypto symbol for CoinGecko: ${symbol}`);
    }

    const days = daysForTimeframe(timeframe);
    return fetchCoinGeckoOhlc(id, days, env);
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
        const candles = await getCoinGeckoCryptoCandles(symbol, '1D', env);

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
