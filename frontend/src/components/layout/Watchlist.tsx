import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

interface WatchlistProps {
    onSymbolClick?: (symbol: string) => void;
}

// Watchlist symbols to fetch
const WATCHLIST_ITEMS = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corp.' },
    { symbol: 'BRK.B', name: 'Berkshire Hathaway' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
    { symbol: 'XOM', name: 'Exxon Mobil' },
    { symbol: 'XAU', name: 'Gold Spot (USD)' },
    { symbol: 'XAG', name: 'Silver Spot (USD)' },
    { symbol: 'GLD', name: 'SPDR Gold Trust (ETF)' },
    { symbol: 'SLV', name: 'iShares Silver Trust (ETF)' },
];

function WatchlistRow({ item, onClick }: { item: { symbol: string; name: string }; onClick?: () => void }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['quote', item.symbol],
        queryFn: () => apiClient.getQuote(item.symbol),
        refetchInterval: 60000, // Refresh every minute
        staleTime: 30000,
    });

    if (isLoading) {
        return (
            <div className="w-full flex items-center justify-between px-3 py-2 animate-pulse">
                <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
        );
    }

    if (isError || !data) {
        return (
            <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left group opacity-70">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300">
                            {item.symbol}
                        </span>
                        <span className="text-xs text-slate-500 truncate hidden sm:block">
                            {item.name}
                        </span>
                    </div>
                </div>
                <div className="flex-shrink-0 text-right">
                    <div className="font-mono text-sm text-slate-500 dark:text-slate-400">
                        ---
                    </div>
                </div>
            </div>
        );
    }

    const isPositive = data.change >= 0;

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors text-left group"
            role="listitem"
            title={`${item.name} - Click to load`}
        >
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-medium text-slate-700 dark:text-slate-300">
                        {item.symbol}
                    </span>
                    <span className="text-xs text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-400 truncate hidden sm:block">
                        {item.name}
                    </span>
                </div>
            </div>
            <div className="flex-shrink-0 text-right">
                <div className="font-mono text-sm text-slate-700 dark:text-slate-300">
                    ${data.price.toFixed(2)}
                </div>
                <div
                    className={`text-xs font-medium ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                        }`}
                >
                    {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%{' '}
                    {isPositive ? '↑' : '↓'}
                </div>
            </div>
        </button>
    );
}

export function Watchlist({ onSymbolClick }: WatchlistProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="space-y-2">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-3 hover:bg-slate-100 dark:hover:bg-slate-800/30 rounded-lg transition-colors"
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
                    {WATCHLIST_ITEMS.map((item) => (
                        <WatchlistRow
                            key={item.symbol}
                            item={item}
                            onClick={() => onSymbolClick?.(item.symbol)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
