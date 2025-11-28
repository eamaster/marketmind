// Thin fetch wrapper for calling Worker API endpoints

const API_BASE_URL = '/api'; // Always use /api - Vite proxy in dev, same-origin in prod

class ApiError extends Error {
    constructor(
        message: string,
        public status: number,
        public statusText: string
    ) {
        super(message);
        this.name = 'ApiError';
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
