import type { AssetType, OilCode, MetalSymbol, StockSymbol, Timeframe } from '../services/types';

// ===========================
// Supported Assets Configuration
// ===========================

export const STOCK_SYMBOLS: StockSymbol[] = [
    'AAPL',  // Apple
    'TSLA',  // Tesla
    'NVDA',  // NVIDIA
    'MSFT',  // Microsoft
    'GOOGL', // Alphabet
    'AMZN',  // Amazon
    'META',  // Meta
];

export const OIL_CODES: OilCode[] = [
    'WTI_USD',   // West Texas Intermediate
    'BRENT_USD', // Brent Crude
];

export const METAL_SYMBOLS: MetalSymbol[] = [
    'XAU', // Gold
    'XAG', // Silver
];

// ===========================
// Timeframe Configurations
// ===========================

export const DEFAULT_TIMEFRAME: Timeframe = '1D';

export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
    '1D': '1 Day',
    '1W': '1 Week',
    '1M': '1 Month',
};

// Map timeframes to data resolution/granularity hints
export const TIMEFRAME_RESOLUTIONS: Record<Timeframe, string> = {
    '1D': '5min',  // 5-minute intervals for 1 day
    '1W': '1hour', // 1-hour intervals for 1 week
    '1M': '1day',  // Daily intervals for 1 month
};

// ===========================
// Default Selections
// ===========================

export const DEFAULT_STOCK: StockSymbol = 'AAPL';
export const DEFAULT_OIL: OilCode = 'WTI_USD';
export const DEFAULT_METAL: MetalSymbol = 'XAU';

// ===========================
// Display Names
// ===========================

export const ASSET_DISPLAY_NAMES: Record<string, string> = {
    // Stocks
    AAPL: 'Apple Inc.',
    TSLA: 'Tesla Inc.',
    NVDA: 'NVIDIA Corp.',
    MSFT: 'Microsoft Corp.',
    GOOGL: 'Alphabet Inc.',
    AMZN: 'Amazon.com Inc.',
    META: 'Meta Platforms Inc.',

    // Oil
    WTI_USD: 'WTI Crude Oil',
    BRENT_USD: 'Brent Crude Oil',

    // Metals
    XAU: 'Gold',
    XAG: 'Silver',
};
