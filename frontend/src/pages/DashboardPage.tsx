import { useState, useEffect } from 'react';
import { StockChart } from '../components/charts/StockChart';
import { CryptoChart } from '../components/charts/CryptoChart';
import { GoldChart } from '../components/charts/GoldChart';
import { GlassCard } from '../components/shared/GlassCard';
import { ChartErrorBoundary } from '../components/shared/ChartErrorBoundary';
import { CacheTimestamp } from '../components/shared/CacheTimestamp';
import { BottomPerformance } from '../components/layout/BottomPerformance';
import { useAssetData } from '../hooks/useAssetData';
import { useNews } from '../hooks/useNews';
import type { Timeframe, StockSymbol, CryptoSymbol, MetalSymbol, PricePoint, NewsArticle } from '../services/types';

interface DashboardPageProps {
    activeAsset?: 'stock' | 'crypto' | 'metal';
    onUseForAI?: () => void;
    onContextUpdate?: (context: {
        assetType: 'stock' | 'crypto' | 'metal';
        symbol: string;
        timeframe: Timeframe;
        chartData: PricePoint[];
        news: NewsArticle[];
    }) => void;
}

export function DashboardPage({ activeAsset = 'stock', onUseForAI, onContextUpdate }: DashboardPageProps) {
    // Symbol to company name mapping
    const stockNameMap: Record<StockSymbol, string> = {
        'AAPL': 'Apple Inc.',
        'TSLA': 'Tesla Inc.',
        'NVDA': 'NVIDIA Corp.',
        'MSFT': 'Microsoft Corp.',
        'GOOGL': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.',
        'META': 'Meta Platforms Inc.',
    };

    const cryptoNameMap: Record<CryptoSymbol, string> = {
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'SOL': 'Solana',
        'BNB': 'Binance Coin',
        'XRP': 'Ripple',
        'ADA': 'Cardano',
        'DOGE': 'Dogecoin',
        'MATIC': 'Polygon',
    };

    // State for all three asset types
    const [stockSymbol, setStockSymbol] = useState<StockSymbol>('AAPL');
    const [stockTimeframe, setStockTimeframe] = useState<Timeframe>('1D');

    const [CryptoSymbol, setCryptoSymbol] = useState<CryptoSymbol>('BTC');
    const [cryptoTimeframe, setcryptoTimeframe] = useState<Timeframe>('1D');

    const [metalSymbol, setMetalSymbol] = useState<MetalSymbol>('XAU');
    const [metalTimeframe, setMetalTimeframe] = useState<Timeframe>('1D');

    // Fetch data only for active asset to save API calls
    const stockData = useAssetData({
        assetType: 'stock',
        symbol: stockSymbol,
        timeframe: stockTimeframe,
    });
    const cryptoData = useAssetData({
        assetType: 'crypto',
        symbol: CryptoSymbol,
        timeframe: cryptoTimeframe,
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
    const cryptoNews = useNews({
        assetType: 'crypto',
        symbol: CryptoSymbol,
        timeframe: cryptoTimeframe,
    });
    const metalNews = useNews({
        assetType: 'metal',
        symbol: metalSymbol,
        timeframe: metalTimeframe,
    });

    // Sync context to parent for AI Analyst
    useEffect(() => {
        if (!onContextUpdate) return;

        if (activeAsset === 'stock') {
            onContextUpdate({
                assetType: 'stock',
                symbol: stockSymbol,
                timeframe: stockTimeframe,
                chartData: stockData.data || [],
                news: stockNews.articles || [],
            });
        } else if (activeAsset === 'crypto') {
            onContextUpdate({
                assetType: 'crypto',
                symbol: CryptoSymbol,
                timeframe: cryptoTimeframe,
                chartData: cryptoData.data || [],
                news: cryptoNews.articles || [],
            });
        } else if (activeAsset === 'metal') {
            onContextUpdate({
                assetType: 'metal',
                symbol: metalSymbol,
                timeframe: metalTimeframe,
                chartData: metalData.data || [],
                news: metalNews.articles || [],
            });
        }
    }, [
        activeAsset,
        onContextUpdate,
        // Stock deps
        stockSymbol, stockTimeframe, stockData.data, stockNews.articles,
        // crypto deps
        CryptoSymbol, cryptoTimeframe, cryptoData.data, cryptoNews.articles,
        // Metal deps
        metalSymbol, metalTimeframe, metalData.data, metalNews.articles
    ]);

    const activeError = activeAsset === 'stock' ? stockData.error
        : activeAsset === 'crypto' ? cryptoData.error
            : metalData.error;

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {activeError && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-2" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                        <strong className="font-bold block">API Error</strong>
                        <span className="block sm:inline">{activeError.message}</span>
                        {(activeError.message.includes('429') || activeError.message.includes('Rate limit')) && (
                            <span className="block text-sm mt-1 opacity-90">You have reached the API rate limit. Please wait a moment or upgrade your plan.</span>
                        )}
                    </div>
                </div>
            )}

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
                                    companyName={stockNameMap[stockSymbol]}
                                    sentiment={stockNews.sentiment?.label || 'neutral'}
                                    isLoading={stockData.isLoading}
                                    error={stockData.error}
                                    onTimeframeChange={setStockTimeframe}
                                    onSymbolChange={(newSymbol) => setStockSymbol(newSymbol as any)}
                                    onUseForAI={onUseForAI}
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

                {activeAsset === 'crypto' && (
                    <div role="region" aria-labelledby="chart-title-crypto">
                        <ChartErrorBoundary>
                            <GlassCard>
                                <CryptoChart
                                    data={cryptoData.data}
                                    timeframe={cryptoTimeframe}
                                    code={CryptoSymbol}
                                    name={cryptoNameMap[CryptoSymbol]}
                                    sentiment={cryptoNews.sentiment?.label || 'bearish'}
                                    isLoading={cryptoData.isLoading}
                                    error={cryptoData.error}
                                    onTimeframeChange={setcryptoTimeframe}
                                    onCodeChange={(newCode) => setCryptoSymbol(newCode as any)}
                                    onUseForAI={onUseForAI}
                                    hasOhlc={cryptoData.metadata?.hasOhlc}
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
                                    onSymbolChange={(newSymbol) => setMetalSymbol(newSymbol as any)}
                                    onUseForAI={onUseForAI}
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


