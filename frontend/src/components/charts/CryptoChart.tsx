import { TrendingUp, Star, Maximize2, Share2 } from 'lucide-react';
import { PriceAnimated } from '../shared/PriceAnimated';
import { TimeframeSelector } from '../shared/TimeframeSelector';
import type { PricePoint, Timeframe } from '../../services/types';
import { CRYPTO_SYMBOLS, ASSET_DISPLAY_NAMES } from '../../config/assets';
import type { CryptoSymbol } from '../../services/types';
import CandlestickChart, { type CandlePoint } from './CandlestickChart';

interface CryptoChartProps {
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
    onUseForAI?: () => void;
    currentPrice?: number; // Optional override for header price
}

// Generate dropdown options from all CRYPTO_SYMBOLS in config
const DEFAULT_Crypto_CODES = CRYPTO_SYMBOLS.map((sym: CryptoSymbol) => ({
    value: sym,
    label: `${ASSET_DISPLAY_NAMES[sym]} (${sym})`
}));

function formatVolume(volume: number): string {
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
    return volume.toString();
}



function getSentimentData(sentiment: 'bullish' | 'bearish' | 'neutral') {
    const config = {
        bullish: {
            label: 'Bullish',
            emoji: '🐂',
            color: 'text-emerald-500 dark:text-emerald-400',
            score: 0.75,
        },
        bearish: {
            label: 'Bearish',
            emoji: '🐻',
            color: 'text-red-500 dark:text-red-400',
            score: 0.25,
        },
        neutral: {
            label: 'Neutral',
            emoji: '⚪',
            color: 'text-slate-500 dark:text-slate-400',
            score: 0.5,
        },
    };
    return config[sentiment];
}

export function CryptoChart({
    data,
    timeframe,
    code = 'BTC',
    name = 'Bitcoin',
    sentiment = 'bearish',
    isLoading = false,
    onTimeframeChange,
    onCodeChange,
    availableCodes,
    onUseForAI,
    currentPrice: overridePrice,
}: CryptoChartProps) {
    // Theme removed - CandlestickChart handles its own dark mode

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

    const lastClose = data[data.length - 1]?.close || 0;
    const currentPrice = overridePrice || lastClose;
    const previousPrice = data[0]?.close || currentPrice;
    const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
    const priceChangeAbsolute = currentPrice - previousPrice;

    const stats = {
        open: data[0]?.open || currentPrice,
        high: Math.max(...data.map((d) => d.high || d.close)),
        low: Math.min(...data.map((d) => d.low || d.close)),
        volume: data.reduce((sum, d) => sum + (d.volume || 0), 0),
    };

    const isBullish = priceChange >= 0;
    const sentimentData = getSentimentData(sentiment);

    return (
        <div
            className="space-y-4"
            role="img"
            aria-label={`Crypto price chart for ${code}`}
        >
            {/* HEADER SECTION */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">{name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{code}</p>
                </div>

                {/* Crypto Type + Timeframe Controls */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Crypto Type Selector */}
                    {onCodeChange && (
                        <select
                            value={code}
                            onChange={(e) => onCodeChange(e.target.value)}
                            className="px-3 py-2 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-200 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all w-full sm:w-auto min-h-[44px] sm:min-h-0"
                            aria-label="Select Crypto type"
                        >
                            {(availableCodes || DEFAULT_Crypto_CODES).map((opt) => (
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
                <div className="flex items-baseline gap-3">
                    <PriceAnimated
                        value={currentPrice}
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
                </div>

                <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>O: ${stats.open.toFixed(2)}</span>
                    <span>H: ${stats.high.toFixed(2)}</span>
                    <span>L: ${stats.low.toFixed(2)}</span>
                    <span>V: {formatVolume(stats.volume)}</span>
                </div>
            </div>

            {/* CANDLESTICK CHART */}
            <CandlestickChart
                data={data.map((p) => ({
                    timestamp: p.timestamp,
                    open: p.open ?? p.close,
                    high: p.high ?? p.close,
                    low: p.low ?? p.close,
                    close: p.close,
                })) as CandlePoint[]}
                timeframe={timeframe}
                height={320}
            />

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
                        )}`}
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
        </div>
    );
}

