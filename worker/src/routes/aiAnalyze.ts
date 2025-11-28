import type { Env, AiAnalyzeRequest, AiAnalyzeResponse } from '../core/types';
import { buildPrompt } from '../core/promptBuilder';
import { analyzeMarketContext } from '../integrations/gemini';

export async function handleAiAnalyzeRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    try {
        const body: AiAnalyzeRequest = await request.json();
        const { assetType, symbol, timeframe, chartData, news, question } = body;

        // Validate required fields
        if (!assetType || !timeframe || !chartData || !news || !question) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', ...corsHeaders },
                }
            );
        }

        // Build structured prompt
        const prompt = buildPrompt({
            assetType,
            symbol,
            timeframe,
            chartData,
            news,
            question,
        });

        // Call Gemini
        const answer = await analyzeMarketContext(
            { assetType, symbol, timeframe, chartData, news, question },
            prompt,
            env
        );

        const response: AiAnalyzeResponse = { answer };

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error('AI Analyze error:', error);
        return new Response(
            JSON.stringify({
                error: 'Failed to analyze market data',
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
