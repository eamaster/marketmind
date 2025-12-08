import type { Timeframe } from '../../services/types';

interface TimeframeSelectorProps {
    value: Timeframe;
    onChange: (timeframe: Timeframe) => void;
}

// Actual timeframe values that match UI display
const timeframes: Timeframe[] = ['7D', '1M', '3M', '6M', '1Y'];

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
                    title={`Show ${tf} of data`}
                >
                    {tf}
                </button>
            ))}
        </div>
    );
}
