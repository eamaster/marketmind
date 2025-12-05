import type { CryptoSymbol, MetalSymbol, StockSymbol, Timeframe } from '../services/types';

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

export const CRYPTO_SYMBOLS: CryptoSymbol[] = [
    'BTC',   // Bitcoin
    'ETH',   // Ethereum
    'SOL',   // Solana
    'BNB',   // Binance Coin
    'XRP',   // Ripple
    'ADA',   // Cardano
    'DOGE',  // Dogecoin
    'MATIC', // Polygon
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
    '1D': '7 Days',
    '1W': '1 Month',
    '1M': '3 Months',
    '3M': '6 Months',
    '1Y': '1 Year',
};

// Map timeframes to data resolution/granularity hints
// Note: Massive.com free tier only provides END-OF-DAY data
export const TIMEFRAME_RESOLUTIONS: Record<Timeframe, string> = {
    '1D': '1day',  // Daily candles for 5 trading days
    '1W': '1day',  // Daily candles for ~21 trading days
    '1M': '1day',  // Daily candles for ~63 trading days
    '3M': '1day',  // Daily candles for ~126 trading days
    '1Y': '1day',  // Daily candles for ~252 trading days
};

// ===========================
// Default Selections
// ===========================

export const DEFAULT_STOCK: StockSymbol = 'AAPL';
export const DEFAULT_CRYPTO: CryptoSymbol = 'BTC';
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

    // Crypto
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    SOL: 'Solana',
    BNB: 'Binance Coin',
    XRP: 'Ripple',
    ADA: 'Cardano',
    DOGE: 'Dogecoin',
    MATIC: 'Polygon',

    // Metals
    XAU: 'Gold',
    XAG: 'Silver',
};
