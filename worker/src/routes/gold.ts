import type { Env, AssetDataResponse } from '../core/types';
import { getGoldPrice } from '../integrations/goldApi';

export async function handleGoldRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') || 'XAU';
    const timeframe = (url.searchParams.get('timeframe') || '1D') as '1D' | '1W' | '1M';

    try {
        const data = await getGoldPrice(symbol, timeframe, env);

        const response: AssetDataResponse = {
            data,
            metadata: {
                symbol,
                timeframe,
                assetType: 'metal',
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
                error: 'Failed to fetch gold data',
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
