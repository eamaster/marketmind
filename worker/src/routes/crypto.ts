// worker/src/routes/crypto.ts
import type { Env } from '../core/types';
import { getCoinGeckoCryptoCandles } from '../integrations/coingecko';
import type { Timeframe } from '../core/types';

export async function handleCryptoRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') || 'BTC';
    const timeframe = (url.searchParams.get('timeframe') || '1D') as Timeframe;

    console.log(`[Crypto Route] Request (CoinGecko): ${symbol} ${timeframe}`);

    try {
        const { data, hasOhlc } = await getCoinGeckoCryptoCandles(symbol, timeframe, env);

        const response = {
            data,
            metadata: {
                symbol,
                timeframe,
                assetType: 'crypto' as const,
                source: 'coingecko',
                count: data.length,
                hasOhlc, // Flag to indicate if OHLC data or price-only data
            },
        };

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error('[Crypto Route] ERROR (CoinGecko):', error);

        return new Response(
            JSON.stringify({
                error: 'Failed to fetch crypto data from CoinGecko',
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
