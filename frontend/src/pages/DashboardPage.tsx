import { useState } from 'react';
import { StockChart } from '../components/charts/StockChart';
import { OilChart } from '../components/charts/OilChart';
import { GoldChart } from '../components/charts/GoldChart';
import { GlassCard } from '../components/shared/GlassCard';
import { ChartErrorBoundary } from '../components/shared/ChartErrorBoundary';
import { CacheTimestamp } from '../components/shared/CacheTimestamp';
import { BottomPerformance } from '../components/layout/BottomPerformance';
import { useAssetData } from '../hooks/useAssetData';
import { useNews } from '../hooks/useNews';
import type { Timeframe, StockSymbol, OilCode, MetalSymbol } from '../services/types';

interface DashboardPageProps {
    activeAsset?: 'stock' | 'oil' | 'metal';
}

export function DashboardPage({ activeAsset = 'stock' }: DashboardPageProps) {
    // State for all three asset types
    const [stockSymbol, setStockSymbol] = useState<StockSymbol>('AAPL');
    const [stockTimeframe, setStockTimeframe] = useState<Timeframe>('1D');

    const [oilCode, setOilCode] = useState<OilCode>('WTI_USD');
    const [oilTimeframe, setOilTimeframe] = useState<Timeframe>('1D');

    const [metalSymbol, setMetalSymbol] = useState<MetalSymbol>('XAU');
    const [metalTimeframe, setMetalTimeframe] = useState<Timeframe>('1D');

    // Fetch data only for active asset to save API calls
    const stockData = useAssetData({
        assetType: 'stock',
        symbol: stockSymbol,
        timeframe: stockTimeframe,
    });
    const oilData = useAssetData({
        assetType: 'oil',
        symbol: oilCode,
        timeframe: oilTimeframe,
    });
    const metalData = useAssetData({
        assetType: 'metal',
        symbol: metalSymbol,
        timeframe: metalTimeframe,
    });

    // Fetch news for sentiment
    const stockNews = useNews({
        assetType: 'stock',
        symbol: stockSymbol,
        timeframe: stockTimeframe,
    });
    const oilNews = useNews({
        assetType: 'oil',
        symbol: oilCode,
        timeframe: oilTimeframe,
    });
    const metalNews = useNews({
        assetType: 'metal',
        symbol: metalSymbol,
        timeframe: metalTimeframe,
    });

    return (
        <div className="space-y-6">
            {/* Chart Section - Show only the selected asset chart */}
            <div role="main" aria-label="Asset dashboard">
                {activeAsset === 'stock' && (
                    <div role="region" aria-labelledby="chart-title-stock">
                        <ChartErrorBoundary>
                            <GlassCard>
                                <StockChart
                                    data={stockData.data}
                                    timeframe={stockTimeframe}
                                    symbol={stockSymbol}
                                    companyName="Apple Inc."
                                    sentiment={stockNews.sentiment?.label || 'neutral'}
                                    isLoading={stockData.isLoading}
                                    error={stockData.error}
                                    onTimeframeChange={setStockTimeframe}
                                />
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                    <CacheTimestamp
                                        timestamp={new Date().toISOString()}
                                        isCached={false}
                                        isApproachingLimit={false}
                                    />
                                </div>
                            </GlassCard>
                        </ChartErrorBoundary>
                    </div>
                )}

                {activeAsset === 'oil' && (
                    <div role="region" aria-labelledby="chart-title-oil">
                        <ChartErrorBoundary>
                            <GlassCard>
                                <OilChart
                                    data={oilData.data}
                                    timeframe={oilTimeframe}
                                    code={oilCode}
                                    name="Crude Oil Futures"
                                    sentiment={oilNews.sentiment?.label || 'bearish'}
                                    isLoading={oilData.isLoading}
                                    error={oilData.error}
                                    onTimeframeChange={setOilTimeframe}
                                />
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                    <CacheTimestamp
                                        timestamp={new Date().toISOString()}
                                        isCached={false}
                                        isApproachingLimit={false}
                                    />
                                </div>
                            </GlassCard>
                        </ChartErrorBoundary>
                    </div>
                )}

                {activeAsset === 'metal' && (
                    <div role="region" aria-labelledby="chart-title-gold">
                        <ChartErrorBoundary>
                            <GlassCard>
                                <GoldChart
                                    data={metalData.data}
                                    timeframe={metalTimeframe}
                                    symbol={metalSymbol === 'XAU' ? 'XAU/USD' : 'XAG/USD'}
                                    name={metalSymbol === 'XAU' ? 'Gold Spot' : 'Silver Spot'}
                                    sentiment={metalNews.sentiment?.label || 'neutral'}
                                    isLoading={metalData.isLoading}
                                    error={metalData.error}
                                    onTimeframeChange={setMetalTimeframe}
                                />
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                    <CacheTimestamp
                                        timestamp={new Date().toISOString()}
                                        isCached={false}
                                        isApproachingLimit={false}
                                    />
                                </div>
                            </GlassCard>
                        </ChartErrorBoundary>
                    </div>
                )}
            </div>

            {/* Market Performance Section - Below Chart */}
            <div>
                <BottomPerformance />
            </div>
        </div>
    );
}
