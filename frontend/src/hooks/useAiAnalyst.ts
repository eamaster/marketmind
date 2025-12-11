import { useState } from 'react';
import { apiClient } from '../services/apiClient';
import type { ChatMessage, PricePoint, NewsArticle, AssetType, Timeframe } from '../services/types';

interface AiContext {
    assetType: AssetType;
    symbol?: string;
    timeframe: Timeframe;
    chartData: PricePoint[];
    news: NewsArticle[];
}

export function useAiAnalyst(context: AiContext) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const sendQuestion = async (question: string) => {
        if (!question.trim()) return;

        // Add user message
        const userMessage: ChatMessage = {
            role: 'user',
            content: question,
            timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMessage]);

        setIsLoading(true);
        setError(null);

        try {
            const response = await apiClient.analyzeWithAi({
                assetType: context.assetType,
                symbol: context.symbol,
                timeframe: context.timeframe,
                chartData: context.chartData,
                news: context.news,
                question,
            });

            // Add AI response
            const aiMessage: ChatMessage = {
                role: 'ai',
                content: response.answer,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
            setError(new Error(errorMessage));

            // Add error message as AI response
            const errorAiMessage: ChatMessage = {
                role: 'ai',
                content: `Sorry, I encountered an error: ${errorMessage}`,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorAiMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearMessages = () => {
        setMessages([]);
        setError(null);
    };

    return {
        messages,
        sendQuestion,
        clearMessages,
        isLoading,
        error,
    };
}
