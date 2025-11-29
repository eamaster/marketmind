interface CacheTimestampProps {
    timestamp: string; // ISO string
    isCached: boolean;
    isApproachingLimit?: boolean;
}

function getRelativeTime(isoString: string): string {
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now.getTime() - then.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 10) return 'just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return `${diffDay}d ago`;
}

export function CacheTimestamp({
    timestamp,
    isCached,
    isApproachingLimit = false,
}: CacheTimestampProps) {
    const relativeTime = getRelativeTime(timestamp);

    if (isApproachingLimit && isCached) {
        return (
            <p className="text-xs text-amber-400 flex items-center gap-1">
                <span>⚠️</span>
                <span>Rate limit approaching - using cache (updated {relativeTime})</span>
            </p>
        );
    }

    if (isCached) {
        return (
            <p className="text-xs text-slate-400">
                Using cached data (updated {relativeTime})
            </p>
        );
    }

    return (
        <p className="text-xs text-slate-400">
            Last updated: {relativeTime}
        </p>
    );
}
