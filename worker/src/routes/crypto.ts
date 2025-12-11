// worker/src/routes/crypto.ts
import type { Env, SentimentSummary, Timeframe } from '../core/types';
import { getCoinGeckoCryptoCandles } from '../integrations/coingecko';
import { computeSupportResistance } from '../utils/levels';
import { getNews } from '../integrations/marketaux';

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

        // Compute support and resistance levels
        const { support, resistance } = computeSupportResistance(data);
        console.log(`[Crypto] Support: ${support}, Resistance: ${resistance}`);

        // Fetch sentiment from Marketaux
        console.log(`[Crypto] Fetching sentiment for ${symbol}...`);
        let sentimentData: SentimentSummary | null = null;
        let sentimentError: string | undefined = undefined;

        try {
            const { sentiment } = await getNews('crypto', symbol, timeframe, env);
            sentimentData = sentiment;
            console.log(`[Crypto] ✅ Sentiment for ${symbol}: ${sentiment.label} (score: ${sentiment.score})`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Crypto] ❌ Failed to fetch sentiment for ${symbol}:`, errorMessage);
            sentimentError = errorMessage;
            sentimentData = { score: null, label: 'neutral' };
        }

        const response = {
            data,
            metadata: {
                symbol,
                timeframe,
                assetType: 'crypto' as const,
                source: 'coingecko',
                count: data.length,
                hasOhlc, // Flag to indicate if OHLC data or price-only data
                support,
                resistance,
                sentiment: sentimentData,
                sentimentError,
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
