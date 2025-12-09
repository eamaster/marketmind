import type { Env, AssetDataResponse, PricePoint, Timeframe } from '../core/types';
import { getTwelveDataCandles } from '../integrations/twelvedata';
import { computeSupportResistance } from '../utils/levels';

// Helper: Check if US market is currently open
function isMarketOpen(): boolean {
    try {
        const now = new Date();

        // Get current ET time using Intl.DateTimeFormat (more reliable)
        const etFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false,
            weekday: 'short'
        });

        const etParts = etFormatter.formatToParts(now);
        const dayPart = etParts.find(p => p.type === 'weekday');
        const hourPart = etParts.find(p => p.type === 'hour');
        const minutePart = etParts.find(p => p.type === 'minute');

        if (!dayPart || !hourPart || !minutePart) {
            console.error('[Market Check] Failed to parse ET time parts');
            return false;
        }

        const dayOfWeek = dayPart.value;
        const hours = parseInt(hourPart.value, 10);
        const minutes = parseInt(minutePart.value, 10);

        console.log(`[Market Check] Current ET time: ${dayOfWeek}, ${hours}:${minutes.toString().padStart(2, '0')}`);

        // Check if weekend
        if (dayOfWeek === 'Sat' || dayOfWeek === 'Sun') {
            console.log('[Market Check] Weekend - market CLOSED');
            return false;
        }

        // Market hours: 9:30 AM - 4:00 PM ET
        const currentMinutes = hours * 60 + minutes;
        const marketOpen = 9 * 60 + 30; // 9:30 AM = 570 minutes
        const marketClose = 16 * 60; // 4:00 PM = 960 minutes

        const isOpen = currentMinutes >= marketOpen && currentMinutes < marketClose;
        console.log(`[Market Check] ${hours}:${minutes.toString().padStart(2, '0')} ET = ${currentMinutes} minutes. Market ${isOpen ? 'OPEN' : 'CLOSED'} (open: ${marketOpen}-${marketClose})`);

        return isOpen;
    } catch (error) {
        console.error('[Market Check] Error checking market hours:', error);
        return false; // Fail safe: assume market closed on error
    }
}

// Helper: Get today's forming candle from Finnhub
async function getTodaysCandle(symbol: string, env: Env): Promise<PricePoint | null> {
    const apiKey = env.FINNHUB_API_KEY;
    if (!apiKey) {
        console.warn('[Finnhub] No API key configured');
        return null;
    }

    try {
        // Get current quote for today's price
        const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${apiKey}`;
        console.log(`[Finnhub] Fetching live quote for ${symbol}...`);

        const quoteResponse = await fetch(quoteUrl);

        if (!quoteResponse.ok) {
            console.error(`[Finnhub] Quote fetch failed: ${quoteResponse.status} ${quoteResponse.statusText}`);
            return null;
        }

        const quote = await quoteResponse.json() as {
            c: number;  // Current price
            h: number;  // High
            l: number;  // Low
            o: number;  // Open
            pc: number; // Previous close
            t?: number; // Timestamp
        };

        console.log(`[Finnhub] Raw quote for ${symbol}:`, JSON.stringify(quote));

        // Finnhub quote structure: { c: current, h: high, l: low, o: open, pc: previous close }
        if (!quote.c || quote.c === 0) {
            console.warn(`[Finnhub] Invalid quote for ${symbol}: current price is ${quote.c}`);
            return null;
        }

        // Create today's candle (forming)
        // Use ET timezone for consistency
        const now = new Date();
        const etFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        const etDateStr = etFormatter.format(now); // MM/DD/YYYY
        const [month, day, year] = etDateStr.split('/');

        // Create ISO string for today at market open (9:30 AM ET)
        const todayET = new Date(`${year}-${month}-${day}T09:30:00-05:00`);
        const todayISO = todayET.toISOString();

        const todaysCandle: PricePoint = {
            timestamp: todayISO,
            open: quote.o || quote.pc || quote.c, // Fallback to previous close or current
            high: quote.h || quote.c,
            low: quote.l || quote.c,
            close: quote.c, // Current price (live)
            volume: 0, // Finnhub free tier doesn't provide intraday volume
        };

        console.log(`[Finnhub] Created today's candle for ${symbol}:`, JSON.stringify(todaysCandle));
        return todaysCandle;
    } catch (error) {
        console.error(`[Finnhub] Failed to get today's candle for ${symbol}:`, error);
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

    console.log(`[Stocks] Request: ${symbol} ${timeframe}`);

    if (!symbol || !timeframe) {
        return new Response(JSON.stringify({ error: 'Missing symbol or timeframe' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    try {
        // 1. Get historical candles from Twelve Data
        console.log(`[Stocks] Fetching historical data for ${symbol} ${timeframe}...`);
        const historicalData = await getTwelveDataCandles(symbol, timeframe, env);
        console.log(`[Stocks] Received ${historicalData.length} historical candles`);

        // 2. Check if market is open
        const marketOpen = isMarketOpen();
        console.log(`[Stocks] Market status: ${marketOpen ? 'OPEN' : 'CLOSED'}`);

        // 3. If market is open, add today's live candle from Finnhub
        let finalData = historicalData;
        let hasLiveCandle = false;
        let liveDataIndex = -1;

        if (marketOpen) {
            console.log(`[Stocks] Market is open, attempting to fetch live candle...`);
            const todaysCandle = await getTodaysCandle(symbol, env);

            if (todaysCandle) {
                // Check if last historical candle is from today
                const lastHistorical = historicalData[historicalData.length - 1];
                const lastDate = new Date(lastHistorical.timestamp).toDateString();
                const todayDate = new Date(todaysCandle.timestamp).toDateString();

                console.log(`[Stocks] Last historical: ${lastDate}, Today: ${todayDate}`);

                if (lastDate === todayDate) {
                    // Replace last candle with live data (update existing today's candle)
                    finalData = [...historicalData.slice(0, -1), todaysCandle];
                    hasLiveCandle = true;
                    liveDataIndex = finalData.length - 1;
                    console.log(`[Stocks] ✅ UPDATED today's candle for ${symbol} with live data (index ${liveDataIndex})`);
                } else {
                    // Append today's candle (historical data is from yesterday)
                    finalData = [...historicalData, todaysCandle];
                    hasLiveCandle = true;
                    liveDataIndex = finalData.length - 1;
                    console.log(`[Stocks] ✅ ADDED today's live candle for ${symbol} (index ${liveDataIndex})`);
                }
            } else {
                console.warn(`[Stocks] ⚠️ Market open but failed to fetch today's candle for ${symbol}`);
            }
        }

        // Compute support and resistance levels from final candle data
        const { support, resistance } = computeSupportResistance(finalData);

        const response = {
            data: finalData,
            metadata: {
                symbol,
                timeframe,
                assetType: 'stock' as const,
                isMarketOpen: marketOpen,
                hasLiveCandle,
                liveDataIndex,
                historicalCount: historicalData.length,
                totalCount: finalData.length,
                support,
                resistance,
            },
        };

        console.log(`[Stocks] Returning ${finalData.length} candles (historical: ${historicalData.length}, live: ${hasLiveCandle ? 1 : 0})`);

        return new Response(JSON.stringify(response), {
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders,
            },
        });
    } catch (error) {
        console.error('[Stocks Route] ERROR:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : '';

        console.error('[Stocks Route] Error details:', {
            message: errorMessage,
            stack: errorStack,
        });

        // Detect rate limit errors
        const isRateLimit = errorMessage.includes('rate limit') || errorMessage.includes('5 requests');

        return new Response(
            JSON.stringify({
                error: 'Failed to fetch stock data',
                message: errorMessage,
                retryAfter: isRateLimit ? 60 : undefined,
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
