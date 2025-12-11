import type { Env, AssetDataResponse, SentimentSummary, Timeframe } from '../core/types';
import { getGoldPrice } from '../integrations/goldApi';
import { computeSupportResistance } from '../utils/levels';
import { getNews } from '../integrations/marketaux';

export async function handleGoldRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') || 'XAU';
    const timeframe = (url.searchParams.get('timeframe') || '7D') as Timeframe;

    try {
        const data = await getGoldPrice(symbol, timeframe, env);

        // Compute support and resistance levels from candle data
        const { support, resistance } = computeSupportResistance(data);

        // Fetch sentiment from Marketaux
        console.log(`[Gold] Fetching sentiment...`);
        let sentimentData: SentimentSummary | null = null;
        let sentimentError: string | undefined = undefined;

        try {
            const { sentiment } = await getNews('metal', undefined, timeframe, env);
            sentimentData = sentiment;
            console.log(`[Gold] ✅ Sentiment: ${sentiment.label} (score: ${sentiment.score})`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[Gold] ❌ Failed to fetch sentiment:`, errorMessage);
            sentimentError = errorMessage;
            sentimentData = { score: null, label: 'neutral' };
        }

        const response: AssetDataResponse = {
            data,
            metadata: {
                symbol,
                timeframe,
                assetType: 'metal',
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
