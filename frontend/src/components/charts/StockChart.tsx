import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { TrendingUp, Star, Maximize2, Share2 } from 'lucide-react';
import { PriceAnimated } from '../shared/PriceAnimated';
import { TimeframeSelector } from '../shared/TimeframeSelector';
import type { PricePoint, Timeframe } from '../../services/types';

interface StockChartProps {
    data: PricePoint[] | null;
    timeframe: Timeframe;
    symbol?: string;
    companyName?: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    isLoading?: boolean;
    error?: Error | null;
    onTimeframeChange?: (tf: Timeframe) => void;
}

// Helper: Format volume (45.2M instead of 45200000)
function formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
}

// Helper: Calculate support/resistance from chart data (USER MOD #8)
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
        bullish: { label: 'Bullish', emoji: '🐂', color: 'text-emerald-400', score: 0.75 },
        bearish: { label: 'Bearish', emoji: '🐻', color: 'text-red-400', score: 0.25 },
        neutral: { label: 'Neutral', emoji: '⚪', color: 'text-slate-400', score: 0.5 },
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
}: StockChartProps) {
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
    const chartData = data.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        }),
        close: point.close,
        open: point.open,
        high: point.high,
        low: point.low,
        volume: point.volume || 0,
    }));

    // Calculate stats
    const currentPrice = data[data.length - 1]?.close || 0;
    const previousPrice = data[0]?.close || currentPrice;
    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    const priceChangeAbsolute = currentPrice - previousPrice;

    const stats = {
        open: data[0]?.open || currentPrice,
        high: Math.max(...data.map((d) => d.high || d.close)),
        low: Math.min(...data.map((d) => d.low || d.close)),
        volume: data.reduce((sum, d) => sum + (d.volume || 0), 0),
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">🍎</span>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-200">
                            {companyName}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono">{symbol}</p>
                    </div>
                </div>
                {onTimeframeChange && (
                    <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
                )}
            </div>

            {/* PRICE & STATS SECTION */}
            <div>
                <div className="flex items-baseline gap-3">
                    <PriceAnimated
                        value={currentPrice}
                        className="text-3xl font-bold font-mono text-slate-100"
                    />
                    <span
                        className={`text-lg ${isBullish ? 'text-emerald-400' : 'text-red-400'
                            }`}
                    >
                        {isBullish ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}% (
                        {priceChangeAbsolute >= 0 ? '+' : ''}
                        {priceChangeAbsolute.toFixed(2)})
                    </span>
                </div>

                {/* Mini stats row */}
                <div className="mt-2 flex gap-4 text-xs text-slate-400 font-mono">
                    <span>O: ${stats.open.toFixed(2)}</span>
                    <span>H: ${stats.high.toFixed(2)}</span>
                    <span>L: ${stats.low.toFixed(2)}</span>
                    <span>V: {formatVolume(stats.volume)}</span>
                </div>
            </div>

            {/* CHART AREA WITH GRADIENT */}
            <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={chartData}>
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

                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis
                        dataKey="time"
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                    />
                    <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        tickLine={false}
                        domain={['auto', 'auto']}
                    />

                    {/* Support/Resistance Lines */}
                    <ReferenceLine
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
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            fontSize: '12px',
                        }}
                        labelStyle={{ color: '#cbd5e1' }}
                        itemStyle={{ color: '#cbd5e1' }}
                    />

                    <Area
                        type="monotone"
                        dataKey="close"
                        stroke={isBullish ? '#34d399' : '#f87171'}
                        strokeWidth={2}
                        fill={isBullish ? 'url(#bullGradient)' : 'url(#bearGradient)'}
                        dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>

            {/* VOLUME BARS */}
            <ResponsiveContainer width="100%" height={64}>
                <BarChart data={chartData}>
                    <Bar
                        dataKey="volume"
                        fill={
                            isBullish
                                ? 'rgba(16, 185, 129, 0.6)'
                                : 'rgba(239, 68, 68, 0.6)'
                        }
                    />
                </BarChart>
            </ResponsiveContainer>

            {/* SENTIMENT GAUGE */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-400">
                        Sentiment:{' '}
                        <span className={sentimentData.color}>
                            {sentimentData.label} {sentimentData.emoji}
                        </span>
                    </span>
                </div>
                <div
                    className="h-2 rounded-full bg-slate-700 overflow-hidden"
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
                        )}`}
                        style={{ width: `${sentimentData.score * 100}%` }}
                    />
                </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex gap-2">
                <button
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Compare with other assets"
                    role="button"
                    tabIndex={0}
                >
                    <TrendingUp size={20} />
                </button>
                <button
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Add to watchlist"
                    role="button"
                    tabIndex={0}
                >
                    <Star size={20} />
                </button>
                <button
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="View fullscreen"
                    role="button"
                    tabIndex={0}
                >
                    <Maximize2 size={20} />
                </button>
                <button
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Share chart"
                    role="button"
                    tabIndex={0}
                >
                    <Share2 size={20} />
                </button>
            </div>
        </div>
    );
}
