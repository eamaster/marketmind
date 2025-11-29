import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { QuickSwitcher } from './QuickSwitcher';
import { Watchlist } from './Watchlist';
import { MarketOverview } from './MarketOverview';

interface SidebarProps {
    activeAsset: 'stock' | 'oil' | 'metal';
    onAssetChange: (asset: 'stock' | 'oil' | 'metal') => void;
    onSymbolClick?: (symbol: string) => void;
    className?: string;
}

export function Sidebar({
    activeAsset,
    onAssetChange,
    onSymbolClick,
    className = '',
}: SidebarProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <aside
            className={`relative w-72 bg-slate-900/50 border-r border-slate-800 flex-shrink-0 ${isExpanded ? '' : 'w-0 overflow-hidden'
                } transition-all duration-300 ${className}`}
            role="complementary"
            aria-label="Market sidebar"
        >
            {/* Collapse/Expand Button */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="absolute -right-3 top-6 z-10 p-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors shadow-lg"
                aria-label="Toggle sidebar"
                aria-expanded={isExpanded}
            >
                {isExpanded ? (
                    <ChevronLeft className="w-4 h-4" />
                ) : (
                    <ChevronRight className="w-4 h-4" />
                )}
            </button>

            {/* Sidebar Content */}
            <div className="h-full overflow-y-auto p-4 space-y-6">
                {/* Quick Switcher */}
                <QuickSwitcher activeAsset={activeAsset} onAssetChange={onAssetChange} />

                {/* Watchlist - Hidden on mobile */}
                <div className="hidden md:block">
                    <Watchlist onSymbolClick={onSymbolClick} />
                </div>

                {/* Market Overview - Hidden on mobile */}
                <div className="hidden md:block">
                    <MarketOverview />
                </div>
            </div>
        </aside>
    );
}
