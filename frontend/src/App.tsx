import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardPage } from './pages/DashboardPage';
import { MainLayout } from './components/layout/MainLayout';
import { Sidebar } from './components/layout/Sidebar';
import { AiChatPanel } from './components/ai/AiChatPanel';
import { NewsTicker } from './components/layout/NewsTicker';
import { MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { useNews } from './hooks/useNews';
import { useAiAnalyst } from './hooks/useAiAnalyst';
import type { Timeframe } from './services/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function AppContent() {
  const [activeAsset, setActiveAsset] = useState<'stock' | 'oil' | 'metal'>('stock');
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Fetch news for news ticker
  const stockNews = useNews({ assetType: 'stock', symbol: 'AAPL', timeframe: '1D' });

  // AI Context State
  const [aiContext, setAiContext] = useState<{
    assetType: 'stock' | 'oil' | 'metal';
    symbol: string;
    timeframe: Timeframe;
    chartData: any[];
    news: any[];
  }>({
    assetType: 'stock',
    symbol: 'AAPL',
    timeframe: '1D',
    chartData: [],
    news: [],
  });

  const aiAnalyst = useAiAnalyst(aiContext);

  const handleSymbolClick = (symbol: string) => {
    console.log('Symbol clicked:', symbol);
  };

  return (
    <>
      <MainLayout
        sidebar={
          <Sidebar
            activeAsset={activeAsset}
            onAssetChange={setActiveAsset}
            onSymbolClick={handleSymbolClick}
          />
        }
      >
        <DashboardPage
          activeAsset={activeAsset}
          onContextUpdate={setAiContext}
          onUseForAI={() => setIsChatOpen(true)}
        />
      </MainLayout>

      {/* News Ticker - Fixed bottom */}
      <NewsTicker articles={stockNews.articles} />

      {/* Floating Chat Widget Button - Bottom Right */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 z-50 p-4 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-2xl shadow-blue-600/40 hover:shadow-blue-600/60 hover:scale-110 transition-all duration-300 group"
          aria-label="Open AI Market Analyst"
        >
          <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
        </button>
      )}

      {/* AI Chat Panel Overlay - Slides in from right */}
      {isChatOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsChatOpen(false)}
            aria-hidden="true"
          />

          {/* Chat Panel */}
          <div className="fixed right-0 top-[65px] bottom-0 w-full sm:w-96 bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-out border-l border-slate-800">
            {/* AI Chat Panel Content */}
            <div className="h-full">
              <AiChatPanel
                messages={aiAnalyst.messages}
                onSendQuestion={aiAnalyst.sendQuestion}
                isLoading={aiAnalyst.isLoading}
                currentContext={{
                  assetType: aiContext.assetType,
                  symbol: aiContext.symbol,
                  timeframe: aiContext.timeframe,
                }}
                onClose={() => setIsChatOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
