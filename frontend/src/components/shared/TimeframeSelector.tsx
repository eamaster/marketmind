import type { Timeframe } from '../../services/types';

interface TimeframeSelectorProps {
    value: Timeframe;
    onChange: (timeframe: Timeframe) => void;
}

// Mapping of internal timeframe values to user-friendly labels
// Internal: '1D', '1W', '1M', '3M', '1Y' (for backend compatibility)
// Display: '5D', '1M', '3M', '6M', '1Y' (what users actually see)
const timeframeLabels: Record<Timeframe, string> = {
    '1D': '5D',   // 5 trading days (1 week)
    '1W': '1M',   // 1 month of daily data  
    '1M': '3M',   // 3 months of daily data
    '3M': '6M',   // 6 months of daily data
    '1Y': '1Y',   // 1 year of daily data
};

const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '1Y'];

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
    return (
        <div className="inline-flex gap-1 rounded-full bg-slate-100 dark:bg-slate-800/50 p-1">
            {timeframes.map((tf) => (
                <button
                    key={tf}
                    onClick={() => onChange(tf)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${value === tf
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                    aria-pressed={value === tf}
                    title={`Show ${timeframeLabels[tf]} of daily candles`}
                >
                    {timeframeLabels[tf]}
                </button>
            ))}
        </div>
    );
}
