interface QuickSwitcherProps {
    activeAsset: 'stock' | 'oil' | 'metal';
    onAssetChange: (asset: 'stock' | 'oil' | 'metal') => void;
}

const ASSET_OPTIONS = [
    { id: 'stock' as const, label: 'Stocks', emoji: '📈' },
    { id: 'oil' as const, label: 'Oil', emoji: '🛢️' },
    { id: 'metal' as const, label: 'Precious Metals', emoji: '💰' },
];

export function QuickSwitcher({ activeAsset, onAssetChange }: QuickSwitcherProps) {
    return (
        <div className="space-y-2" role="tablist" aria-label="Asset type selection">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3">
                Quick Switcher
            </h3>
            <div className="space-y-1">
                {ASSET_OPTIONS.map((option) => {
                    const isActive = activeAsset === option.id;
                    return (
                        <button
                            key={option.id}
                            onClick={() => onAssetChange(option.id)}
                            role="tab"
                            aria-selected={isActive}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                                    ? 'bg-blue-600 text-white border-l-4 border-blue-400 shadow-lg shadow-blue-600/20'
                                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                }`}
                        >
                            <span className="text-lg">{option.emoji}</span>
                            <span className="text-sm font-medium">{option.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
