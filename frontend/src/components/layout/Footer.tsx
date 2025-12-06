export function Footer() {
    return (
        <footer className="w-full mt-auto">
            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent w-full my-8" />

            <div className="flex flex-col items-center justify-center gap-4 text-center pb-8 px-4">
                {/* Brand & Copyright */}
                <div className="flex flex-col items-center gap-1">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 tracking-wide">
                        MARKETMIND
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                        © {new Date().getFullYear()} Real-Time Intelligence. All rights reserved.
                    </p>
                </div>

                {/* Data Sources Badge */}
                <div className="bg-slate-100 dark:bg-slate-800/50 rounded-full px-4 py-1.5 border border-slate-200 dark:border-slate-700/50">
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Powered by <span className="font-medium text-slate-700 dark:text-slate-300">Massive Data</span>,{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-300">Finnhub</span>,{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-300">GoldAPI</span> &{' '}
                        <span className="font-medium text-blue-600 dark:text-blue-400">Google Gemini</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
