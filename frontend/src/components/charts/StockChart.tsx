import {
    Area,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    ComposedChart,
    Cell,
} from 'recharts';
import { TrendingUp, Star, Maximize2, Share2 } from 'lucide-react';
import { PriceAnimated } from '../shared/PriceAnimated';
import { TimeframeSelector } from '../shared/TimeframeSelector';
import type { PricePoint, Timeframe } from '../../services/types';
import { useTheme } from '../../hooks/useTheme';

interface StockChartProps {
    data: PricePoint[] | null;
    timeframe: Timeframe;
    symbol?: string;
    companyName?: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    isLoading?: boolean;
    error?: Error | null;
    onTimeframeChange?: (tf: Timeframe) => void;
    onSymbolChange?: (symbol: string) => void;
    availableSymbols?: Array<{ value: string; label: string }>;
    onUseForAI?: () => void;
    currentPrice?: number; // Optional override for header price
    isLive?: boolean; // Whether data includes today's live candle
}

// Default stock symbols
const DEFAULT_STOCK_SYMBOLS = [
    { value: 'AAPL', label: 'Apple Inc. (AAPL)' },
    { value: 'TSLA', label: 'Tesla Inc. (TSLA)' },
    { value: 'NVDA', label: 'NVIDIA Corp. (NVDA)' },
    { value: 'MSFT', label: 'Microsoft Corp. (MSFT)' },
    { value: 'GOOGL', label: 'Alphabet Inc. (GOOGL)' },
    { value: 'AMZN', label: 'Amazon.com Inc. (AMZN)' },
    { value: 'META', label: 'Meta Platforms Inc. (META)' },
];

// Helper: Format volume (45.2M instead of 45200000)
function formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
}

// Helper: Calculate support/resistance from chart data
function calculateSupportResistance(data: PricePoint[]): { support: number; resistance: number } {
    if (!data || data.length < 20) {
        const currentPrice = data?.[data.length - 1]?.close || 0;
        return {
            support: currentPrice * 0.95,
            resistance: currentPrice * 1.05,
        };
    }

    const recentData = data.slice(-20);
    const prices = recentData.map((d) => d.close);

    return {
        support: Math.min(...prices),
        resistance: Math.max(...prices),
    };
}

// Helper: Get sentiment data
function getSentimentData(sentiment: 'bullish' | 'bearish' | 'neutral') {
    const config = {
        bullish: { label: 'Bullish', emoji: '🐂', color: 'text-emerald-500 dark:text-emerald-400', score: 0.75 },
        bearish: { label: 'Bearish', emoji: '🐻', color: 'text-red-500 dark:text-red-400', score: 0.25 },
        neutral: { label: 'Neutral', emoji: '⚪', color: 'text-slate-500 dark:text-slate-400', score: 0.5 },
    };
    return config[sentiment];
}

export function StockChart({
    data,
    timeframe,
    symbol = 'AAPL',
    companyName = 'Apple Inc.',
    sentiment = 'bullish',
    isLoading = false,
    onTimeframeChange,
    onSymbolChange,
    availableSymbols,
    onUseForAI,
    currentPrice: overridePrice,
    isLive = false,
}: StockChartProps) {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    if (isLoading) {
        return (
            <div className="h-[500px] flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading chart data...</div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="h-[500px] flex items-center justify-center text-slate-500">
                No data available
            </div>
        );
    }

    // Format data for Recharts
    const chartData = data.map((point, index) => {
        const openPrice = point.open || 0;
        const closePrice = point.close || 0;
        const color = index === 0
            ? (closePrice >= openPrice ? '#10b981' : '#ef4444')
            : (closePrice >= (data[index - 1].close || 0) ? '#10b981' : '#ef4444');

        // Format time based on timeframe
        const date = new Date(point.timestamp);
        let timeLabel: string;

        // For daily/weekly/monthly/yearly views, show dates, not times
        if (timeframe === '1D' || timeframe === '1W' || timeframe === '1M' || timeframe === '3M' || timeframe === '1Y') {
            timeLabel = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
            });
        } else {
            // For intraday (if we ever add it), show time
            timeLabel = date.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        return {
            time: timeLabel,
            close: closePrice,
            open: openPrice,
            high: point.high,
            low: point.low,
            volume: point.volume || 0,
            color, // Add color to data point
        };
    });

    // Calculate stats
    // CRITICAL: Price change is calculated from FIRST candle (timeframe start) to LATEST candle
    // This gives accurate change percentage for the selected timeframe
    const firstCandle = data[0];
    const lastCandle = data[data.length - 1];

    const baselinePrice = firstCandle?.close || 0;
    const latestPrice = lastCandle?.close || 0;
    const currentPrice = overridePrice || latestPrice;

    // Calculate change from timeframe start (first candle) to latest candle
    const priceChange = ((latestPrice - baselinePrice) / baselinePrice) * 100;
    const priceChangeAbsolute = latestPrice - baselinePrice;

    const stats = {
        open: firstCandle?.open || currentPrice,
        high: Math.max(...data.map((d) => d.high || d.close)),
        low: Math.min(...data.map((d) => d.low || d.close)),
        volume: data.reduce((sum, d) => sum + (d.volume || 0), 0),
        baselinePrice,
        latestPrice,
    };

    const { support, resistance } = calculateSupportResistance(data);
    const isBullish = priceChange >= 0;
    const sentimentData = getSentimentData(sentiment);

    return (
        <div
            className="space-y-4"
            role="img"
            aria-label={`Stock price chart for ${symbol}`}
        >
            {/* HEADER SECTION */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">
                        {companyName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{symbol}</p>
                </div>

                {/* Symbol + Timeframe Controls */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Symbol Selector */}
                    {onSymbolChange && (
                        <select
                            value={symbol}
                            onChange={(e) => onSymbolChange(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all w-full sm:w-auto min-h-[44px] sm:min-h-0"
                            aria-label="Select stock symbol"
                        >
                            {(availableSymbols || DEFAULT_STOCK_SYMBOLS).map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-800">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Timeframe Selector */}
                    {onTimeframeChange && (
                        <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
                    )}

                    {/* Use for AI Button */}
                    {onUseForAI && (
                        <button
                            onClick={onUseForAI}
                            className="px-3 py-1 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors"
                            aria-label="Use chart data for AI analysis"
                        >
                            Use for AI
                        </button>
                    )}
                </div>
            </div>

            {/* PRICE & STATS SECTION */}
            <div>
                <div className="flex items-baseline gap-3 flex-wrap">
                    <PriceAnimated
                        value={latestPrice}
                        className="text-3xl font-bold font-mono text-slate-900 dark:text-slate-100"
                    />
                    <span
                        className={`text-lg ${isBullish ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                            }`}
                    >
                        {isBullish ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}% (
                        {priceChangeAbsolute >= 0 ? '+' : ''}
                        {priceChangeAbsolute.toFixed(2)})
                    </span>

                    {/* Data Freshness Badge */}
                    {(() => {
                        const latestDate = new Date(lastCandle.timestamp);
                        const today = new Date();
                        const daysDiff = Math.floor((today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24));

                        if (daysDiff === 0) {
                            return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full">Today</span>;
                        } else if (daysDiff === 1) {
                            return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">1 day old</span>;
                        } else {
                            return <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">{daysDiff} days old</span>;
                        }
                    })()}
                </div>

                {/* Timeframe Context */}
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Change from {new Date(firstCandle.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' '}(${baselinePrice.toFixed(2)}) to {new Date(lastCandle.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>

                {/* Mini stats row */}
                <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>O: ${stats.open.toFixed(2)}</span>
                    <span>H: ${stats.high.toFixed(2)}</span>
                    <span>L: ${stats.low.toFixed(2)}</span>
                    <span>V: {formatVolume(stats.volume)}</span>
                </div>
            </div>

            {/* COMPOSED CHART AREA (Price + Volume) */}
            <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={chartData}>
                    <defs>
                        <linearGradient id="bullGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="bearGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} opacity={0.3} />

                    <XAxis
                        dataKey="time"
                        stroke={isDark ? "#64748b" : "#94a3b8"}
                        tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }}
                        tickLine={false}
                        minTickGap={30}
                    />

                    {/* Price Y-Axis (Right) */}
                    <YAxis
                        yAxisId="price"
                        orientation="right"
                        stroke={isDark ? "#64748b" : "#94a3b8"}
                        tick={{ fontSize: 10, fill: isDark ? "#94a3b8" : "#64748b" }}
                        tickLine={false}
                        domain={['auto', 'auto']}
                        width={40}
                    />

                    {/* Volume Y-Axis (Left, hidden or scaled) */}
                    <YAxis
                        yAxisId="volume"
                        orientation="left"
                        hide={true}
                        domain={[0, 'dataMax * 4']}
                    />

                    {/* Support/Resistance Lines */}
                    <ReferenceLine
                        yAxisId="price"
                        y={support}
                        stroke="#f87171"
                        strokeDasharray="5 5"
                        label={{
                            value: `Support: $${support.toFixed(2)}`,
                            fontSize: 10,
                            fill: '#f87171',
                            position: 'insideBottomLeft',
                        }}
                    />
                    <ReferenceLine
                        yAxisId="price"
                        y={resistance}
                        stroke="#34d399"
                        strokeDasharray="5 5"
                        label={{
                            value: `Resistance: $${resistance.toFixed(2)}`,
                            fontSize: 10,
                            fill: '#34d399',
                            position: 'insideTopLeft',
                        }}
                    />

                    <Tooltip
                        contentStyle={{
                            backgroundColor: isDark ? '#1e293b' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#e2e8f0',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: isDark ? '#f1f5f9' : '#0f172a',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        labelStyle={{ color: isDark ? '#cbd5e1' : '#64748b' }}
                        itemStyle={{ color: isDark ? '#cbd5e1' : '#334155' }}
                    />

                    {/* Volume Bars */}
                    <Bar
                        yAxisId="volume"
                        dataKey="volume"
                        barSize={4}
                    >
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} opacity={0.3} />
                        ))}
                    </Bar>

                    {/* Price Area */}
                    <Area
                        yAxisId="price"
                        type="monotone"
                        dataKey="close"
                        stroke={isBullish ? '#34d399' : '#f87171'}
                        strokeWidth={2}
                        fill={isBullish ? 'url(#bullGradient)' : 'url(#bearGradient)'}
                        dot={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>

            {/* SENTIMENT GAUGE */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                        Sentiment:{' '}
                        <span className={sentimentData.color}>
                            {sentimentData.label} {sentimentData.emoji}
                        </span>
                    </span>
                </div>
                <div
                    className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
                    role="progressbar"
                    aria-valuenow={sentimentData.score}
                    aria-valuemin={0}
                    aria-valuemax={1}
                    aria-label="Market sentiment indicator"
                >
                    <div
                        className={`h-full transition-all duration-500 ${sentimentData.color.replace(
                            'text-',
                            'bg-'
                        ).replace('dark:text-', 'dark:bg-')}`}
                        style={{ width: `${sentimentData.score * 100}%` }}
                    />
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-2">
                <button
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    aria-label="Compare with other assets"
                    role="button"
                    tabIndex={0}
                >
                    <TrendingUp size={20} />
                </button>
                <button
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    aria-label="Add to watchlist"
                    role="button"
                    tabIndex={0}
                >
                    <Star size={20} />
                </button>
                <button
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    aria-label="View fullscreen"
                    role="button"
                    tabIndex={0}
                >
                    <Maximize2 size={20} />
                </button>
                <button
                    className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    aria-label="Share chart"
                    role="button"
                    tabIndex={0}
                >
                    <Share2 size={20} />
                </button>
            </div>


            {/* DATA SOURCE DISCLAIMER */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg text-xs text-blue-600 dark:text-blue-400 flex items-start gap-2">
                <div className="mt-0.5">ℹ️</div>
                <div>
                    <span className="font-semibold">Chart Data Information:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 opacity-90">
                        <li><strong>Historical Data:</strong> End-of-day candles from Massive.com (1-2 days delayed).</li>
                        {isLive && <li><strong>Today's Candle:</strong> Live from Finnhub (updates in real-time during market hours 9:30 AM - 4:00 PM ET).</li>}
                        {!isLive && <li><strong>Market Status:</strong> Closed - showing last available data.</li>}
                        <li><strong>Watchlist Quotes:</strong> Real-time prices from Finnhub (updates every 10s).</li>
                        <li><strong>Price Changes:</strong> Calculated from timeframe start to latest candle close.</li>
                    </ul>
                </div>
            </div>
        </div >
    );
}
