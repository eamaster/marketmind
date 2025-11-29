import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface WatchlistProps {
    onSymbolClick?: (symbol: string) => void;
}

// Mock watchlist data - in production, this would come from API or user preferences
const WATCHLIST_SYMBOLS = [
    { symbol: 'AAPL', name: 'Apple Inc.', price: 189.45, change: 1.2 },
    { symbol: 'TSLA', name: 'Tesla Inc.', price: 242.84, change: -0.8 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 140.23, change: 0.5 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', price: 378.91, change: 0.9 },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway', price: 368.50, change: -0.3 },
    { symbol: 'JPM', name: 'JPMorgan Chase', price: 151.22, change: 1.1 },
    { symbol: 'XOM', name: 'Exxon Mobil', price: 105.67, change: -1.5 },
    { symbol: 'GLD', name: 'SPDR Gold Trust', price: 186.34, change: 0.2 },
    { symbol: 'SLV', name: 'iShares Silver Trust', price: 21.45, change: -0.4 },
];

export function Watchlist({ onSymbolClick }: WatchlistProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="space-y-2">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 hover:bg-slate-800/30 rounded-lg transition-colors"
                aria-expanded={isExpanded}
                aria-label="Toggle watchlist"
            >
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Watchlist
                </h3>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
            </button>

            {isExpanded && (
                <div className="space-y-1 max-h-[400px] overflow-y-auto scrollbar-thin" role="list">
                    {WATCHLIST_SYMBOLS.map((item) => {
                        const isPositive = item.change > 0;
                        return (
                            <button
                                key={item.symbol}
                                onClick={() => onSymbolClick?.(item.symbol)}
                                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors text-left group"
                                role="listitem"
                                title={`${item.name} - Click to load`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-mono font-medium text-slate-300">
                                            {item.symbol}
                                        </span>
                                        {/* Mini sparkline placeholder - shows "Click to load" for non-active symbols */}
                                        <span className="text-xs text-slate-500 group-hover:text-slate-400">
                                            Click to load
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                    <div className="font-mono text-sm text-slate-300">
                                        ${item.price.toFixed(2)}
                                    </div>
                                    <div
                                        className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'
                                            }`}
                                    >
                                        {isPositive ? '+' : ''}{item.change.toFixed(1)}%{' '}
                                        {isPositive ? '↑' : '↓'}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
