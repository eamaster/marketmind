export function TopBar() {
    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            MarketMind
                        </h1>
                        <span className="ml-3 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            Financial Intelligence
                        </span>
                    </div>
                    <div className="text-sm text-gray-600">
                        Real-time Market Analytics
                    </div>
                </div>
            </div>
        </header>
    );
}
