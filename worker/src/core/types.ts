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
export type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

// Environment bindings interface
export interface Env {
    FINNHUB_API_KEY?: string;
    MASSIVE_API_KEY?: string;
    MARKETMIND_CACHE?: KVNamespace;
    MARKETAUX_API_TOKEN?: string;
    GOLD_API_KEY?: string;
    GEMINI_API_KEY?: string;
    COINGECKO_API_KEY?: string;
    WORKER_ENV?: string;
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
