interface SentimentBadgeProps {
    sentiment: 'bullish' | 'bearish' | 'neutral' | null;
}

const sentimentConfig = {
    bullish: {
        emoji: '🐂',
        label: 'Bullish',
        className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
    },
    bearish: {
        emoji: '🐻',
        label: 'Bearish',
        className: 'bg-red-500/10 border-red-500/30 text-red-400',
    },
    neutral: {
        emoji: '⚪',
        label: 'Neutral',
        className: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
    },
};

export function SentimentBadge({ sentiment }: SentimentBadgeProps) {
    if (!sentiment) {
        return null;
    }

    const config = sentimentConfig[sentiment];

    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${config.className}`}>
            <span>{config.emoji}</span>
            <span>{config.label}</span>
        </span>
    );
}
