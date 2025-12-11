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
            let errorMessage = 'Failed to get AI response';
            let isRateLimit = false;

            if (err instanceof Error) {
                errorMessage = err.message;
                isRateLimit = errorMessage.includes('429') ||
                    errorMessage.includes('Rate limit') ||
                    errorMessage.includes('too many requests');
            }

            setError(new Error(errorMessage));

            // Show user-friendly rate limit message
            const errorAiMessage: ChatMessage = {
                role: 'ai',
                content: isRateLimit
                    ? `⏱️ You've reached the hourly limit (10 questions per hour). This helps keep the service free for everyone!\n\n**Please try again in:** 1 hour\n\n💡 **Tip:** Use the suggested questions below to get started quickly!`
                    : `Sorry, I encountered an error: ${errorMessage}`,
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
