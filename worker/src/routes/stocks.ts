import type { Env, AssetDataResponse } from '../core/types';
import { getStockCandles } from '../integrations/finnhub';

export async function handleStocksRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') || 'AAPL';
    const timeframe = (url.searchParams.get('timeframe') || '1D') as '1D' | '1W' | '1M';

    try {
        const data = await getStockCandles(symbol, timeframe, env);

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
        return new Response(
            JSON.stringify({
                error: 'Failed to fetch stock data',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }
}
