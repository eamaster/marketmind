import { Component, type ReactNode, type ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    retryCount: number;
}

export class ChartErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, retryCount: 0 };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Chart Error:', error, errorInfo);
    }

    handleRetry = () => {
        const { retryCount } = this.state;
        const delay = Math.min(3000 * Math.pow(2, retryCount), 12000); // Exponential backoff: 3s, 6s, 12s

        setTimeout(() => {
            this.setState({
                hasError: false,
                error: null,
                retryCount: retryCount + 1,
            });
        }, delay);
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div
                    className="glass-card border-red-500/50 flex flex-col items-center justify-center min-h-[300px] p-6"
                    role="alert"
                    aria-live="assertive"
                >
                    <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                    <h3 className="text-lg font-semibold text-red-400 mb-2">
                        Failed to load chart data
                    </h3>
                    <p className="text-sm text-slate-400 mb-4 text-center">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </p>
                    <button
                        onClick={this.handleRetry}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        aria-label="Retry loading chart"
                    >
                        Retry
                    </button>
                    <p className="text-xs text-slate-500 mt-3">
                        Try switching to a different timeframe if the issue persists
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}
