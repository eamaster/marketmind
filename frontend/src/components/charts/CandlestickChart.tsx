import React from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    Bar,
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

interface CandleShapeProps {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: CandlePoint;
    [key: string]: any;
}

const CandleShape: React.FC<CandleShapeProps> = (props) => {
    const { x = 0, width = 0, payload } = props;

    if (!payload || width === 0) return null;

    const { open, close, high, low } = payload;

    // Get the Y-axis scale from props (Recharts passes this)
    const yAxis = props.yAxis;
    if (!yAxis || !yAxis.scale) return null;

    const scale = yAxis.scale;

    // Convert prices to pixel positions
    const yHigh = scale(high);
    const yLow = scale(low);
    const yOpen = scale(open);
    const yClose = scale(close);

    // Determine if candle is up or down
    const isUp = close >= open;
    const upColor = '#10b981'; // Green
    const downColor = '#ef4444'; // Red
    const color = isUp ? upColor : downColor;

    // Body dimensions
    const bodyTop = Math.min(yOpen, yClose);
    const bodyBottom = Math.max(yOpen, yClose);
    const bodyHeight = Math.abs(bodyBottom - bodyTop);
    const minBodyHeight = 1; // Ensure visibility even when open === close

    // Center x position for wick
    const xCenter = x + width / 2;

    return (
        <g>
            {/* Wick (high-low line) */}
            <line
                x1={xCenter}
                x2={xCenter}
                y1={yHigh}
                y2={yLow}
                stroke={color}
                strokeWidth={1}
            />

            {/* Body (open-close rect) */}
            <rect
                x={x + width * 0.2}
                y={bodyTop}
                width={width * 0.6}
                height={Math.max(bodyHeight, minBodyHeight)}
                fill={color}
                stroke={color}
                strokeWidth={1}
            />
        </g>
    );
};

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

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;

        const data = payload[0].payload as CandlePoint;
        const isUp = data.close >= data.open;

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
                    {new Date(data.timestamp).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                    })}
                </div>
                <div style={{ color: isUp ? '#10b981' : '#ef4444', fontWeight: 'bold' }}>
                    {isUp ? '▲' : '▼'} ${data.close.toFixed(2)}
                </div>
                <div style={{ marginTop: '4px', fontSize: '11px' }}>
                    <div>O: ${data.open.toFixed(2)}</div>
                    <div>H: ${data.high.toFixed(2)}</div>
                    <div>L: ${data.low.toFixed(2)}</div>
                    <div>C: ${data.close.toFixed(2)}</div>
                </div>
            </div>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={height}>
            <ComposedChart data={data}>
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

                {/* Use Bar with custom shape for candlesticks */}
                <Bar
                    dataKey="close"
                    yAxisId="price"
                    shape={(props: any) => <CandleShape {...props} />}
                    isAnimationActive={false}
                />
            </ComposedChart>
        </ResponsiveContainer>
    );
};

export default CandlestickChart;
