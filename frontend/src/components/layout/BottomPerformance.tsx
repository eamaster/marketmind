import { useQueries } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

// Same watchlist items as Sidebar
const WATCHLIST_SYMBOLS = [
    'AAPL', 'TSLA', 'GOOGL', 'MSFT', 'BRK.B', 'JPM', 'XOM', 'GLD', 'SLV'
];

export function BottomPerformance() {
    // Fetch all quotes in parallel
    const queries = useQueries({
        queries: WATCHLIST_SYMBOLS.map((symbol) => ({
            queryKey: ['quote', symbol],
            queryFn: () => apiClient.getQuote(symbol),
            staleTime: 30000,
        })),
    });

    // Process results
    const watchlistData = queries
        .map((query, index) => {
            if (!query.data) return null;
            return {
                symbol: WATCHLIST_SYMBOLS[index],
                price: query.data.price,
                change: query.data.changePercent, // Use percentage change for sorting
            };
        })
        .filter((item): item is { symbol: string; price: number; change: number } => item !== null);

    const isLoading = queries.some(q => q.isLoading);

    if (isLoading && watchlistData.length === 0) {
        return (
            <div className="w-full animate-pulse">
                <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-4"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                    <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
                </div>
            </div>
        );
    }

    // Calculate gainers and losers
    const gainers = [...watchlistData]
        .filter((s) => s.change > 0)
        .sort((a, b) => b.change - a.change)
        .slice(0, 3);

    const losers = [...watchlistData]
        .filter((s) => s.change < 0)
        .sort((a, b) => a.change - b.change) // Ascending (most negative first)
        .slice(0, 3);

    return (
        <div className="w-full">
            {/* Disclaimer */}
            <p className="text-xs text-slate-500 mb-3">
                Market Performance - Based on watchlist symbols
            </p>

            {/* Horizontal 2-column layout: Gainers | Losers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Top Gainers Column */}
                <div className="glass-card p-4">
                    <h4 className="text-sm font-semibold text-emerald-500 dark:text-emerald-400 mb-3 flex items-center gap-2">
                        <span className="text-lg">📈</span>
                        <span>Top Gainers</span>
                    </h4>
                    <div className="space-y-2">
                        {gainers.length > 0 ? (
                            gainers.map((gainer) => (
                                <div
                                    key={gainer.symbol}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-100/50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-200/50 dark:hover:bg-emerald-500/20 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                            {gainer.symbol}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            ${gainer.price.toFixed(2)}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                        +{gainer.change.toFixed(2)}%
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 py-2 text-center">No gainers today</p>
                        )}
                    </div>
                </div>

                {/* Top Losers Column */}
                <div className="glass-card p-4">
                    <h4 className="text-sm font-semibold text-red-500 dark:text-red-400 mb-3 flex items-center gap-2">
                        <span className="text-lg">📉</span>
                        <span>Top Losers</span>
                    </h4>
                    <div className="space-y-2">
                        {losers.length > 0 ? (
                            losers.map((loser) => (
                                <div
                                    key={loser.symbol}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-100/50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 hover:bg-red-200/50 dark:hover:bg-red-500/20 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-mono font-bold text-red-500 dark:text-red-400">
                                            {loser.symbol}
                                        </span>
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            ${loser.price.toFixed(2)}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-red-500 dark:text-red-400">
                                        {loser.change.toFixed(2)}%
                                    </span>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 py-2 text-center">No losers today</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
