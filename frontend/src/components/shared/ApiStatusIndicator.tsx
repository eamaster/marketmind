import { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { API_LIMITS, getUsageWithResets, type ApiUsage } from '../../services/apiUsage';

export function ApiStatusIndicator() {
    const [usage] = useState<ApiUsage>(() => getUsageWithResets());
    const [showTooltip, setShowTooltip] = useState(false);

    const marketauxPercentage = usage.marketaux / API_LIMITS.MARKETAUX_DAILY;
    const goldApiPercentage = usage.goldApi / API_LIMITS.GOLD_API_MONTHLY;

    const isDanger =
        marketauxPercentage >= API_LIMITS.DANGER_THRESHOLD ||
        goldApiPercentage >= API_LIMITS.DANGER_THRESHOLD;

    const isWarning =
        marketauxPercentage >= API_LIMITS.WARNING_THRESHOLD ||
        goldApiPercentage >= API_LIMITS.WARNING_THRESHOLD;

    if (!isWarning && !isDanger) {
        return null;
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
