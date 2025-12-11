import type { Env, NewsArticle, SentimentSummary, AssetType, Timeframe } from '../core/types';
import { KVCache } from '../core/cache';

// Marketaux news API client
// Docs: https://www.marketaux.com/documentation

// Map crypto ticker symbols to full names for better news matching
const CRYPTO_NAMES: Record<string, string> = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'USDT': 'Tether',
    'BNB': 'Binance Coin',
    'SOL': 'Solana',
    'ADA': 'Cardano',
    'XRP': 'Ripple',
    'DOGE': 'Dogecoin',
    'MATIC': 'Polygon',
};

export async function getNews(
    assetType: AssetType,
    symbol: string | undefined,
    timeframe: Timeframe,
    env: Env
): Promise<{ articles: NewsArticle[]; sentiment: SentimentSummary }> {
    // Initialize cache
    const cache = env.MARKETMIND_CACHE ? new KVCache(env.MARKETMIND_CACHE) : null;
    const cacheKey = `sentiment:${assetType}:${symbol || 'all'}:${timeframe}`;
    const CACHE_TTL = 3600; // 1 hour (sentiment changes slowly)

    // Check cache first
    if (cache) {
        const cached = await cache.get<{ articles: NewsArticle[]; sentiment: SentimentSummary }>(cacheKey);
        if (cached && !cached.isStale) {
            console.log(`[Marketaux] ✅ Cache HIT for ${assetType} ${symbol || ''} (${timeframe})`);
            return cached.data;
        }
        if (cached && cached.isStale) {
            console.log(`[Marketaux] ⏰ Cache STALE for ${assetType} ${symbol || ''} (${timeframe})`);
        }
    }

    const apiToken = env.MARKETAUX_API_TOKEN;

    if (!apiToken) {
        console.warn('[Marketaux] No API token configured, using mock data');
        return getMockNews(assetType, symbol);
    }

    try {
        const url = buildNewsUrl(assetType, symbol, timeframe, apiToken);
        console.log(`[Marketaux] 🌐 API call for ${assetType} ${symbol || ''} (${timeframe})`);
        console.log(`[Marketaux] URL: ${url.toString().replace(apiToken, 'API_TOKEN')}`);

        const response = await fetch(url.toString());
        console.log(`[Marketaux] Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Marketaux] API error:', response.status, response.statusText, errorText);
            throw new Error(`Marketaux API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { data?: any[] };
        console.log(`[Marketaux] Received ${data?.data?.length || 0} articles`);
        const normalized = normalizeNewsData(data);
        console.log(`[Marketaux] Normalized ${normalized.articles.length} articles, sentiment: ${normalized.sentiment.label}`);

        // Store in cache
        if (cache) {
            await cache.set(cacheKey, normalized, CACHE_TTL);
            console.log(`[Marketaux] 💾 Cached result for ${assetType} ${symbol || ''} (TTL: ${CACHE_TTL}s)`);
        }

        return normalized;
    } catch (error) {
        console.error('[Marketaux] Error fetching data:', error);

        // Try stale cache as fallback
        if (cache) {
            const stale = await cache.getStale<{ articles: NewsArticle[]; sentiment: SentimentSummary }>(cacheKey);
            if (stale) {
                console.warn('[Marketaux] ⚠️ Using STALE cache due to API error');
                return stale;
            }
        }

        console.warn('[Marketaux] Falling back to mock data');
        return getMockNews(assetType, symbol);
    }
}

function buildNewsUrl(assetType: AssetType, symbol: string | undefined, timeframe: Timeframe, apiToken: string): URL {
    const url = new URL('https://api.marketaux.com/v1/news/all');

    url.searchParams.set('api_token', apiToken);
    url.searchParams.set('language', 'en');
    url.searchParams.set('limit', '10');
    url.searchParams.set('must_have_entities', 'true');
    url.searchParams.set('filter_entities', 'true');
    url.searchParams.set('group_similar', 'true');

    // Sort by most recent first
    url.searchParams.set('sort', 'published_at');
    url.searchParams.set('sort_order', 'desc');

    // Add date filter based on timeframe to get recent news only
    const now = new Date();
    let publishedAfter: Date;

    switch (timeframe) {
        case '7D':
            // Get news from last 7 days
            publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case '1M':
            // Get news from last 30 days
            publishedAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case '3M':
            // Get news from last 90 days
            publishedAfter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
        case '6M':
            // Get news from last 180 days
            publishedAfter = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
            break;
        case '1Y':
            // Get news from last 365 days
            publishedAfter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
        default:
            publishedAfter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Format date as YYYY-MM-DD (API accepts this format)
    const dateStr = publishedAfter.toISOString().split('T')[0];
    url.searchParams.set('published_after', dateStr);

    console.log(`[Marketaux] Filtering news published after: ${dateStr}`);

    // Build query based on asset type
    if (assetType === 'stock' && symbol) {
        url.searchParams.set('symbols', symbol);
    } else if (assetType === 'crypto' && symbol) {
        // Use full cryptocurrency name for better news matching
        const cryptoName = CRYPTO_NAMES[symbol.toUpperCase()] || symbol;
        url.searchParams.set('search', `${cryptoName} OR ${symbol} OR cryptocurrency`);
        url.searchParams.set('filter_entities', 'true');
    } else if (assetType === 'metal') {
        url.searchParams.set('search', 'gold OR silver OR precious metals');
    }

    return url;
}

function normalizeNewsData(apiData: any): { articles: NewsArticle[]; sentiment: SentimentSummary } {
    if (!apiData?.data || !Array.isArray(apiData.data)) {
        console.warn('[Marketaux] Invalid data structure in API response');
        return { articles: [], sentiment: { score: null, label: 'neutral' } };
    }

    const articles: NewsArticle[] = apiData.data.map((item: any) => ({
        id: item.uuid || item.url,
        title: item.title,
        url: item.url,
        snippet: item.snippet || item.description || '',
        publishedAt: item.published_at,
        source: item.source,
        sentimentScore: item.entities?.[0]?.sentiment_score,
    }));

    // Calculate aggregate sentiment
    const sentiment = calculateSentiment(articles);

    return { articles, sentiment };
}

function calculateSentiment(articles: NewsArticle[]): SentimentSummary {
    const scores = articles
        .map(a => a.sentimentScore)
        .filter((s): s is number => s !== undefined && s !== null);

    if (scores.length === 0) {
        return { score: null, label: 'neutral' };
    }

    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;

    let label: 'bullish' | 'bearish' | 'neutral';
    if (avgScore > 0.1) {
        label = 'bullish';
    } else if (avgScore < -0.1) {
        label = 'bearish';
    } else {
        label = 'neutral';
    }

    return { score: Number(avgScore.toFixed(3)), label };
}

function getMockNews(assetType: AssetType, symbol?: string): { articles: NewsArticle[]; sentiment: SentimentSummary } {
    console.log(`[Marketaux] Generating mock news for ${assetType} ${symbol || ''}`);

    const mockArticles: NewsArticle[] = [
        {
            id: '1',
            title: `${symbol || assetType.toUpperCase()} shows strong performance amid market volatility`,
            url: 'https://example.com/news/1',
            snippet: 'Market analysts report positive trends in recent trading sessions...',
            publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            source: 'Financial Times',
            sentimentScore: 0.6,
        },
        {
            id: '2',
            title: 'Global economic factors impact commodity prices',
            url: 'https://example.com/news/2',
            snippet: 'Recent geopolitical events have created uncertainty in global markets...',
            publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
            source: 'Bloomberg',
            sentimentScore: -0.2,
        },
        {
            id: '3',
            title: 'Analysts remain cautiously optimistic about Q4 outlook',
            url: 'https://example.com/news/3',
            snippet: 'Despite recent volatility, long-term fundamentals remain strong...',
            publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
            source: 'Reuters',
            sentimentScore: 0.3,
        },
    ];

    return {
        articles: mockArticles,
        sentiment: { score: 0.23, label: 'bullish' },
    };
}
