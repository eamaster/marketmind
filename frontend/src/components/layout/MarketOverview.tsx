import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

// Use ETF proxies for indices as they are reliably available on free tier
const INDICES = [
    { name: 'S&P 500 (SPY)', symbol: 'SPY' },
    { name: 'NASDAQ (QQQ)', symbol: 'QQQ' },
    { name: 'DOW (DIA)', symbol: 'DIA' },
];

function IndexRow({ item }: { item: { name: string; symbol: string } }) {
    const { data, isLoading, isError } = useQuery({
        queryKey: ['quote', item.symbol],
        queryFn: () => apiClient.getQuote(item.symbol),
        refetchInterval: 60000,
        staleTime: 30000,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-between py-2 animate-pulse">
                <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
                <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </div>
        );
    }

    if (isError || !data) {
        return null;
    }

    const isPositive = data.change >= 0;

    return (
        <div className="flex items-center justify-between py-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">{item.name}</span>
            <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-slate-700 dark:text-slate-300">
                    {data.price.toFixed(2)}
                </span>
                <span
                    className={`text-xs font-medium flex items-center gap-1 ${isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                        }`}
                >
                    <span className={isPositive ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}>
                        •
                    </span>
                    {isPositive ? '+' : ''}{data.changePercent.toFixed(2)}%
                </span>
            </div>
        </div>
    );
}

export function MarketOverview() {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Market Overview
                </h3>
            </div>
            <div className="space-y-2 px-3">
                {INDICES.map((index) => (
                    <IndexRow key={index.symbol} item={index} />
                ))}
            </div>
        </div>
    );
}
