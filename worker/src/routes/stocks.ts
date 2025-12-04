import type { Env, AssetDataResponse, PricePoint, Timeframe } from '../core/types';
import { getMassiveCandles } from '../integrations/massive';

// Helper: Check if US market is currently open
function isMarketOpen(): boolean {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hours = etTime.getHours();
    const minutes = etTime.getMinutes();
    const day = etTime.getDay();

    // Market closed on weekends
    if (day === 0 || day === 6) return false;

    // Market hours: 9:30 AM - 4:00 PM ET
    const currentMinutes = hours * 60 + minutes;
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM

    return currentMinutes >= marketOpen && currentMinutes < marketClose;
}

// Helper: Get today's forming candle from Finnhub
async function getTodaysCandle(symbol: string, env: Env): Promise<PricePoint | null> {
    const apiKey = env.FINNHUB_API_KEY;
    if (!apiKey) return null;

    try {
        // Get current quote for today's price
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${apiKey}`;
        const quoteResponse = await fetch(quoteUrl);

        if (!quoteResponse.ok) return null;

        const quote = await quoteResponse.json() as {
            c: number;  // Current price
            h: number;  // High
            l: number;  // Low
            o: number;  // Open
            pc: number; // Previous close
        };

        // Finnhub quote structure: { c: current, h: high, l: low, o: open, pc: previous close }
        if (!quote.c || quote.c === 0) return null;

        // Create today's candle (forming)
        const today = new Date();
        const todayISO = today.toISOString();

        console.log(`[Hybrid] Finnhub quote for ${symbol}: O=${quote.o} H=${quote.h} L=${quote.l} C=${quote.c}`);

        return {
            timestamp: todayISO,
            open: quote.o || quote.c,
            high: quote.h || quote.c,
            low: quote.l || quote.c,
            close: quote.c, // Current price (live)
            volume: 0, // Finnhub free tier doesn't provide intraday volume
        };
    } catch (error) {
        console.error('[Finnhub] Failed to get today\'s candle:', error);
        return null;
    }
}

export async function handleStocksRequest(
    request: Request,
    env: Env,
    corsHeaders: Record<string, string>
): Promise<Response> {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') || 'AAPL';
    const timeframe = (url.searchParams.get('timeframe') || '1D') as Timeframe;

    if (!symbol || !timeframe) {
        return new Response(JSON.stringify({ error: 'Missing symbol or timeframe' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        // 1. Get historical candles from Massive.com
        const historicalData = await getMassiveCandles(symbol, timeframe, env);

        // 2. If market is open, add today's live candle from Finnhub
        let finalData = historicalData;
        const marketOpen = isMarketOpen();

        if (marketOpen) {
            const todaysCandle = await getTodaysCandle(symbol, env);

            if (todaysCandle) {
                // Check if last historical candle is from today
                const lastHistorical = historicalData[historicalData.length - 1];
                const lastDate = new Date(lastHistorical.timestamp).toDateString();
                const todayDate = new Date(todaysCandle.timestamp).toDateString();

                if (lastDate === todayDate) {
                    // Replace last candle with live data (update existing today's candle)
                    finalData = [...historicalData.slice(0, -1), todaysCandle];
                    console.log(`[Hybrid] Updated today's candle for ${symbol} with live data`);
                } else {
                    // Append today's candle (historical data is from yesterday)
                    finalData = [...historicalData, todaysCandle];
                    console.log(`[Hybrid] Added today's live candle for ${symbol}`);
                }
            }
        }

        const response: AssetDataResponse & { isLive?: boolean } = {
            data: finalData,
            metadata: {
                symbol,
                timeframe,
                assetType: 'stock',
            },
            isLive: marketOpen, // Tell frontend if data includes live candle
        };

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error('[Stocks Route] Error:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Detect rate limit errors
        const isRateLimit = errorMessage.includes('rate limit') || errorMessage.includes('5 requests');

        return new Response(
            JSON.stringify({
                error: 'Failed to fetch stock data',
                message: errorMessage,
                retryAfter: isRateLimit ? 60 : undefined, // Tell frontend to wait 60 seconds
            }),
            {
                status: isRateLimit ? 429 : 500,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders,
                },
            }
        );
    }
}
