import { useState } from 'react';
import { ApiError, apiClient } from '../services/apiClient';
import type { ChatMessage, PricePoint, NewsArticle, AssetType, Timeframe } from '../services/types';

interface AiContext {
    assetType: AssetType;
    symbol?: string;
    timeframe: Timeframe;
    chartData: PricePoint[];
    news: NewsArticle[];
}

function formatAiErrorMessage(err: unknown): string {
    if (err instanceof ApiError) {
        // App hourly IP limit (Worker rate limiter) — distinct from Workers AI Neuron quota.
        if (err.errorCode === 'Rate limit exceeded' || (err.status === 429 && err.category === 'throttle' && err.message.includes('10 per hour'))) {
            return `⏱️ You've reached the hourly limit (10 questions per hour). This helps keep the service free for everyone!\n\n**Please try again in:** 1 hour\n\n💡 **Tip:** Use the suggested questions below to get started quickly!`;
        }
        if (err.category === 'quota' || err.providerCode === 3036) {
            return `⏱️ Workers AI daily free allocation is exhausted (shared account Neurons). This is not your personal hourly chat limit.\n\n**Please try again after:** the daily reset (00:00 UTC), or ask the operator about the Workers plan.\n\nDetails: ${err.message.replace(/^API request failed:\s*/, '')}`;
        }
        if (err.category === 'capacity') {
            return `Workers AI is temporarily out of capacity. Please try again shortly.\n\nDetails: ${err.message.replace(/^API request failed:\s*/, '')}`;
        }
        if (err.category === 'throttle') {
            return `Workers AI is throttling requests right now. Please wait a moment and try again.\n\nDetails: ${err.message.replace(/^API request failed:\s*/, '')}`;
        }
        return `Sorry, I encountered an error: ${err.message.replace(/^API request failed:\s*/, '')}`;
    }

    if (err instanceof Error) {
        return `Sorry, I encountered an error: ${err.message}`;
    }
    return 'Sorry, I encountered an error: Failed to get AI response';
}

export function useAiAnalyst(context: AiContext) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const sendQuestion = async (question: string) => {
        if (!question.trim()) return;

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

            const aiMessage: ChatMessage = {
                role: 'ai',
                content: response.answer,
                timestamp: new Date().toISOString(),
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (err) {
            const content = formatAiErrorMessage(err);
            setError(err instanceof Error ? err : new Error(content));

            const errorAiMessage: ChatMessage = {
                role: 'ai',
                content,
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
