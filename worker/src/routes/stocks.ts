import type { Env, AssetDataResponse } from '../core/types';
import { getAlphaVantageCandles } from '../integrations/alphavantage';

export async function handleStocksRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') || 'AAPL';
    const timeframe = (url.searchParams.get('timeframe') || '1D') as '1D' | '1W' | '1M';

    if (!symbol || !timeframe) {
        return new Response(JSON.stringify({ error: 'Missing symbol or timeframe' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        // Use Alpha Vantage for candles (Finnhub free tier blocks this)
        const data = await getAlphaVantageCandles(symbol, timeframe, env);

        const response: AssetDataResponse = {
            data,
            metadata: {
                symbol,
                timeframe,
                assetType: 'stock',
            },
        };

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error('[Stocks Route] Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Detect rate limit errors
        const isRateLimit = errorMessage.includes('rate limit') || errorMessage.includes('25 requests');

        return new Response(
            JSON.stringify({
                error: 'Failed to fetch stock data',
                message: errorMessage,
                retryAfter: isRateLimit ? 60 : undefined, // Tell frontend to wait 60 seconds
            }),
            {
                status: isRateLimit ? 429 : 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }
}
