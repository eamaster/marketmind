import type { Env } from './core/types';

// Router for Worker API endpoints
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers for all responses
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };

        // Handle preflight requests
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        try {
            // Health check endpoint
            if (path === '/api/health' || path === '/health') {
                return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() }, corsHeaders);
            }

            // Oil prices endpoint
            if (path === '/api/oil' && request.method === 'GET') {
                const { handleOilRequest } = await import('./routes/oil');
                return await handleOilRequest(request, env, corsHeaders);
            }

            // Gold/metals prices endpoint
            if (path === '/api/gold' && request.method === 'GET') {
                const { handleGoldRequest } = await import('./routes/gold');
                return await handleGoldRequest(request, env, corsHeaders);
            }

            // Stock prices endpoint
            if (path === '/api/stocks' && request.method === 'GET') {
                const { handleStocksRequest } = await import('./routes/stocks');
                return await handleStocksRequest(request, env, corsHeaders);
            }

            // Quote endpoint (for watchlist)
            if (path === '/api/quote' && request.method === 'GET') {
                const { handleQuoteRequest } = await import('./routes/quote');
                return await handleQuoteRequest(request, env, corsHeaders);
            }

            // News endpoint
            if (path === '/api/news' && request.method === 'GET') {
                const { handleNewsRequest } = await import('./routes/news');
                return await handleNewsRequest(request, env, corsHeaders);
            }

            // TEMPORARY: Test Finnhub API access directly
            if (path === '/api/test-finnhub' && request.method === 'GET') {
                const { testFinnhubCandles } = await import('./integrations/finnhub');
                const result = await testFinnhubCandles(env);
                return new Response(JSON.stringify(result, null, 2), {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                });
            }

            // TEMPORARY: Test Alpha Vantage API access
            if (path === '/api/test-massive' && request.method === 'GET') {
                const { testMassiveCandles } = await import('./integrations/massive');
                const result = await testMassiveCandles(env);
                return new Response(JSON.stringify(result, null, 2), {
                    headers: {
                        'Content-Type': 'application/json',
                        ...corsHeaders,
                    },
                });
            }

            // AI analysis endpoint
            if (path === '/api/ai/analyze' && request.method === 'POST') {
                const { handleAiAnalyzeRequest } = await import('./routes/aiAnalyze');
                return await handleAiAnalyzeRequest(request, env, corsHeaders);
            }

            // 404 for unknown routes
            return jsonResponse(
                { error: 'Not Found', path },
                corsHeaders,
                404
            );
        } catch (error) {
            console.error('Worker error:', error);
            return jsonResponse(
                {
                    error: 'Internal Server Error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                },
                corsHeaders,
                500
            );
        }
    },
};

// Helper to create JSON responses
function jsonResponse(data: any, headers: Record<string, string> = {}, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...headers,
        },
    });
}
