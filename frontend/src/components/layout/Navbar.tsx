import { Moon, Settings } from 'lucide-react';
import { ApiStatusIndicator } from '../shared/ApiStatusIndicator';

export function Navbar() {
    return (
        <nav
            className="sticky top-0 z-40 flex items-center justify-between px-6 py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800"
            role="navigation"
            aria-label="Main navigation"
        >
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xl">
                    M
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white">MarketMind</h1>
                    <p className="text-xs text-slate-400">Real-Time Market Intelligence</p>
                </div>
            </div>

            {/* Right Side - API Status & Settings */}
            <div className="flex items-center gap-4">
                {/* API Status Indicator */}
                <ApiStatusIndicator />

                {/* Theme Toggle */}
                <button
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Toggle dark mode"
                >
                    <Moon size={20} />
                </button>

                {/* Settings */}
                <button
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    aria-label="Settings"
                >
                    <Settings size={20} />
                </button>
            </div>
        </nav>
    );
}
