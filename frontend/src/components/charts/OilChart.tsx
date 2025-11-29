import {
    LineChart,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    ResponsiveContainer,
    Area,
} from 'recharts';
import { TrendingUp, Star, Maximize2, Share2 } from 'lucide-react';
import { PriceAnimated } from '../shared/PriceAnimated';
import { TimeframeSelector } from '../shared/TimeframeSelector';
import type { PricePoint, Timeframe } from '../../services/types';

interface OilChartProps {
    data: PricePoint[] | null;
    timeframe: Timeframe;
    code?: string;
    name?: string;
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    isLoading?: boolean;
    error?: Error | null;
    onTimeframeChange?: (tf: Timeframe) => void;
    onCodeChange?: (code: string) => void;
    availableCodes?: Array<{ value: string; label: string }>;
}

// Default oil codes
const DEFAULT_OIL_CODES = [
    { value: 'WTI_USD', label: 'WTI Crude Oil' },
    { value: 'BRENT_USD', label: 'Brent Crude Oil' },
];

function formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
}

function calculateSupportResistance(data: PricePoint[]): {
    support: number;
    resistance: number;
} {
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

function getSentimentData(sentiment: 'bullish' | 'bearish' | 'neutral') {
    const config = {
        bullish: {
            label: 'Bullish',
            emoji: '🐂',
            color: 'text-emerald-400',
            score: 0.75,
        },
        bearish: {
            label: 'Bearish',
            emoji: '🐻',
            color: 'text-red-400',
            score: 0.25,
        },
        neutral: {
            label: 'Neutral',
            emoji: '⚪',
            color: 'text-slate-400',
            score: 0.5,
        },
    };
    return config[sentiment];
}

export function OilChart({
    data,
    timeframe,
    code = 'WTI_USD',
    name = 'WTI Crude Oil',
    sentiment = 'bearish',
    isLoading = false,
    onTimeframeChange,
    onCodeChange,
    availableCodes,
}: OilChartProps) {
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
            aria-label={`Oil price chart for ${code}`}
        >
            {/* HEADER SECTION */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-slate-200">{name}</h3>
                    <p className="text-xs text-slate-400 font-mono">{code}</p>
                </div>

                {/* Oil Type + Timeframe Controls */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Oil Type Selector */}
                    {onCodeChange && (
                        <select
                            value={code}
                            onChange={(e) => onCodeChange(e.target.value)}
                            className="px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 text-sm hover:bg-slate-700/50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all w-full sm:w-auto min-h-[44px] sm:min-h-0"
                            aria-label="Select oil type"
                        >
                            {(availableCodes || DEFAULT_OIL_CODES).map((opt) => (
                                <option key={opt.value} value={opt.value} className="bg-slate-800">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    )}

                    {/* Timeframe Selector */}
                    {onTimeframeChange && (
                        <TimeframeSelector value={timeframe} onChange={onTimeframeChange} />
                    )}
                </div>
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

                <div className="mt-2 flex gap-4 text-xs text-slate-400 font-mono">
                    <span>O: ${stats.open.toFixed(2)}</span>
                    <span>H: ${stats.high.toFixed(2)}</span>
                    <span>L: ${stats.low.toFixed(2)}</span>
                    <span>V: {formatVolume(stats.volume)}</span>
                </div>
            </div>

            {/* CHART AREA - RED THEME FOR OIL */}
            <ResponsiveContainer width="100%" height={256}>
                <LineChart data={chartData}>
                    <defs>
                        <linearGradient id="oilGradient" x1="0" y1="0" x2="0" y2="1">
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
                        stroke="#ef4444"
                        strokeDasharray="5 5"
                        label={{
                            value: `Resistance: $${resistance.toFixed(2)}`,
                            fontSize: 10,
                            fill: '#ef4444',
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
                        stroke="#f87171"
                        strokeWidth={2}
                        fill="url(#oilGradient)"
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>

            {/* VOLUME BARS */}
            <ResponsiveContainer width="100%" height={64}>
                <BarChart data={chartData}>
                    <Bar dataKey="volume" fill="rgba(239, 68, 68, 0.6)" />
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
