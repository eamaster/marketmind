import { useEffect, useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface ApiUsage {
    twelvedata: number;
    marketaux: number;
    goldApi: number;
    lastReset: {
        daily: string; // ISO timestamp
        monthly: string; // ISO timestamp
    };
}

const API_LIMITS = {
    MARKETAUX_DAILY: 100,
    GOLD_API_MONTHLY: 1000,
    WARNING_THRESHOLD: 0.8, // 80%
    DANGER_THRESHOLD: 0.9, // 90%
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

export function ApiStatusIndicator() {
    const [usage, setUsage] = useState<ApiUsage>(getStoredUsage());
    const [showTooltip, setShowTooltip] = useState(false);

    useEffect(() => {
        // Reset counters if needed
        const now = new Date();
        const lastDailyReset = new Date(usage.lastReset.daily);
        const lastMonthlyReset = new Date(usage.lastReset.monthly);

        let updated = false;
        const newUsage = { ...usage };

        // Reset daily counter (Marketaux)
        if (now.getDate() !== lastDailyReset.getDate()) {
            newUsage.marketaux = 0;
            newUsage.lastReset.daily = now.toISOString();
            updated = true;
        }

        // Reset monthly counter (Gold API)
        if (now.getMonth() !== lastMonthlyReset.getMonth()) {
            newUsage.goldApi = 0;
            newUsage.lastReset.monthly = now.toISOString();
            updated = true;
        }

        if (updated) {
            setUsage(newUsage);
            saveUsage(newUsage);
        }
    }, [usage]);

    // Calculate warning levels
    const marketauxPercentage = usage.marketaux / API_LIMITS.MARKETAUX_DAILY;
    const goldApiPercentage = usage.goldApi / API_LIMITS.GOLD_API_MONTHLY;

    const isDanger =
        marketauxPercentage >= API_LIMITS.DANGER_THRESHOLD ||
        goldApiPercentage >= API_LIMITS.DANGER_THRESHOLD;

    const isWarning =
        marketauxPercentage >= API_LIMITS.WARNING_THRESHOLD ||
        goldApiPercentage >= API_LIMITS.WARNING_THRESHOLD;

    if (!isWarning && !isDanger) {
        return null; // Don't show indicator if API usage is normal
    }

    const Icon = isDanger ? AlertTriangle : Info;
    const iconColor = isDanger ? 'text-red-400' : 'text-amber-400';
    const bgColor = isDanger
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-amber-500/10 border-amber-500/30';

    return (
        <div className="relative">
            <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg border ${bgColor} ${iconColor} text-xs transition-all`}
                aria-label="API usage status"
            >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">API Limit</span>
            </button>

            {showTooltip && (
                <div
                    className="absolute top-full right-0 mt-2 w-72 p-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50"
                    role="tooltip"
                >
                    <h4 className="text-sm font-semibold text-slate-200 mb-2">
                        API Usage Status
                    </h4>

                    <div className="space-y-2 text-xs">
                        {/* Marketaux */}
                        <div>
                            <div className="flex justify-between text-slate-400 mb-1">
                                <span>Marketaux (Daily)</span>
                                <span>
                                    {usage.marketaux}/{API_LIMITS.MARKETAUX_DAILY}
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${marketauxPercentage >= API_LIMITS.DANGER_THRESHOLD
                                        ? 'bg-red-400'
                                        : marketauxPercentage >= API_LIMITS.WARNING_THRESHOLD
                                            ? 'bg-amber-400'
                                            : 'bg-emerald-400'
                                        }`}
                                    style={{ width: `${Math.min(marketauxPercentage * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        {/* Gold API */}
                        <div>
                            <div className="flex justify-between text-slate-400 mb-1">
                                <span>Gold API (Monthly)</span>
                                <span>
                                    {usage.goldApi}/{API_LIMITS.GOLD_API_MONTHLY}
                                </span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${goldApiPercentage >= API_LIMITS.DANGER_THRESHOLD
                                        ? 'bg-red-400'
                                        : goldApiPercentage >= API_LIMITS.WARNING_THRESHOLD
                                            ? 'bg-amber-400'
                                            : 'bg-emerald-400'
                                        }`}
                                    style={{ width: `${Math.min(goldApiPercentage * 100, 100)}%` }}
                                />
                            </div>
                        </div>

                        {isDanger && (
                            <p className="text-red-400 mt-2">
                                ⚠️ High usage - switching to cached data
                            </p>
                        )}
                        {isWarning && !isDanger && (
                            <p className="text-amber-400 mt-2">
                                Approaching limit - consider using cache
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// Export hook for tracking API calls
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
