import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { PricePoint, Timeframe } from '../../services/types';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';

interface OilChartProps {
    data: PricePoint[] | null;
    timeframe: Timeframe;
    isLoading: boolean;
    error: Error | null;
    onRetry?: () => void;
}

export function OilChart({ data, timeframe, isLoading, error, onRetry }: OilChartProps) {
    if (isLoading) return <LoadingState />;
    if (error) return <ErrorState error={error} onRetry={onRetry} />;
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-64 text-gray-500">No data available</div>;
    }

    const chartData = data.map(point => ({
        timestamp: formatTimestamp(point.timestamp, timeframe),
        price: point.close,
    }));

    return (
        <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="timestamp"
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        tickLine={{ stroke: '#e5e7eb' }}
                        domain={['auto', 'auto']}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            padding: '8px',
                        }}
                        formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
                    />
                    <Line
                        type="monotone"
                        dataKey="price"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function formatTimestamp(timestamp: string, timeframe: Timeframe): string {
    const date = new Date(timestamp);
    if (timeframe === '1D') {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
