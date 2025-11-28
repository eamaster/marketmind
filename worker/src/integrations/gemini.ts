import type { Env, PricePoint, NewsArticle } from '../core/types';

// Google Gemini API client
// Docs: https://ai.google.dev/gemini-api/docs

interface AnalyzeInput {
    assetType: 'stock' | 'oil' | 'metal';
    symbol?: string;
    timeframe: '1D' | '1W' | '1M';
    chartData: PricePoint[];
    news: NewsArticle[];
    question: string;
}

export async function analyzeMarketContext(
    input: AnalyzeInput,
    prompt: string,
    env: Env
): Promise<string> {
    const apiKey = env.GEMINI_API_KEY;

    if (!apiKey) {
        console.warn('GEMINI_API_KEY not configured, returning mock response');
        return getMockAnalysis(input);
    }

    try {
        // Using Gemini 1.5 Pro (latest stable model)
        // For Gemini 2.0 Flash or specific preview models, update the model name
        const model = 'gemini-1.5-pro';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt,
                    }],
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 800,
                },
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Gemini API error: ${response.statusText} - ${error}`);
        }

        const data = await response.json();

        // Extract the generated text
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';

        return answer;
    } catch (error) {
        console.error('Gemini API error:', error);
        return getMockAnalysis(input);
    }
}

function getMockAnalysis(input: AnalyzeInput): string {
    const { assetType, symbol, question } = input;
    const assetName = symbol || assetType.toUpperCase();

    return `Based on the recent market data for ${assetName}, here's my analysis:

**Market Overview:**
The asset has shown moderate volatility over the selected timeframe. The price movement appears to be influenced by a combination of broader market sentiment and specific news events related to the sector.

**Key Factors:**
1. Recent news sentiment is showing a slight bullish bias, with positive developments in the industry.
2. Technical indicators suggest the current trend is sustainable in the near term, though caution is warranted given overall market conditions.
3. Volume patterns indicate healthy market participation.

**Answer to your question ("${question}"):**
While I can see general market trends in the data provided, for a more precise answer, I would need access to additional fundamental data and longer-term historical context. Based on current indicators, the outlook appears cautiously optimistic.

*Note: This is a simulated response. Configure GEMINI_API_KEY for real AI analysis.*`;
}
