// ===========================
// Core Data Types
// ===========================

export interface PricePoint {
    timestamp: string;
    open?: number;
    high?: number;
    low?: number;
    close: number;
    volume?: number;
}

export interface NewsArticle {
    id: string;
    title: string;
    url: string;
    snippet: string;
    publishedAt: string;
    source: string;
    sentimentScore?: number; // -1 to 1
}

export interface SentimentSummary {
    score: number | null;
    label: 'bullish' | 'bearish' | 'neutral';
}

// ===========================
// API Response Types
// ===========================

export interface AssetDataResponse {
    data: PricePoint[];
    metadata: {
        symbol: string;
        timeframe: Timeframe;
        assetType: AssetType;
    };
}

export interface NewsResponse {
    articles: NewsArticle[];
    sentiment: SentimentSummary;
}

export interface AiAnalyzeRequest {
    assetType: AssetType;
    symbol?: string;
    timeframe: Timeframe;
    chartData: PricePoint[];
    news: NewsArticle[];
    question: string;
}

export interface AiAnalyzeResponse {
    answer: string;
}

// ===========================
// Enums and Union Types
// ===========================

export type AssetType = 'stock' | 'crypto' | 'metal';
export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export type CryptoSymbol = 'BTC' | 'ETH' | 'SOL' | 'BNB' | 'XRP' | 'ADA' | 'DOGE' | 'MATIC';
export type MetalSymbol = 'XAU' | 'XAG';
export type StockSymbol = string; // e.g., 'AAPL', 'TSLA', etc.

// ===========================
// Chat Types
// ===========================

export interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
    timestamp: string;
}

// ===========================
// Hook Return Types
// ===========================

export interface UseAssetDataResult {
    data: PricePoint[] | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
}

export interface UseNewsResult {
    articles: NewsArticle[];
    sentiment: SentimentSummary | null;
    isLoading: boolean;
    error: Error | null;
}

export interface UseAiAnalystResult {
    messages: ChatMessage[];
    sendQuestion: (question: string) => Promise<void>;
    isLoading: boolean;
    error: Error | null;
}
