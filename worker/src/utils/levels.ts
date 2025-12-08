import type { PricePoint } from '../core/types';

export interface KeyLevels {
    support: number | null;
    resistance: number | null;
}

/**
 * Compute support and resistance levels from price candles
 * Uses lows for support, highs for resistance
 * @param candles Array of OHLC price candles
 * @returns Object with support and resistance levels
 */
export function computeSupportResistance(candles: PricePoint[]): KeyLevels {
    if (!candles || candles.length === 0) {
        return { support: null, resistance: null };
    }

    // Use last 20 candles for more recent support/resistance
    const recentCandles = candles.length > 20 ? candles.slice(-20) : candles;

    // Extract lows and highs, fallback to close if not available
    const lows = recentCandles.map(c => c.low ?? c.close);
    const highs = recentCandles.map(c => c.high ?? c.close);

    // Support is the minimum of recent lows
    const support = Math.min(...lows);

    // Resistance is the maximum of recent highs
    const resistance = Math.max(...highs);

    console.log(`[Levels] Computed from ${recentCandles.length} candles: support=$${support.toFixed(2)}, resistance=$${resistance.toFixed(2)}`);

    return { support, resistance };
}
