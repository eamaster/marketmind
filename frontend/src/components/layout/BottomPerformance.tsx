interface WatchlistSymbol {
    symbol: string;
    name: string;
    price: number;
    change: number;
}

interface BottomPerformanceProps {
    watchlistSymbols?: WatchlistSymbol[];
}

// Mock watchlist data - in production this would come from actual watchlist
const DEFAULT_WATCHLIST: WatchlistSymbol[] = [
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

export function BottomPerformance({
    watchlistSymbols = DEFAULT_WATCHLIST,
}: BottomPerformanceProps) {
    // USER MOD #4: Calculate from watchlist symbols only
    const gainers = watchlistSymbols
        .filter((s) => s.change > 0)
        .sort((a, b) => b.change - a.change)
        .slice(0, 3);

    const losers = watchlistSymbols
        .filter((s) => s.change < 0)
        .sort((a, b) => a.change - b.change)
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
                    <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                        <span className="text-lg">📈</span>
                        <span>Top Gainers</span>
                    </h4>
                    <div className="space-y-2">
                        {gainers.length > 0 ? (
                            gainers.map((gainer) => (
                                <div
                                    key={gainer.symbol}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-mono font-bold text-emerald-400">
                                            {gainer.symbol}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            ${gainer.price.toFixed(2)}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-emerald-400">
                                        +{gainer.change.toFixed(1)}%
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
                    <h4 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <span className="text-lg">📉</span>
                        <span>Top Losers</span>
                    </h4>
                    <div className="space-y-2">
                        {losers.length > 0 ? (
                            losers.map((loser) => (
                                <div
                                    key={loser.symbol}
                                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-base font-mono font-bold text-red-400">
                                            {loser.symbol}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            ${loser.price.toFixed(2)}
                                        </span>
                                    </div>
                                    <span className="text-sm font-bold text-red-400">
                                        {loser.change.toFixed(1)}%
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
