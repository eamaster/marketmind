import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { QuickSwitcher } from './QuickSwitcher';
import { Watchlist } from './Watchlist';
import { MarketOverview } from './MarketOverview';

interface SidebarProps {
    activeAsset: 'stock' | 'oil' | 'metal';
    onAssetChange: (asset: 'stock' | 'oil' | 'metal') => void;
    onSymbolClick?: (symbol: string) => void;
    className?: string;
    isOpen?: boolean;
    onClose?: () => void;
}

export function Sidebar({
    activeAsset,
    onAssetChange,
    onSymbolClick,
    className = '',
    isOpen = false,
    onClose,
}: SidebarProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Close sidebar on route change or when screen size increases
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1280 && onClose) {
                onClose();
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [onClose]);

    const sidebarContent = (
        <div className={`h-full overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent ${!isExpanded ? 'hidden' : ''}`}>
            {/* Mobile Header with Close Button */}
            <div className="flex items-center justify-between xl:hidden mb-2">
                <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Menu</h2>
                <button
                    onClick={onClose}
                    className="p-2 -mr-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                    aria-label="Close menu"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Quick Switcher */}
            <QuickSwitcher activeAsset={activeAsset} onAssetChange={(asset) => {
                onAssetChange(asset);
                if (window.innerWidth < 1280 && onClose) onClose();
            }} />

            {/* Watchlist - Visible on all screens (controlled by sidebar visibility) */}
            <div>
                <Watchlist onSymbolClick={(symbol) => {
                    if (onSymbolClick) onSymbolClick(symbol);
                    if (window.innerWidth < 1280 && onClose) onClose();
                }} />
            </div>

            {/* Market Overview - Visible on all screens (controlled by sidebar visibility) */}
            <div>
                <MarketOverview />
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed xl:relative z-50 xl:z-0 h-full
                    bg-white/95 dark:bg-slate-900/95 xl:bg-white/50 xl:dark:bg-slate-900/50 
                    border-r border-slate-200 dark:border-slate-800 
                    transition-all duration-300 ease-in-out
                    ${className}
                    
                    /* Mobile: Slide in from left */
                    top-0 left-0 bottom-0 w-72
                    ${isOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'}
                    
                    /* Desktop Collapse State */
                    ${!isExpanded && 'xl:w-0 xl:border-none'}
                `}
                role="complementary"
                aria-label="Market sidebar"
            >
                {/* Desktop Collapse Button */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="hidden xl:flex absolute -right-3 top-6 z-10 p-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-lg"
                    aria-label="Toggle sidebar"
                    aria-expanded={isExpanded}
                >
                    {isExpanded ? (
                        <ChevronLeft className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </button>

                {sidebarContent}
            </aside>
        </>
    );
}
