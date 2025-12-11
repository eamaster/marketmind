import type { PricePoint, NewsArticle } from '../core/types';

// Build a compact, structured prompt for Gemini from market data

interface PromptInput {
    assetType: 'stock' | 'crypto' | 'metal';
    symbol?: string;
    timeframe: '7D' | '1M' | '3M' | '6M' | '1Y';
    chartData: PricePoint[];
    news: NewsArticle[];
    question: string;
}

export function buildPrompt(input: PromptInput): string {
    const { assetType, symbol, timeframe, chartData, news, question } = input;

    // Summarize chart data
    const chartSummary = summarizeChartData(chartData);

    // Extract key news headlines
    const newsSummary = summarizeNews(news.slice(0, 5)); // Top 5 most recent

    const assetName = symbol || assetType.toUpperCase();

    return `You are a financial market analyst assistant. Answer the following question based on the provided market data and recent news. Be concise and grounded in the data.

**Asset:** ${assetName} (${assetType})
**Timeframe:** ${timeframe}

**Market Data Summary:**
${chartSummary}

**Recent News & Sentiment:**
${newsSummary}

**User Question:** ${question}

**Instructions:**
- Base your analysis on the provided chart data and news.
- Clearly connect price movements with specific news events when plausible.
- If no clear linkage exists, acknowledge uncertainty.
- Be concise and actionable (2-3 paragraphs max).
`;
}

function summarizeChartData(data: PricePoint[]): string {
    if (data.length === 0) {
        return 'No price data available.';
    }

    const first = data[0];
    const last = data[data.length - 1];
    const prices = data.map(d => d.close);
    const high = Math.max(...prices);
    const low = Math.min(...prices);

    const change = last.close - first.close;
    const changePercent = ((change / first.close) * 100).toFixed(2);
    const trend = change > 0 ? 'upward' : change < 0 ? 'downward' : 'flat';

    // Calculate volatility (simple standard deviation)
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const volatility = ((stdDev / mean) * 100).toFixed(2);

    return `- Current Price: $${last.close.toFixed(2)}
- Price Range: $${low.toFixed(2)} - $${high.toFixed(2)}
- Change: ${change > 0 ? '+' : ''}$${change.toFixed(2)} (${changePercent}%)
- Trend: ${trend}
- Volatility: ${volatility}% (standard deviation)
- Data Points: ${data.length}`;
}

function summarizeNews(articles: NewsArticle[]): string {
    if (articles.length === 0) {
        return 'No recent news available.';
    }

    return articles
        .map((article, idx) => {
            const sentiment = article.sentimentScore !== undefined && article.sentimentScore !== null
                ? article.sentimentScore > 0
                    ? '📈 Positive'
                    : article.sentimentScore < 0
                        ? '📉 Negative'
                        : '➡️ Neutral'
                : '❓ Unknown';

            const timeAgo = getTimeAgo(article.publishedAt);

            return `${idx + 1}. [${sentiment}] "${article.title}" - ${article.source} (${timeAgo})`;
        })
        .join('\n');
}

function getTimeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) return 'Just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
}
