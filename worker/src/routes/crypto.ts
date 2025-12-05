// worker/src/routes/crypto.ts
import type { Env } from '../core/types';
import { getMassiveCryptoCandles } from '../integrations/massive';
import type { Timeframe } from '../core/types';

export async function handleCryptoRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') || 'BTC';
    const timeframe = (url.searchParams.get('timeframe') || '1D') as Timeframe;

    console.log(`[Crypto Route] Request: ${symbol} ${timeframe}`);

    try {
        const data = await getMassiveCryptoCandles(symbol, timeframe, env);

        const response = {
            data,
            metadata: {
                symbol,
                timeframe,
                assetType: 'crypto' as const,
                source: 'massive.com',
                count: data.length,
            },
        };

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error('[Crypto Route] ERROR:', error);

        return new Response(
            JSON.stringify({
                error: 'Failed to fetch crypto data',
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
