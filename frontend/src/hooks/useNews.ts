import { useState, useEffect } from 'react';
import { apiClient } from '../services/apiClient';
import type { NewsArticle, SentimentSummary, AssetType, Timeframe } from '../services/types';

interface UseNewsParams {
    assetType: AssetType;
    symbol?: string;
    timeframe: Timeframe;
}

export function useNews({ assetType, symbol, timeframe }: UseNewsParams) {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [sentiment, setSentiment] = useState<SentimentSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await apiClient.getNews({ assetType, symbol, timeframe });
                setArticles(response.articles || []);
                setSentiment(response.sentiment || null);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to fetch news'));
                setArticles([]);
                setSentiment(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, [assetType, symbol, timeframe]);

    return {
        articles,
        sentiment,
        isLoading,
        error,
    };
}
