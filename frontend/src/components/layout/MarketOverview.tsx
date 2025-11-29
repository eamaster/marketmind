import { useEffect, useState } from 'react';

// Mock data generator for major indices
function generateMockIndexData() {
    // Base values
    const baseValues = {
        sp500: 4500,
        nasdaq: 14100,
        dow: 34900,
    };

    // Get stored data or create new
    const stored = localStorage.getItem('mock_indices');
    let lastUpdate: Date;
    let currentValues: typeof baseValues;

    if (stored) {
        const parsed = JSON.parse(stored);
        lastUpdate = new Date(parsed.lastUpdate);
        currentValues = parsed.values;

        // Update values every 5 minutes
        const now = new Date();
        if (now.getTime() - lastUpdate.getTime() > 5 * 60 * 1000) {
            // Apply small random changes (±0.5%)
            currentValues = {
                sp500: currentValues.sp500 * (1 + (Math.random() - 0.5) * 0.01),
                nasdaq: currentValues.nasdaq * (1 + (Math.random() - 0.5) * 0.01),
                dow: currentValues.dow * (1 + (Math.random() - 0.5) * 0.01),
            };
            localStorage.setItem('mock_indices', JSON.stringify({
                lastUpdate: now.toISOString(),
                values: currentValues,
            }));
        }
    } else {
        currentValues = baseValues;
        lastUpdate = new Date();
        localStorage.setItem('mock_indices', JSON.stringify({
            lastUpdate: lastUpdate.toISOString(),
            values: currentValues,
        }));
    }

    // Calculate changes from base
    return [
        {
            name: 'S&P 500',
            price: currentValues.sp500.toFixed(2),
            change: ((currentValues.sp500 - baseValues.sp500) / baseValues.sp500 * 100).toFixed(2),
            isPositive: currentValues.sp500 >= baseValues.sp500,
        },
        {
            name: 'NASDAQ',
            price: currentValues.nasdaq.toFixed(2),
            change: ((currentValues.nasdaq - baseValues.nasdaq) / baseValues.nasdaq * 100).toFixed(2),
            isPositive: currentValues.nasdaq >= baseValues.nasdaq,
        },
        {
            name: 'DOW',
            price: currentValues.dow.toFixed(2),
            change: ((currentValues.dow - baseValues.dow) / baseValues.dow * 100).toFixed(2),
            isPositive: currentValues.dow >= baseValues.dow,
        },
    ];
}

export function MarketOverview() {
    const [indices, setIndices] = useState(generateMockIndexData());

    useEffect(() => {
        // Refresh every minute
        const interval = setInterval(() => {
            setIndices(generateMockIndexData());
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Market Overview
                </h3>
                <span className="text-xs text-slate-500" title="Simulated data updates every 5 minutes">
                    Index data simulated
                </span>
            </div>
            <div className="space-y-2 px-3">
                {indices.map((index) => (
                    <div key={index.name} className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-400">{index.name}</span>
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-slate-300">
                                {index.price}
                            </span>
                            <span
                                className={`text-xs font-medium flex items-center gap-1 ${index.isPositive ? 'text-emerald-400' : 'text-red-400'
                                    }`}
                            >
                                <span className={index.isPositive ? 'text-emerald-400' : 'text-red-400'}>
                                    •
                                </span>
                                {index.isPositive ? '+' : ''}{index.change}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
