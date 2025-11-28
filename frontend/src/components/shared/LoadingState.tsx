export function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading data...</p>
        </div>
    );
}
