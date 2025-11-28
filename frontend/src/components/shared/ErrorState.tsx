interface ErrorStateProps {
    error: Error;
    onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="text-red-500 text-5xl">⚠️</div>
            <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900">Something went wrong</h3>
                <p className="text-sm text-gray-600 mt-1">{error.message}</p>
            </div>
            {onRetry && (
                <button onClick={onRetry} className="btn-primary">
                    Try Again
                </button>
            )}
        </div>
    );
}
