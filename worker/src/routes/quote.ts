import type { Env } from '../core/types';
import { getStockQuote } from '../integrations/twelvedata';
import { getGoldQuote } from '../integrations/goldApi';

export async function handleQuoteRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');

    if (!symbol) {
        return new Response(
            JSON.stringify({ error: 'Symbol parameter is required' }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }

    try {
        let data;
        if (symbol === 'XAU' || symbol === 'XAG') {
            data = await getGoldQuote(symbol, env);
        } else {
            data = await getStockQuote(symbol, env);
        }

        return new Response(JSON.stringify(data), {
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
                error: 'Failed to fetch quote',
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
