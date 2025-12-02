import type { Env, AssetDataResponse } from '../core/types';
import { getStockCandles } from '../integrations/twelvedata';

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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        let status = 500;

        if (errorMessage.includes('429')) {
            status = 429;
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
            status = 401;
        }

        return new Response(
            JSON.stringify({
                error: 'Failed to fetch stock data',
                message: errorMessage,
            }),
            {
                status,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }
}
