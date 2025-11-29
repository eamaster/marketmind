import { Moon, Settings, Menu } from 'lucide-react';
import { ApiStatusIndicator } from '../shared/ApiStatusIndicator';

interface NavbarProps {
    onMenuClick?: () => void;
}

export function Navbar({ onMenuClick }: NavbarProps) {
    return (
        <nav
            className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900/95 backdrop-blur-md border-b border-slate-800"
            role="navigation"
            aria-label="Main navigation"
        >
            {/* Left Side - Menu & Logo */}
            <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="p-2 -ml-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors xl:hidden"
                    aria-label="Open menu"
                >
                    <Menu size={24} />
                </button>

                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-900/20">
                        M
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">MarketMind</h1>
                        <p className="text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide">Real-Time Intelligence</p>
                    </div>
                </div>
            </div>

            {/* Right Side - API Status & Settings */}
            <div className="flex items-center gap-2 sm:gap-4">
                {/* API Status Indicator */}
                <ApiStatusIndicator />

                {/* Theme Toggle */}
                <button
                    className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
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
