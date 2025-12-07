// worker/src/integrations/binance.ts
// Binance Spot public API integration for crypto candles
// Docs: https://binance-docs.github.io/apidocs/spot/en/#kline-candlestick-data
// Public endpoint, no API key required

import type { Env, PricePoint, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

// Binance uses daily klines (1d interval)
const BINANCE_INTERVAL = '1d';

// Cache TTL: 60 seconds (well under Binance rate limits)
const BINANCE_CACHE_TTL = 60;

// Map our CryptoSymbol to Binance spot trading pairs against USDT
const BINANCE_SYMBOL_MAP: Record<string, string> = {
    BTC: 'BTCUSDT',
    ETH: 'ETHUSDT',
    SOL: 'SOLUSDT',
    BNB: 'BNBUSDT',
    XRP: 'XRPUSDT',
    ADA: 'ADAUSDT',
    DOGE: 'DOGEUSDT',
    MATIC: 'MATICUSDT',
};

// Map our Timeframe -> number of daily candles to request
// Note: Frontend labels may differ (e.g., "1D" param shows as "7D" in UI)
function candlesForTimeframe(timeframe: Timeframe): number {
    switch (timeframe) {
        case '1D': return 10;   // Shows 7 days (+ 3 buffer)
        case '1W': return 35;   // Shows ~1 month
        case '1M': return 95;   // Shows ~3 months
        case '3M': return 185;  // Shows ~6 months
        case '1Y': return 370;  // Shows ~1 year
        default: return 60;
    }
}

// Get Binance base URL (allow override for testing)
function getBinanceBaseUrl(env: Env): string {
    // Optional: use env.BINANCE_API_BASE if defined
    // For now, always use official Binance API
    return 'https://api.binance.com';
}

/**
 * Fetch crypto candles from Binance Spot API
 * 
 * @param symbol - Crypto symbol (e.g., 'BTC', 'ETH')
 * @param timeframe - Timeframe ('1D', '1W', '1M', '3M', '1Y')
 * @param env - Worker environment with KV cache
 * @returns Array of price points with OHLCV data
 */
export async function getBinanceCryptoCandles(
    symbol: string,
    timeframe: Timeframe,
    env: Env
): Promise<PricePoint[]> {
    const pair = BINANCE_SYMBOL_MAP[symbol];
    if (!pair) {
        throw new Error(`Unsupported Binance crypto symbol: ${symbol}`);
    }

    const limit = candlesForTimeframe(timeframe);
    const baseUrl = getBinanceBaseUrl(env);

    // Binance klines endpoint: /api/v3/klines
    const url = `${baseUrl}/api/v3/klines?symbol=${pair}&interval=${BINANCE_INTERVAL}&limit=${limit}`;

    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `binance:crypto:${pair}:${BINANCE_INTERVAL}:${limit}`;

    // Check cache first
    if (cache) {
        const cached = await cache.get<PricePoint[]>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[Binance/Crypto] Cache hit for ${symbol} ${timeframe}`);
            return cached.data;
        }
    }

    console.log(`[Binance/Crypto] Fetching ${symbol} (${pair}) timeframe=${timeframe}, limit=${limit}`);

    try {
        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Binance/Crypto] HTTP ${response.status} for ${url}`);
            console.error(`[Binance/Crypto] Error body:`, errorText);
            throw new Error(`Binance API error for ${pair}: HTTP ${response.status}`);
        }

        // Binance returns array of klines:
        // [
        //   [
        //     0: openTime (ms),
        //     1: open (string),
        //     2: high (string),
        //     3: low (string),
        //     4: close (string),
        //     5: volume (string),
        //     6: closeTime (ms),
        //     7: quoteAssetVolume,
        //     8: numberOfTrades,
        //     9: takerBuyBaseAssetVolume,
        //     10: takerBuyQuoteAssetVolume,
        //     11: ignore
        //   ],
        //   ...
        // ]
        const raw = (await response.json()) as any[];

        if (!raw || !Array.isArray(raw)) {
            throw new Error(`Binance returned invalid data for ${pair}`);
        }

        // Convert Binance klines to PricePoint format
        const candles: PricePoint[] = raw.map((kline) => {
            const openTimeMs = kline[0] as number;
            const open = parseFloat(kline[1]);
            const high = parseFloat(kline[2]);
            const low = parseFloat(kline[3]);
            const close = parseFloat(kline[4]);
            const volume = parseFloat(kline[5]);

            return {
                timestamp: new Date(openTimeMs).toISOString(),
                open,
                high,
                low,
                close,
                volume,
            };
        });

        if (candles.length === 0) {
            throw new Error(`Binance returned no klines for ${pair}`);
        }

        // Sort ascending by time (Binance should already return sorted, but ensure it)
        candles.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        // Cache the result
        if (cache) {
            await cache.set(cacheKey, candles, BINANCE_CACHE_TTL);
        }

        const latest = candles[candles.length - 1];
        console.log(`[Binance/Crypto] ${symbol}: ${candles.length} candles, latest close=$${latest.close.toFixed(2)}`);

        return candles;
    } catch (error) {
        console.error(`[Binance/Crypto] Fetch error for ${symbol}:`, error);

        // Try stale cache as fallback
        if (cache) {
            const staleData = await cache.getStale<PricePoint[]>(cacheKey);
            if (staleData) {
                console.warn(`[Binance/Crypto] Using stale cache for ${symbol} ${timeframe}`);
                return staleData;
            }
        }

        throw error;
    }
}

/**
 * Get current crypto quote (price, change, changePercent)
 * 
 * @param symbol - Crypto symbol (e.g., 'BTC', 'ETH')
 * @param env - Worker environment with KV cache
 * @returns Quote with price and 24h change
 */
export async function getBinanceCryptoQuote(
    symbol: string,
    env: Env
): Promise<{ price: number; change: number; changePercent: number }> {
    try {
        // Fetch recent candles to calculate quote
        const candles = await getBinanceCryptoCandles(symbol, '1D', env);

        if (candles.length < 2) {
            // Not enough data for change calculation
            const last = candles[candles.length - 1];
            return {
                price: Number(last.close.toFixed(2)),
                change: 0,
                changePercent: 0
            };
        }

        const latest = candles[candles.length - 1];
        const previous = candles[candles.length - 2];

        const price = latest.close;
        const change = price - previous.close;
        const changePercent = (change / previous.close) * 100;

        return {
            price: Number(price.toFixed(2)),
            change: Number(change.toFixed(2)),
            changePercent: Number(changePercent.toFixed(2)),
        };
    } catch (error) {
        console.error(`[Binance/Crypto] Failed to get quote for ${symbol}:`, error);
        return { price: 0, change: 0, changePercent: 0 };
    }
}
