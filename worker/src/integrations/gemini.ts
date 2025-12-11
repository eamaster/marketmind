import type { Env, PricePoint, NewsArticle } from '../core/types';

// Google Gemini API client
// Docs: https://ai.google.dev/gemini-api/docs/models/gemini

interface AnalyzeInput {
    assetType: 'stock' | 'crypto' | 'metal';
    symbol?: string;
    timeframe: '7D' | '1M' | '3M' | '6M' | '1Y';
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

    console.log('[Gemini] ==========START API CALL==========');
    console.log('[Gemini] API Key present:', !!apiKey);
    console.log('[Gemini] API Key length:', apiKey?.length || 0);

    if (!apiKey) {
        console.error('[Gemini] ERROR: No API key configured!');
        console.log('[Gemini] Returning mock data due to missing API key');
        return getMockAnalysis(input);
    }

    try {
        // Using Gemini 3 Pro Preview - Latest model with thinking capabilities
        const model = 'gemini-3-pro-preview';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        console.log(`[Gemini] Model: ${model}`);
        console.log(`[Gemini] URL: ${url}`);
        console.log(`[Gemini] Asset: ${input.assetType} ${input.symbol || ''}`);
        console.log(`[Gemini] Data points: ${input.chartData.length} chart, ${input.news.length} news`);
        console.log(`[Gemini] Question: "${input.question}"`);
        console.log(`[Gemini] Prompt length: ${prompt.length} characters`);

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt,
                }],
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 2048,
                topP: 0.95,
                topK: 40,
            },
        };

        console.log('[Gemini] Sending request to Gemini API...');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify(requestBody),
        });

        console.log(`[Gemini] Response status: ${response.status} ${response.statusText}`);
        console.log(`[Gemini] Response headers:`, Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Gemini] API ERROR Response:', errorText);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
        }

        const data = await response.json() as {
            candidates?: Array<{
                content?: {
                    parts?: Array<{ text?: string }>;
                };
            }>;
        };
        console.log('[Gemini] API Response received successfully');
        console.log('[Gemini] Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
        console.log('[Gemini] Candidates count:', data.candidates?.length || 0);

        // Extract the generated text
        const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!answer) {
            console.error('[Gemini] ERROR: No text in API response!');
            console.error('[Gemini] Full response:', JSON.stringify(data));
            throw new Error('No response generated from Gemini API');
        }

        console.log(`[Gemini] ✅ SUCCESS! Generated ${answer.length} characters`);
        console.log('[Gemini] Response preview:', answer.substring(0, 200) + '...');
        console.log('[Gemini] ==========END API CALL==========');

        return answer;
    } catch (error) {
        console.error('[Gemini] ==========ERROR==========');
        console.error('[Gemini] Error type:', error instanceof Error ? error.constructor.name : typeof error);
        console.error('[Gemini] Error message:', error instanceof Error ? error.message : String(error));
        console.error('[Gemini] Full error:', error);
        console.log('[Gemini] Falling back to mock data');
        console.log('[Gemini] ==========END ERROR==========');
        return getMockAnalysis(input);
    }
}

function getMockAnalysis(input: AnalyzeInput): string {
    const { assetType, symbol, question, chartData, news } = input;
    const assetName = symbol || assetType.toUpperCase();

    console.log(`[Gemini] ⚠️ Generating MOCK response for ${assetName}`);

    // Check if we have real data
    const hasData = chartData && chartData.length > 0;
    const hasNews = news && news.length > 0;

    if (!hasData && !hasNews) {
        return `I don't have sufficient market data available for ${assetName} at the moment. Please ensure the API integrations are configured correctly.

**What I need:**
- Price data from the chart
- Recent news articles
- Market sentiment indicators

**Your question:** "${question}"

*Note: This is a MOCK response. The GEMINI_API_KEY is either not configured or there was an error calling the API. Check the Worker logs for details.*`;
    }

    const latestPrice = hasData ? chartData[chartData.length - 1]?.close : null;
    const priceChange = hasData && chartData.length > 1
        ? ((chartData[chartData.length - 1].close - chartData[0].close) / chartData[0].close * 100).toFixed(2)
        : null;

    return `Based on the available market data for ${assetName}, here's my analysis:

**Market Overview:**
${hasData ? `The current price is $${latestPrice?.toFixed(2)}, showing a ${priceChange}% change over the selected timeframe. ` : ''}The asset has shown moderate volatility${hasData ? ` with ${chartData.length} data points analyzed` : ''}.

**Recent News Sentiment:**
${hasNews ? `I've analyzed ${news.length} recent news articles. ` : ''}The overall sentiment appears ${hasNews && news.some(n => n.sentimentScore && n.sentimentScore > 0.1) ? 'cautiously bullish' : 'neutral'}, with a mix of positive and negative factors influencing the market.

**Key Factors:**
1. Technical indicators suggest ${priceChange && parseFloat(priceChange) > 0 ? 'upward' : 'mixed'} momentum
2. Market participation appears ${hasData ? 'healthy' : 'moderate'} based on available data
3. Recent developments in the sector show ongoing activity

**Answer to: "${question}"**
While the current data shows general market trends, a comprehensive answer would benefit from additional fundamental analysis and longer-term context. Based on current indicators, the short-term outlook appears ${priceChange && parseFloat(priceChange) > 2 ? 'positive' : 'neutral'} with normal market volatility.

*⚠️ IMPORTANT: This is a MOCK response because the Gemini API call failed or the API key is not configured. Check the Worker console logs for detailed error information. Real AI analysis requires a valid GEMINI_API_KEY.*`;
}
