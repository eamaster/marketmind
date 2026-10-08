interface ApiUsage {
    twelvedata: number;
    marketaux: number;
    goldApi: number;
    lastReset: {
        daily: string;
        monthly: string;
    };
}

const API_LIMITS = {
    MARKETAUX_DAILY: 100,
    GOLD_API_MONTHLY: 1000,
    WARNING_THRESHOLD: 0.8,
};

function getStoredUsage(): ApiUsage {
    const stored = localStorage.getItem('api_usage');
    if (stored) {
        return JSON.parse(stored);
    }
    return {
        twelvedata: 0,
        marketaux: 0,
        goldApi: 0,
        lastReset: {
            daily: new Date().toISOString(),
            monthly: new Date().toISOString(),
        },
    };
}

function saveUsage(usage: ApiUsage) {
    localStorage.setItem('api_usage', JSON.stringify(usage));
}

export function useApiTracking() {
    const trackApiCall = (service: 'twelvedata' | 'marketaux' | 'goldApi') => {
        const usage = getStoredUsage();
        usage[service]++;
        saveUsage(usage);
    };

    const isApproachingLimit = (): boolean => {
        const usage = getStoredUsage();
        const marketauxPercentage = usage.marketaux / API_LIMITS.MARKETAUX_DAILY;
        const goldApiPercentage = usage.goldApi / API_LIMITS.GOLD_API_MONTHLY;
        return (
            marketauxPercentage >= API_LIMITS.WARNING_THRESHOLD ||
            goldApiPercentage >= API_LIMITS.WARNING_THRESHOLD
        );
    };

    return { trackApiCall, isApproachingLimit };
}
