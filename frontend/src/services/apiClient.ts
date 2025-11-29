// Thin fetch wrapper for calling Worker API endpoints

// In development: use Vite proxy (/api -> localhost:8787)
// In production (GitHub Pages): use deployed Cloudflare Worker
const API_BASE_URL = import.meta.env.DEV
    ? '/api'
    : 'https://marketmind-worker.smah0085.workers.dev/api';

class ApiError extends Error {
    status: number;
    statusText: string;

    constructor(
        message: string,
        status: number,
        statusText: string
    ) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.statusText = statusText;
    }
}

async function fetchApi<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new ApiError(
                `API request failed: ${response.statusText}`,
                response.status,
                response.statusText
            );
        }

        return await response.json();
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        throw new Error(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// API client methods
export const apiClient = {
    // Fetch asset data (stocks, oil, or metals)
    getAssetData: (params: {
        assetType: 'stock' | 'oil' | 'metal';
        symbol: string;
        timeframe: '1D' | '1W' | '1M';
    }) => {
        const { assetType, symbol, timeframe } = params;
        const endpoint =
            assetType === 'stock'
                ? `/stocks?symbol=${symbol}&timeframe=${timeframe}`
                : assetType === 'oil'
                    ? `/oil?code=${symbol}&timeframe=${timeframe}`
                    : `/gold?symbol=${symbol}&timeframe=${timeframe}`;
        return fetchApi<any>(endpoint);
    },

    // Fetch single quote
    getQuote: (symbol: string) => {
        return fetchApi<{ price: number; change: number; changePercent: number }>(`/quote?symbol=${symbol}`);
    },

    // Fetch news and sentiment
    getNews: (params: {
        assetType: 'stock' | 'oil' | 'metal';
        symbol?: string;
        timeframe: '1D' | '1W' | '1M';
    }) => {
        const { assetType, symbol, timeframe } = params;
        const query = new URLSearchParams({
            assetType,
            timeframe,
            ...(symbol && { symbol }),
        });
        return fetchApi<any>(`/news?${query}`);
    },

    // Send AI analysis request
    analyzeWithAi: (data: {
        assetType: 'stock' | 'oil' | 'metal';
        symbol?: string;
        timeframe: '1D' | '1W' | '1M';
        chartData: any[];
        news: any[];
        question: string;
    }) => {
        return fetchApi<{ answer: string }>('/ai/analyze', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    // Health check
    healthCheck: () => {
        return fetchApi<{ status: string }>('/health');
    },
};

export { ApiError };
