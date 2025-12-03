// Worker-side TypeScript types mirroring frontend types

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
    sentimentScore?: number;
}

export interface SentimentSummary {
    score: number | null;
    label: 'bullish' | 'bearish' | 'neutral';
}

export type AssetType = 'stock' | 'oil' | 'metal';
export type Timeframe = '1D' | '1W' | '1M';

// Environment bindings interface
export interface Env {
    OILPRICE_API_KEY?: string;
    GOLD_API_KEY?: string;
    FINNHUB_API_KEY?: string; // Keep for quotes
    ALPHAVANTAGE_API_KEY?: string; // NEW: For candles
    MARKETAUX_API_TOKEN?: string;
    GEMINI_API_KEY?: string;
    WORKER_ENV?: string;
    MARKETMIND_CACHE?: KVNamespace;
}

// API Request/Response types
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
