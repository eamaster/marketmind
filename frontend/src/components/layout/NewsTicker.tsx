import { useEffect, useState } from 'react';
import type { NewsArticle } from '../../services/types';

interface NewsTickerProps {
    articles: NewsArticle[];
}

function getSentimentEmoji(score?: number): string {
    if (!score) return '⚪';
    if (score > 0.2) return '🟢';
    if (score < -0.2) return '🔴';
    return '⚪';
}

function getRelativeTime(publishedAt: string): string {
    const now = new Date();
    const then = new Date(publishedAt);
    const diffMs = now.getTime() - then.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
}

export function NewsTicker({ articles }: NewsTickerProps) {
    const [isPaused, setIsPaused] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    // USER MOD #9: Limit to 10 most recent news items
    const recentArticles = articles.slice(0, 10);

    useEffect(() => {
        // Pause animation when tab is inactive
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    if (recentArticles.length === 0) {
        return null;
    }

    return (
        <div
            className="w-full h-12 bg-slate-100 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 overflow-hidden z-40"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            aria-live="off"
        >
            <div
                className={`h-full flex items-center ${isPaused || !isVisible ? '' : 'marquee-content'
                    }`}
                style={{
                    animationPlayState: isPaused || !isVisible ? 'paused' : 'running',
                }}
            >
                {/* Duplicate content for seamless loop */}
                {[...recentArticles, ...recentArticles].map((article, idx) => {
                    const sentiment = getSentimentEmoji(article.sentimentScore);
                    const timeAgo = getRelativeTime(article.publishedAt);

                    return (
                        <div
                            key={`${article.id}-${idx}`}
                            className="inline-flex items-center gap-2 px-6 text-sm text-slate-600 dark:text-slate-300 whitespace-nowrap"
                        >
                            <span className="text-red-500 dark:text-red-400 font-semibold">Breaking:</span>
                            <span className="font-medium text-slate-900 dark:text-slate-200">{article.title}</span>
                            <span className="text-slate-500">({article.source})</span>
                            <span className="text-slate-500">• {timeAgo}</span>
                            <span>{sentiment}</span>
                            <span className="text-slate-400 dark:text-slate-700 mx-4">•</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
