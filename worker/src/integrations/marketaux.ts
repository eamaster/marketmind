import type { Env, NewsArticle, SentimentSummary, AssetType, Timeframe } from '../core/types';

// Marketaux news API client
// Docs: https://www.marketaux.com/documentation

export async function getNews(
    assetType: AssetType,
    symbol: string | undefined,
    timeframe: Timeframe,
    env: Env
): Promise<{ articles: NewsArticle[]; sentiment: SentimentSummary }> {
    const apiToken = env.MARKETAUX_API_TOKEN;

    if (!apiToken) {
        console.warn('[Marketaux] No API token configured, using mock data');
        return getMockNews(assetType, symbol);
    }

    try {
        const url = buildNewsUrl(assetType, symbol, apiToken);
        console.log(`[Marketaux] Fetching news for ${assetType} ${symbol || ''} (${timeframe})`);
        console.log(`[Marketaux] URL: ${url.toString().replace(apiToken, 'API_TOKEN')}`);

        const response = await fetch(url.toString());
        console.log(`[Marketaux] Response status: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Marketaux] API error:', response.status, response.statusText, errorText);
            throw new Error(`Marketaux API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`[Marketaux] Received ${data?.data?.length || 0} articles`);
        const normalized = normalizeNewsData(data);
        console.log(`[Marketaux] Normalized ${normalized.articles.length} articles, sentiment: ${normalized.sentiment.label}`);
        return normalized;
    } catch (error) {
        console.error('[Marketaux] Error fetching data:', error);
        console.warn('[Marketaux] Falling back to mock data');
        return getMockNews(assetType, symbol);
    }
}

function buildNewsUrl(assetType: AssetType, symbol: string | undefined, apiToken: string): URL {
    const url = new URL('https://api.marketaux.com/v1/news/all');

    url.searchParams.set('api_token', apiToken);
    url.searchParams.set('language', 'en');
    url.searchParams.set('limit', '10');
    url.searchParams.set('must_have_entities', 'true');
    url.searchParams.set('filter_entities', 'true');
    url.searchParams.set('group_similar', 'true');

    // Build query based on asset type
    if (assetType === 'stock' && symbol) {
        url.searchParams.set('symbols', symbol);
    } else if (assetType === 'oil') {
        url.searchParams.set('industries', 'Energy');
        url.searchParams.set('search', 'crude oil OR WTI OR Brent');
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
