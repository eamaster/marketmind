export function Footer() {
    return (
        <footer className="w-full py-6 mt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    © {new Date().getFullYear()} MarketMind. Real-Time Intelligence.
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500 max-w-md px-4 leading-relaxed">
                    Powered by <span className="font-semibold text-slate-600 dark:text-slate-400">Finnhub</span> (Stocks),{' '}
                    <span className="font-semibold text-slate-600 dark:text-slate-400">OilPriceAPI</span> (Oil),{' '}
                    <span className="font-semibold text-slate-600 dark:text-slate-400">GoldAPI</span> (Metals), and{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400">Google Gemini</span> (AI Analysis).
                </p>
            </div>
        </footer>
    );
}
