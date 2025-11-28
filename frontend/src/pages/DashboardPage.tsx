import { useState } from 'react';
import { StockChart } from '../components/charts/StockChart';
import { OilChart } from '../components/charts/OilChart';
import { GoldChart } from '../components/charts/GoldChart';
import { AiChatPanel } from '../components/ai/AiChatPanel';
import { SentimentBadge } from '../components/shared/SentimentBadge';
import { TimeframeSelector } from '../components/shared/TimeframeSelector';
import { useAssetData } from '../hooks/useAssetData';
import { useNews } from '../hooks/useNews';
import { useAiAnalyst } from '../hooks/useAiAnalyst';
import { STOCK_SYMBOLS, OIL_CODES, METAL_SYMBOLS, ASSET_DISPLAY_NAMES } from '../config/assets';
import type { Timeframe, StockSymbol, OilCode, MetalSymbol } from '../services/types';

export function DashboardPage() {
    // Stocks state
    const [stockSymbol, setStockSymbol] = useState<StockSymbol>('AAPL');
    const [stockTimeframe, setStockTimeframe] = useState<Timeframe>('1D');

    // Oil state
    const [oilCode, setOilCode] = useState<OilCode>('WTI_USD');
    const [oilTimeframe, setOilTimeframe] = useState<Timeframe>('1D');

    // Metal state
    const [metalSymbol, setMetalSymbol] = useState<MetalSymbol>('XAU');
    const [metalTimeframe, setMetalTimeframe] = useState<Timeframe>('1D');

    // Currently active asset for AI context
    const [activeAsset, setActiveAsset] = useState<'stock' | 'oil' | 'metal'>('stock');

    // Fetch data for all assets
    const stockData = useAssetData({ assetType: 'stock', symbol: stockSymbol, timeframe: stockTimeframe });
    const oilData = useAssetData({ assetType: 'oil', symbol: oilCode, timeframe: oilTimeframe });
    const metalData = useAssetData({ assetType: 'metal', symbol: metalSymbol, timeframe: metalTimeframe });

    // Fetch news for all assets
    const stockNews = useNews({ assetType: 'stock', symbol: stockSymbol, timeframe: stockTimeframe });
    const oilNews = useNews({ assetType: 'oil', symbol: oilCode, timeframe: oilTimeframe });
    const metalNews = useNews({ assetType: 'metal', symbol: metalSymbol, timeframe: metalTimeframe });

    // AI analyst for the active asset
    const getCurrentContext = () => {
        if (activeAsset === 'stock') {
            return {
                assetType: 'stock' as const,
                symbol: stockSymbol,
                timeframe: stockTimeframe,
                chartData: stockData.data || [],
                news: stockNews.articles,
            };
        } else if (activeAsset === 'oil') {
            return {
                assetType: 'oil' as const,
                symbol: oilCode,
                timeframe: oilTimeframe,
                chartData: oilData.data || [],
                news: oilNews.articles,
            };
        } else {
            return {
                assetType: 'metal' as const,
                symbol: metalSymbol,
                timeframe: metalTimeframe,
                chartData: metalData.data || [],
                news: metalNews.articles,
            };
        }
    };

    const aiAnalyst = useAiAnalyst(getCurrentContext());

    return (
        <div className="space-y-6">
            {/* Stocks Panel */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900">📈 Stocks</h2>
                        <select
                            value={stockSymbol}
                            onChange={(e) => setStockSymbol(e.target.value as StockSymbol)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {STOCK_SYMBOLS.map((symbol) => (
                                <option key={symbol} value={symbol}>
                                    {ASSET_DISPLAY_NAMES[symbol]} ({symbol})
                                </option>
                            ))}
                        </select>
                        <TimeframeSelector value={stockTimeframe} onChange={setStockTimeframe} />
                    </div>
                    <div className="flex items-center gap-3">
                        <SentimentBadge sentiment={stockNews.sentiment} />
                        <button
                            onClick={() => setActiveAsset('stock')}
                            className={`px-3 py-1 rounded text-sm font-medium ${activeAsset === 'stock'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Use for AI
                        </button>
                    </div>
                </div>
                <StockChart
                    data={stockData.data}
                    timeframe={stockTimeframe}
                    isLoading={stockData.isLoading}
                    error={stockData.error}
                    onRetry={stockData.refetch}
                />
            </div>

            {/* Oil Panel */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900">🛢️ Oil</h2>
                        <select
                            value={oilCode}
                            onChange={(e) => setOilCode(e.target.value as OilCode)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {OIL_CODES.map((code) => (
                                <option key={code} value={code}>
                                    {ASSET_DISPLAY_NAMES[code]}
                                </option>
                            ))}
                        </select>
                        <TimeframeSelector value={oilTimeframe} onChange={setOilTimeframe} />
                    </div>
                    <div className="flex items-center gap-3">
                        <SentimentBadge sentiment={oilNews.sentiment} />
                        <button
                            onClick={() => setActiveAsset('oil')}
                            className={`px-3 py-1 rounded text-sm font-medium ${activeAsset === 'oil'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Use for AI
                        </button>
                    </div>
                </div>
                <OilChart
                    data={oilData.data}
                    timeframe={oilTimeframe}
                    isLoading={oilData.isLoading}
                    error={oilData.error}
                    onRetry={oilData.refetch}
                />
            </div>

            {/* Precious Metals Panel */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-900">💰 Precious Metals</h2>
                        <select
                            value={metalSymbol}
                            onChange={(e) => setMetalSymbol(e.target.value as MetalSymbol)}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {METAL_SYMBOLS.map((symbol) => (
                                <option key={symbol} value={symbol}>
                                    {ASSET_DISPLAY_NAMES[symbol]} ({symbol})
                                </option>
                            ))}
                        </select>
                        <TimeframeSelector value={metalTimeframe} onChange={setMetalTimeframe} />
                    </div>
                    <div className="flex items-center gap-3">
                        <SentimentBadge sentiment={metalNews.sentiment} />
                        <button
                            onClick={() => setActiveAsset('metal')}
                            className={`px-3 py-1 rounded text-sm font-medium ${activeAsset === 'metal'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Use for AI
                        </button>
                    </div>
                </div>
                <GoldChart
                    data={metalData.data}
                    timeframe={metalTimeframe}
                    isLoading={metalData.isLoading}
                    error={metalData.error}
                    onRetry={metalData.refetch}
                />
            </div>

            {/* AI Chat Panel */}
            <div className="lg:sticky lg:top-24">
                <AiChatPanel
                    messages={aiAnalyst.messages}
                    onSendQuestion={aiAnalyst.sendQuestion}
                    isLoading={aiAnalyst.isLoading}
                    currentContext={{
                        assetType: activeAsset,
                        symbol: getCurrentContext().symbol || activeAsset.toUpperCase(),
                        timeframe: getCurrentContext().timeframe,
                    }}
                />
            </div>
        </div>
    );
}
