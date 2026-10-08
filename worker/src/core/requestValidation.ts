import type { AiAnalyzeRequest, AssetType, NewsArticle, PricePoint, Timeframe } from './types';

/**
 * Practical request bounds derived from current MarketMind behavior:
 * - Chat inputs are short suggested questions / free text (UI ~200 chars; allow headroom).
 * - Charts are daily/candles for up to 1Y (~250 trading days; allow crypto denser series).
 * - Prompt uses at most 5 news items; accept a modest client buffer.
 * - Symbols are tickers like AAPL / BTC / XAU (short identifiers).
 */
export const AI_REQUEST_LIMITS = {
    maxQuestionLength: 500,
    maxSymbolLength: 32,
    maxChartPoints: 1000,
    maxNewsArticles: 50,
    minClose: Number.MIN_VALUE, // must be finite and > 0 for % / volatility math
} as const;

const ASSET_TYPES: readonly AssetType[] = ['stock', 'crypto', 'metal'];
const TIMEFRAMES: readonly Timeframe[] = ['7D', '1M', '3M', '6M', '1Y'];

export class AiRequestValidationError extends Error {
    readonly status = 400;

    constructor(message: string) {
        super(message);
        this.name = 'AiRequestValidationError';
    }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePricePoint(point: unknown, index: number): PricePoint {
    if (!isPlainObject(point)) {
        throw new AiRequestValidationError(`chartData[${index}] must be an object`);
    }
    if (typeof point.timestamp !== 'string' || !point.timestamp.trim()) {
        throw new AiRequestValidationError(`chartData[${index}].timestamp must be a non-empty string`);
    }
    if (typeof point.close !== 'number' || !Number.isFinite(point.close)) {
        throw new AiRequestValidationError(`chartData[${index}].close must be a finite number`);
    }
    if (point.close <= 0) {
        throw new AiRequestValidationError(
            `chartData[${index}].close must be > 0 (invalid for percentage/volatility calculations)`
        );
    }
    for (const key of ['open', 'high', 'low', 'volume'] as const) {
        const value = point[key];
        if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value))) {
            throw new AiRequestValidationError(`chartData[${index}].${key} must be a finite number when present`);
        }
    }
    return point as unknown as PricePoint;
}

function validateNewsArticle(article: unknown, index: number): NewsArticle {
    if (!isPlainObject(article)) {
        throw new AiRequestValidationError(`news[${index}] must be an object`);
    }
    for (const key of ['id', 'title', 'url', 'snippet', 'publishedAt', 'source'] as const) {
        if (typeof article[key] !== 'string') {
            throw new AiRequestValidationError(`news[${index}].${key} must be a string`);
        }
    }
    if (
        article.sentimentScore !== undefined &&
        article.sentimentScore !== null &&
        (typeof article.sentimentScore !== 'number' || !Number.isFinite(article.sentimentScore))
    ) {
        throw new AiRequestValidationError(`news[${index}].sentimentScore must be a finite number when present`);
    }
    return article as unknown as NewsArticle;
}

/**
 * Validate and normalize the AI analyze JSON body.
 * Rejects malformed payloads with 400 before prompt/cache/inference work.
 */
export function validateAiAnalyzeRequest(raw: unknown): AiAnalyzeRequest {
    if (!isPlainObject(raw)) {
        throw new AiRequestValidationError('Request body must be a JSON object');
    }

    const { assetType, symbol, timeframe, chartData, news, question } = raw;

    if (typeof assetType !== 'string' || !ASSET_TYPES.includes(assetType as AssetType)) {
        throw new AiRequestValidationError('assetType must be one of: stock, crypto, metal');
    }

    if (typeof timeframe !== 'string' || !TIMEFRAMES.includes(timeframe as Timeframe)) {
        throw new AiRequestValidationError('timeframe must be one of: 7D, 1M, 3M, 6M, 1Y');
    }

    let normalizedSymbol: string | undefined;
    if (symbol !== undefined && symbol !== null) {
        if (typeof symbol !== 'string') {
            throw new AiRequestValidationError('symbol must be a string when provided');
        }
        const trimmed = symbol.trim();
        if (trimmed.length === 0 || trimmed.length > AI_REQUEST_LIMITS.maxSymbolLength) {
            throw new AiRequestValidationError(
                `symbol length must be 1–${AI_REQUEST_LIMITS.maxSymbolLength} characters`
            );
        }
        if (!/^[A-Za-z0-9.\/_-]+$/.test(trimmed)) {
            throw new AiRequestValidationError('symbol contains unsupported characters');
        }
        normalizedSymbol = trimmed;
    }

    if (typeof question !== 'string') {
        throw new AiRequestValidationError('question must be a string');
    }
    const normalizedQuestion = question.trim();
    if (!normalizedQuestion) {
        throw new AiRequestValidationError('question must be a non-empty string');
    }
    if (normalizedQuestion.length > AI_REQUEST_LIMITS.maxQuestionLength) {
        throw new AiRequestValidationError(
            `question must be at most ${AI_REQUEST_LIMITS.maxQuestionLength} characters`
        );
    }

    if (!Array.isArray(chartData)) {
        throw new AiRequestValidationError('chartData must be an array');
    }
    if (chartData.length > AI_REQUEST_LIMITS.maxChartPoints) {
        throw new AiRequestValidationError(
            `chartData must have at most ${AI_REQUEST_LIMITS.maxChartPoints} points`
        );
    }
    const normalizedChart = chartData.map(validatePricePoint);

    if (!Array.isArray(news)) {
        throw new AiRequestValidationError('news must be an array');
    }
    if (news.length > AI_REQUEST_LIMITS.maxNewsArticles) {
        throw new AiRequestValidationError(
            `news must have at most ${AI_REQUEST_LIMITS.maxNewsArticles} articles`
        );
    }
    const normalizedNews = news.map(validateNewsArticle);

    return {
        assetType: assetType as AssetType,
        symbol: normalizedSymbol,
        timeframe: timeframe as Timeframe,
        chartData: normalizedChart,
        news: normalizedNews,
        question: normalizedQuestion,
    };
}
