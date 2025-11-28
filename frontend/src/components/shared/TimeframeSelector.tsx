import type { Timeframe } from '../../services/types';

interface TimeframeSelectorProps {
    value: Timeframe;
    onChange: (timeframe: Timeframe) => void;
}

const timeframes: Timeframe[] = ['1D', '1W', '1M'];

export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
    return (
        <div className="inline-flex rounded-lg bg-gray-200 p-1">
            {timeframes.map((tf) => (
                <button
                    key={tf}
                    onClick={() => onChange(tf)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${value === tf
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    {tf}
                </button>
            ))}
        </div>
    );
}
