var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// .wrangler/tmp/bundle-yq4Jka/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
var init_strip_cf_connecting_ip_header = __esm({
  ".wrangler/tmp/bundle-yq4Jka/strip-cf-connecting-ip-header.js"() {
    "use strict";
    __name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
    globalThis.fetch = new Proxy(globalThis.fetch, {
      apply(target, thisArg, argArray) {
        return Reflect.apply(target, thisArg, [
          stripCfConnectingIPHeader.apply(null, argArray)
        ]);
      }
    });
  }
});

// wrangler-modules-watch:wrangler:modules-watch
var init_wrangler_modules_watch = __esm({
  "wrangler-modules-watch:wrangler:modules-watch"() {
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
  }
});

// node_modules/wrangler/templates/modules-watch-stub.js
var init_modules_watch_stub = __esm({
  "node_modules/wrangler/templates/modules-watch-stub.js"() {
    init_wrangler_modules_watch();
  }
});

// src/integrations/oilprice.ts
async function getOilPrice(code, timeframe, env) {
  const apiKey = env.OILPRICE_API_KEY;
  if (!apiKey) {
    console.warn("OILPRICE_API_KEY not configured, returning mock data");
    return getMockOilData(code, timeframe);
  }
  try {
    const response = await fetch(`https://api.oilpriceapi.com/v1/prices/latest`, {
      headers: {
        "Authorization": `Token ${apiKey}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`OilPriceAPI error: ${response.statusText}`);
    }
    const data = await response.json();
    return normalizeOilPriceData(data, code);
  } catch (error) {
    console.error("OilPrice API error:", error);
    return getMockOilData(code, timeframe);
  }
}
function normalizeOilPriceData(apiData, code) {
  if (!apiData?.data) {
    return [];
  }
  const price = apiData.data.price || 75.5;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return [{
    timestamp: now,
    close: price
  }];
}
function getMockOilData(code, timeframe) {
  const basePrice = code === "WTI_USD" ? 75.5 : 78.2;
  const points = timeframe === "1D" ? 78 : timeframe === "1W" ? 168 : 30;
  const interval = timeframe === "1D" ? 5 * 60 * 1e3 : timeframe === "1W" ? 60 * 60 * 1e3 : 24 * 60 * 60 * 1e3;
  const now = Date.now();
  const data = [];
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - (points - i - 1) * interval).toISOString();
    const volatility = (Math.random() - 0.5) * 2;
    const trend = i * 0.01;
    const close = basePrice + volatility + trend;
    data.push({
      timestamp,
      close: Number(close.toFixed(2)),
      open: Number((close + (Math.random() - 0.5) * 0.5).toFixed(2)),
      high: Number((close + Math.random() * 0.5).toFixed(2)),
      low: Number((close - Math.random() * 0.5).toFixed(2))
    });
  }
  return data;
}
var init_oilprice = __esm({
  "src/integrations/oilprice.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(getOilPrice, "getOilPrice");
    __name(normalizeOilPriceData, "normalizeOilPriceData");
    __name(getMockOilData, "getMockOilData");
  }
});

// src/routes/oil.ts
var oil_exports = {};
__export(oil_exports, {
  handleOilRequest: () => handleOilRequest
});
async function handleOilRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") || "WTI_USD";
  const timeframe = url.searchParams.get("timeframe") || "1D";
  try {
    const data = await getOilPrice(code, timeframe, env);
    const response = {
      data,
      metadata: {
        symbol: code,
        timeframe,
        assetType: "oil"
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch oil data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
}
var init_oil = __esm({
  "src/routes/oil.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_oilprice();
    __name(handleOilRequest, "handleOilRequest");
  }
});

// src/integrations/goldApi.ts
async function getGoldPrice(symbol, timeframe, env) {
  const apiKey = env.GOLD_API_KEY;
  if (!apiKey) {
    console.warn("GOLD_API_KEY not configured, returning mock data");
    return getMockGoldData(symbol, timeframe);
  }
  try {
    const pairSymbol = `${symbol}/USD`;
    const response = await fetch(`https://www.goldapi.io/api/${pairSymbol}`, {
      headers: {
        "x-access-token": apiKey
      }
    });
    if (!response.ok) {
      throw new Error(`Gold API error: ${response.statusText}`);
    }
    const data = await response.json();
    return normalizeGoldPriceData(data);
  } catch (error) {
    console.error("Gold API error:", error);
    return getMockGoldData(symbol, timeframe);
  }
}
function normalizeGoldPriceData(apiData) {
  if (!apiData?.price) {
    return [];
  }
  return [{
    timestamp: new Date((apiData.timestamp || Date.now()) * 1e3).toISOString(),
    close: apiData.price,
    open: apiData.open_price,
    high: apiData.high_price,
    low: apiData.low_price
  }];
}
function getMockGoldData(symbol, timeframe) {
  const basePrice = symbol === "XAU" ? 2050 : 23.5;
  const points = timeframe === "1D" ? 78 : timeframe === "1W" ? 168 : 30;
  const interval = timeframe === "1D" ? 5 * 60 * 1e3 : timeframe === "1W" ? 60 * 60 * 1e3 : 24 * 60 * 60 * 1e3;
  const now = Date.now();
  const data = [];
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - (points - i - 1) * interval).toISOString();
    const volatility = (Math.random() - 0.5) * (basePrice * 0.01);
    const trend = i * 0.05;
    const close = basePrice + volatility + trend;
    data.push({
      timestamp,
      close: Number(close.toFixed(2)),
      open: Number((close + (Math.random() - 0.5) * 2).toFixed(2)),
      high: Number((close + Math.random() * 2).toFixed(2)),
      low: Number((close - Math.random() * 2).toFixed(2))
    });
  }
  return data;
}
var init_goldApi = __esm({
  "src/integrations/goldApi.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(getGoldPrice, "getGoldPrice");
    __name(normalizeGoldPriceData, "normalizeGoldPriceData");
    __name(getMockGoldData, "getMockGoldData");
  }
});

// src/routes/gold.ts
var gold_exports = {};
__export(gold_exports, {
  handleGoldRequest: () => handleGoldRequest
});
async function handleGoldRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") || "XAU";
  const timeframe = url.searchParams.get("timeframe") || "1D";
  try {
    const data = await getGoldPrice(symbol, timeframe, env);
    const response = {
      data,
      metadata: {
        symbol,
        timeframe,
        assetType: "metal"
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch gold data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
}
var init_gold = __esm({
  "src/routes/gold.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_goldApi();
    __name(handleGoldRequest, "handleGoldRequest");
  }
});

// src/integrations/finnhub.ts
async function getStockCandles(symbol, timeframe, env) {
  const apiKey = env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.warn("FINNHUB_API_KEY not configured, returning mock data");
    return getMockStockData(symbol, timeframe);
  }
  try {
    const { resolution, from, to } = getTimeframeParams(timeframe);
    const url = new URL("https://finnhub.io/api/v1/stock/candle");
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("resolution", resolution);
    url.searchParams.set("from", from.toString());
    url.searchParams.set("to", to.toString());
    url.searchParams.set("token", apiKey);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.statusText}`);
    }
    const data = await response.json();
    return normalizeStockData(data);
  } catch (error) {
    console.error("Finnhub API error:", error);
    return getMockStockData(symbol, timeframe);
  }
}
function getTimeframeParams(timeframe) {
  const now = Math.floor(Date.now() / 1e3);
  switch (timeframe) {
    case "1D":
      return {
        resolution: "5",
        // 5-minute intervals
        from: now - 24 * 60 * 60,
        to: now
      };
    case "1W":
      return {
        resolution: "60",
        // 1-hour intervals
        from: now - 7 * 24 * 60 * 60,
        to: now
      };
    case "1M":
      return {
        resolution: "D",
        // Daily intervals
        from: now - 30 * 24 * 60 * 60,
        to: now
      };
  }
}
function normalizeStockData(apiData) {
  if (apiData.s !== "ok" || !apiData.t || apiData.t.length === 0) {
    return [];
  }
  const data = [];
  for (let i = 0; i < apiData.t.length; i++) {
    data.push({
      timestamp: new Date(apiData.t[i] * 1e3).toISOString(),
      open: apiData.o?.[i],
      high: apiData.h?.[i],
      low: apiData.l?.[i],
      close: apiData.c[i],
      volume: apiData.v?.[i]
    });
  }
  return data;
}
function getMockStockData(symbol, timeframe) {
  const basePrice = symbol === "AAPL" ? 180 : symbol === "TSLA" ? 240 : 450;
  const points = timeframe === "1D" ? 78 : timeframe === "1W" ? 168 : 30;
  const interval = timeframe === "1D" ? 5 * 60 * 1e3 : timeframe === "1W" ? 60 * 60 * 1e3 : 24 * 60 * 60 * 1e3;
  const now = Date.now();
  const data = [];
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - (points - i - 1) * interval).toISOString();
    const volatility = (Math.random() - 0.5) * (basePrice * 0.02);
    const trend = i * 0.1;
    const close = basePrice + volatility + trend;
    const open = close + (Math.random() - 0.5) * 2;
    const high = Math.max(open, close) + Math.random() * 1.5;
    const low = Math.min(open, close) - Math.random() * 1.5;
    data.push({
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume: Math.floor(Math.random() * 1e7)
    });
  }
  return data;
}
var init_finnhub = __esm({
  "src/integrations/finnhub.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(getStockCandles, "getStockCandles");
    __name(getTimeframeParams, "getTimeframeParams");
    __name(normalizeStockData, "normalizeStockData");
    __name(getMockStockData, "getMockStockData");
  }
});

// src/routes/stocks.ts
var stocks_exports = {};
__export(stocks_exports, {
  handleStocksRequest: () => handleStocksRequest
});
async function handleStocksRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol") || "AAPL";
  const timeframe = url.searchParams.get("timeframe") || "1D";
  try {
    const data = await getStockCandles(symbol, timeframe, env);
    const response = {
      data,
      metadata: {
        symbol,
        timeframe,
        assetType: "stock"
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch stock data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
}
var init_stocks = __esm({
  "src/routes/stocks.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_finnhub();
    __name(handleStocksRequest, "handleStocksRequest");
  }
});

// src/core/cache.ts
async function getCachedData(key) {
  const cache = caches.default;
  const cacheKey = `${CACHE_VERSION}:${key}`;
  const cacheUrl = new URL(`https://cache.marketmind/${cacheKey}`);
  const response = await cache.match(cacheUrl);
  if (!response) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}
async function setCachedData(key, data, ttl = DEFAULT_TTL) {
  const cache = caches.default;
  const cacheKey = `${CACHE_VERSION}:${key}`;
  const cacheUrl = new URL(`https://cache.marketmind/${cacheKey}`);
  const response = new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `max-age=${ttl}`
    }
  });
  await cache.put(cacheUrl, response);
}
var CACHE_VERSION, DEFAULT_TTL;
var init_cache = __esm({
  "src/core/cache.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    CACHE_VERSION = "v1";
    DEFAULT_TTL = 30 * 60;
    __name(getCachedData, "getCachedData");
    __name(setCachedData, "setCachedData");
  }
});

// src/integrations/marketaux.ts
async function getNews(assetType, symbol, timeframe, env) {
  const apiToken = env.MARKETAUX_API_TOKEN;
  if (!apiToken) {
    console.warn("MARKETAUX_API_TOKEN not configured, returning mock data");
    return getMockNews(assetType, symbol);
  }
  try {
    const url = buildNewsUrl(assetType, symbol, apiToken);
    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Marketaux API error: ${response.statusText}`);
    }
    const data = await response.json();
    return normalizeNewsData(data);
  } catch (error) {
    console.error("Marketaux API error:", error);
    return getMockNews(assetType, symbol);
  }
}
function buildNewsUrl(assetType, symbol, apiToken) {
  const url = new URL("https://api.marketaux.com/v1/news/all");
  url.searchParams.set("api_token", apiToken);
  url.searchParams.set("language", "en");
  url.searchParams.set("limit", "10");
  url.searchParams.set("must_have_entities", "true");
  url.searchParams.set("filter_entities", "true");
  url.searchParams.set("group_similar", "true");
  if (assetType === "stock" && symbol) {
    url.searchParams.set("symbols", symbol);
  } else if (assetType === "oil") {
    url.searchParams.set("industries", "Energy");
    url.searchParams.set("search", "crude oil OR WTI OR Brent");
  } else if (assetType === "metal") {
    url.searchParams.set("search", "gold OR silver OR precious metals");
  }
  return url;
}
function normalizeNewsData(apiData) {
  if (!apiData?.data || !Array.isArray(apiData.data)) {
    return { articles: [], sentiment: { score: null, label: "neutral" } };
  }
  const articles = apiData.data.map((item) => ({
    id: item.uuid || item.url,
    title: item.title,
    url: item.url,
    snippet: item.snippet || item.description || "",
    publishedAt: item.published_at,
    source: item.source,
    sentimentScore: item.entities?.[0]?.sentiment_score
  }));
  const sentiment = calculateSentiment(articles);
  return { articles, sentiment };
}
function calculateSentiment(articles) {
  const scores = articles.map((a) => a.sentimentScore).filter((s) => s !== void 0 && s !== null);
  if (scores.length === 0) {
    return { score: null, label: "neutral" };
  }
  const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  let label;
  if (avgScore > 0.1) {
    label = "bullish";
  } else if (avgScore < -0.1) {
    label = "bearish";
  } else {
    label = "neutral";
  }
  return { score: Number(avgScore.toFixed(3)), label };
}
function getMockNews(assetType, symbol) {
  const mockArticles = [
    {
      id: "1",
      title: `${symbol || assetType.toUpperCase()} shows strong performance amid market volatility`,
      url: "https://example.com/news/1",
      snippet: "Market analysts report positive trends in recent trading sessions...",
      publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1e3).toISOString(),
      source: "Financial Times",
      sentimentScore: 0.6
    },
    {
      id: "2",
      title: "Global economic factors impact commodity prices",
      url: "https://example.com/news/2",
      snippet: "Recent geopolitical events have created uncertainty in global markets...",
      publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1e3).toISOString(),
      source: "Bloomberg",
      sentimentScore: -0.2
    },
    {
      id: "3",
      title: "Analysts remain cautiously optimistic about Q4 outlook",
      url: "https://example.com/news/3",
      snippet: "Despite recent volatility, long-term fundamentals remain strong...",
      publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1e3).toISOString(),
      source: "Reuters",
      sentimentScore: 0.3
    }
  ];
  return {
    articles: mockArticles,
    sentiment: { score: 0.23, label: "bullish" }
  };
}
var init_marketaux = __esm({
  "src/integrations/marketaux.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(getNews, "getNews");
    __name(buildNewsUrl, "buildNewsUrl");
    __name(normalizeNewsData, "normalizeNewsData");
    __name(calculateSentiment, "calculateSentiment");
    __name(getMockNews, "getMockNews");
  }
});

// src/routes/news.ts
var news_exports = {};
__export(news_exports, {
  handleNewsRequest: () => handleNewsRequest
});
async function handleNewsRequest(request, env, corsHeaders) {
  const url = new URL(request.url);
  const assetType = url.searchParams.get("assetType") || "stock";
  const symbol = url.searchParams.get("symbol") || void 0;
  const timeframe = url.searchParams.get("timeframe") || "1D";
  const cacheKey = `news:${assetType}:${symbol || "general"}:${timeframe}`;
  try {
    const cached = await getCachedData(cacheKey);
    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: {
          "Content-Type": "application/json",
          "X-Cache": "HIT",
          ...corsHeaders
        }
      });
    }
    const newsData = await getNews(assetType, symbol, timeframe, env);
    await setCachedData(cacheKey, newsData, 30 * 60);
    return new Response(JSON.stringify(newsData), {
      headers: {
        "Content-Type": "application/json",
        "X-Cache": "MISS",
        ...corsHeaders
      }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch news data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
}
var init_news = __esm({
  "src/routes/news.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_cache();
    init_marketaux();
    __name(handleNewsRequest, "handleNewsRequest");
  }
});

// src/core/promptBuilder.ts
function buildPrompt(input) {
  const { assetType, symbol, timeframe, chartData, news, question } = input;
  const chartSummary = summarizeChartData(chartData);
  const newsSummary = summarizeNews(news.slice(0, 5));
  const assetName = symbol || assetType.toUpperCase();
  return `You are a financial market analyst assistant. Answer the following question based on the provided market data and recent news. Be concise and grounded in the data.

**Asset:** ${assetName} (${assetType})
**Timeframe:** ${timeframe}

**Market Data Summary:**
${chartSummary}

**Recent News & Sentiment:**
${newsSummary}

**User Question:** ${question}

**Instructions:**
- Base your analysis on the provided chart data and news.
- Clearly connect price movements with specific news events when plausible.
- If no clear linkage exists, acknowledge uncertainty.
- Be concise and actionable (2-3 paragraphs max).
`;
}
function summarizeChartData(data) {
  if (data.length === 0) {
    return "No price data available.";
  }
  const first = data[0];
  const last = data[data.length - 1];
  const prices = data.map((d) => d.close);
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  const change = last.close - first.close;
  const changePercent = (change / first.close * 100).toFixed(2);
  const trend = change > 0 ? "upward" : change < 0 ? "downward" : "flat";
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const volatility = (stdDev / mean * 100).toFixed(2);
  return `- Current Price: $${last.close.toFixed(2)}
- Price Range: $${low.toFixed(2)} - $${high.toFixed(2)}
- Change: ${change > 0 ? "+" : ""}$${change.toFixed(2)} (${changePercent}%)
- Trend: ${trend}
- Volatility: ${volatility}% (standard deviation)
- Data Points: ${data.length}`;
}
function summarizeNews(articles) {
  if (articles.length === 0) {
    return "No recent news available.";
  }
  return articles.map((article, idx) => {
    const sentiment = article.sentimentScore !== void 0 && article.sentimentScore !== null ? article.sentimentScore > 0 ? "\u{1F4C8} Positive" : article.sentimentScore < 0 ? "\u{1F4C9} Negative" : "\u27A1\uFE0F Neutral" : "\u2753 Unknown";
    const timeAgo = getTimeAgo(article.publishedAt);
    return `${idx + 1}. [${sentiment}] "${article.title}" - ${article.source} (${timeAgo})`;
  }).join("\n");
}
function getTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1e3 * 60 * 60));
  if (hours < 1)
    return "Just now";
  if (hours === 1)
    return "1 hour ago";
  if (hours < 24)
    return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1)
    return "1 day ago";
  return `${days} days ago`;
}
var init_promptBuilder = __esm({
  "src/core/promptBuilder.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(buildPrompt, "buildPrompt");
    __name(summarizeChartData, "summarizeChartData");
    __name(summarizeNews, "summarizeNews");
    __name(getTimeAgo, "getTimeAgo");
  }
});

// src/integrations/gemini.ts
async function analyzeMarketContext(input, prompt, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not configured, returning mock response");
    return getMockAnalysis(input);
  }
  try {
    const model = "gemini-1.5-pro";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800
        }
      })
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.statusText} - ${error}`);
    }
    const data = await response.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
    return answer;
  } catch (error) {
    console.error("Gemini API error:", error);
    return getMockAnalysis(input);
  }
}
function getMockAnalysis(input) {
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
var init_gemini = __esm({
  "src/integrations/gemini.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    __name(analyzeMarketContext, "analyzeMarketContext");
    __name(getMockAnalysis, "getMockAnalysis");
  }
});

// src/routes/aiAnalyze.ts
var aiAnalyze_exports = {};
__export(aiAnalyze_exports, {
  handleAiAnalyzeRequest: () => handleAiAnalyzeRequest
});
async function handleAiAnalyzeRequest(request, env, corsHeaders) {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
  try {
    const body = await request.json();
    const { assetType, symbol, timeframe, chartData, news, question } = body;
    if (!assetType || !timeframe || !chartData || !news || !question) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
    const prompt = buildPrompt({
      assetType,
      symbol,
      timeframe,
      chartData,
      news,
      question
    });
    const answer = await analyzeMarketContext(
      { assetType, symbol, timeframe, chartData, news, question },
      prompt,
      env
    );
    const response = { answer };
    return new Response(JSON.stringify(response), {
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("AI Analyze error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to analyze market data",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
}
var init_aiAnalyze = __esm({
  "src/routes/aiAnalyze.ts"() {
    "use strict";
    init_strip_cf_connecting_ip_header();
    init_modules_watch_stub();
    init_promptBuilder();
    init_gemini();
    __name(handleAiAnalyzeRequest, "handleAiAnalyzeRequest");
  }
});

// .wrangler/tmp/bundle-yq4Jka/middleware-loader.entry.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// .wrangler/tmp/bundle-yq4Jka/middleware-insertion-facade.js
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();

// src/index.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var src_default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    try {
      if (path === "/api/health" || path === "/health") {
        return jsonResponse({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() }, corsHeaders);
      }
      if (path === "/api/oil" && request.method === "GET") {
        const { handleOilRequest: handleOilRequest2 } = await Promise.resolve().then(() => (init_oil(), oil_exports));
        return await handleOilRequest2(request, env, corsHeaders);
      }
      if (path === "/api/gold" && request.method === "GET") {
        const { handleGoldRequest: handleGoldRequest2 } = await Promise.resolve().then(() => (init_gold(), gold_exports));
        return await handleGoldRequest2(request, env, corsHeaders);
      }
      if (path === "/api/stocks" && request.method === "GET") {
        const { handleStocksRequest: handleStocksRequest2 } = await Promise.resolve().then(() => (init_stocks(), stocks_exports));
        return await handleStocksRequest2(request, env, corsHeaders);
      }
      if (path === "/api/news" && request.method === "GET") {
        const { handleNewsRequest: handleNewsRequest2 } = await Promise.resolve().then(() => (init_news(), news_exports));
        return await handleNewsRequest2(request, env, corsHeaders);
      }
      if (path === "/api/ai/analyze" && request.method === "POST") {
        const { handleAiAnalyzeRequest: handleAiAnalyzeRequest2 } = await Promise.resolve().then(() => (init_aiAnalyze(), aiAnalyze_exports));
        return await handleAiAnalyzeRequest2(request, env, corsHeaders);
      }
      return jsonResponse(
        { error: "Not Found", path },
        corsHeaders,
        404
      );
    } catch (error) {
      console.error("Worker error:", error);
      return jsonResponse(
        {
          error: "Internal Server Error",
          message: error instanceof Error ? error.message : "Unknown error"
        },
        corsHeaders,
        500
      );
    }
  }
};
function jsonResponse(data, headers = {}, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers
    }
  });
}
__name(jsonResponse, "jsonResponse");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-yq4Jka/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
init_strip_cf_connecting_ip_header();
init_modules_watch_stub();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-yq4Jka/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
