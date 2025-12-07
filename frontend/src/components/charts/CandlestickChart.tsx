import React from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Area,
} from 'recharts';
import type { Timeframe } from '../../services/types';
import { useTheme } from '../../hooks/useTheme';

export interface CandlePoint {
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface CandlestickChartProps {
    data: CandlePoint[];
    timeframe: Timeframe;
    height?: number;
}

const CandlestickChart: React.FC<CandlestickChartProps> = ({
    data,
    timeframe,
    height = 320,
}) => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // Format timestamp for x-axis based on timeframe
    const formatXAxis = (timestamp: string) => {
        const date = new Date(timestamp);

        // For multi-day timeframes, show dates
        if (timeframe === '1D' || timeframe === '1W' || timeframe === '1M' || timeframe === '3M' || timeframe === '1Y') {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }

        // For intraday (if ever used), show time
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Custom tooltip with OHLC data
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;

        const point = payload[0].payload;
        const isUp = point.close >= point.open;

        return (
            <div
                style={{
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    color: isDark ? '#f1f5f9' : '#0f172a',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
            >
                <div style={{ marginBottom: '4px', color: isDark ? '#cbd5e1' : '#64748b' }}>
                    {new Date(point.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </div>
                <div style={{ color: isUp ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {isUp ? '▲' : '▼'} ${point.close.toFixed(2)}
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    <div>O: ${point.open.toFixed(2)}</div>
                    <div>H: ${point.high.toFixed(2)}</div>
                    <div>L: ${point.low.toFixed(2)}</div>
                    <div>C: ${point.close.toFixed(2)}</div>
                </div>
            </div>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data}>
                <defs>
                    <linearGradient id="cryptoAreaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>

                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? '#334155' : '#e2e8f0'}
                    opacity={0.3}
                />

                <XAxis
                    dataKey="timestamp"
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                    tickLine={false}
                    tickFormatter={formatXAxis}
                    minTickGap={30}
                />

                <YAxis
                    yAxisId="price"
                    orientation="right"
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    tick={{ fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b' }}
                    tickLine={false}
                    domain={['dataMin', 'dataMax']}
                    width={60}
                />

                <Tooltip content={<CustomTooltip />} />

                {/* Temporary: Area chart with OHLC tooltip */}
                <Area
                    type="monotone"
                    dataKey="close"
                    yAxisId="price"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#cryptoAreaGradient)"
                    isAnimationActive={false}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
};

export default CandlestickChart;
