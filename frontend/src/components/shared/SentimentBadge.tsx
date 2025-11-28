import type { SentimentSummary } from '../../services/types';

interface SentimentBadgeProps {
    sentiment: SentimentSummary | null;
}

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
    if (!sentiment) {
        return (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                No Data
            </span>
        );
    }

    const { label, score } = sentiment;

    const colors = {
        bullish: 'bg-bullish-light text-white',
        bearish: 'bg-bearish-light text-white',
        neutral: 'bg-neutral text-white',
    };

    const icons = {
        bullish: '📈',
        bearish: '📉',
        neutral: '➡️',
    };

    return (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[label]}`}>
            {icons[label]} {label.charAt(0).toUpperCase() + label.slice(1)}
            {score !== null && ` (${score > 0 ? '+' : ''}${score.toFixed(2)})`}
        </span>
    );
}
