import {
    API_LIMITS,
    getStoredUsage,
    getUsageWithResets,
    saveUsage,
} from '../services/apiUsage';

export function useApiTracking() {
    const trackApiCall = (service: 'twelvedata' | 'marketaux' | 'goldApi') => {
        const usage = getUsageWithResets();
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
