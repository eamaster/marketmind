import type { Env, AssetDataResponse } from '../core/types';
import { getOilPrice } from '../integrations/oilprice';

export async function handleOilRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const code = url.searchParams.get('code') || 'WTI_USD';
    const timeframe = (url.searchParams.get('timeframe') || '1D') as '1D' | '1W' | '1M';

    try {
        const data = await getOilPrice(code, timeframe, env);

        const response: AssetDataResponse = {
            data,
            metadata: {
                symbol: code,
                timeframe,
                assetType: 'oil',
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
                error: 'Failed to fetch oil data',
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
