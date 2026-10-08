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

export type AssetType = 'stock' | 'crypto' | 'metal';
export type Timeframe = '7D' | '1M' | '3M' | '6M' | '1Y';

// Environment bindings interface
export interface Env {
    /** Native Workers AI binding (wrangler `[ai] binding = "AI"`). */
    AI?: Ai;
    FINNHUB_API_KEY?: string;
    MASSIVE_API_KEY?: string;
    TWELVE_DATA_API_KEY?: string;
    MARKETMIND_CACHE?: KVNamespace;
    MARKETAUX_API_TOKEN?: string;
    GOLD_API_KEY?: string;
    COINGECKO_API_KEY?: string;
    WORKER_ENV?: string;
    /** Optional overrides validated in core/aiConfig.ts */
    AI_MODEL?: string;
    AI_MAX_COMPLETION_TOKENS?: string;
    AI_TEMPERATURE?: string;
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
        support?: number | null;
        resistance?: number | null;
        sentiment?: SentimentSummary; // Sentiment from Marketaux news analysis
        sentimentError?: string; // Error message if sentiment fetch failed
    };
}

export interface NewsResponse {
    articles: NewsArticle[];
    sentiment: SentimentSummary;
}
