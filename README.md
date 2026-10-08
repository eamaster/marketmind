# MarketMind 📊 

Real-time financial market analysis dashboard powered by Cloudflare Workers and React.

---

## ✨ **Features**

- **Real-time Stock Quotes**: Live price updates using Finnhub API
- **Live Crypto Data**: Real-time cryptocurrency prices and OHLC charts via CoinGecko
- **Interactive Charts**: Historical candlestick charts with support/resistance levels
- **Sentiment Indicators**: Real-time market sentiment from news analysis
  - Displayed on all charts (stocks, crypto, precious metals)
  - Progress bar shows sentiment strength (-1.0 to +1.0)
  - Based on Marketaux news sentiment scoring
- **Market News**: Financial news with AI-powered sentiment analysis
- **AI Analysis**: Cloudflare Workers AI market insights
  - **Clear Chat**: Delete conversation history with custom confirmation modal
  - **Context Awareness**: AI knows which asset/timeframe you're viewing
  - **Suggested Questions**: Quick-start prompts for common queries
  - **Real-time Updates**: Rate limit status in HTTP headers
- **Asset Tracking**: Track stocks, crypto, and precious metals
- **Cloudflare KV Caching**: Aggressive caching (94%+ cache hit rate) for performance

### 🤖 **AI Market Analyst - Cost Protection**

MarketMind implements intelligent cost protection to keep the AI service free:

1. **Rate Limiting**: 10 questions per hour per IP address
2. **Smart Caching**: Common questions cached for 30 minutes
3. **Fair Use Policy**: Transparent limits communicated to users

**Result:** 95-98% cost reduction ($20-50/month → $0-1/month)

**Technical Implementation:**
```bash
# Backend rate limiting
Rate Limit: 10 requests/hour/IP
Cache TTL: 30 minutes per unique question
Storage: Cloudflare KV for distributed rate limiting

# HTTP Headers
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-Cache-Status: HIT | MISS
```

**Testing Rate Limits:**
```bash
# Test rate limit (should block after 10 requests)
for i in {1..12}; do
    curl -X POST http://localhost:8787/api/ai/analyze \
        -H "Content-Type: application/json" \
        -d '{"question":"test","assetType":"stock","symbol":"AAPL","timeframe":"7D","chartData":[],"news":[]}';
done
```

---

## 🏗️ **Architecture**

### **Frontend** (React + TypeScript)
- Deployed on GitHub Pages
- Responsive design with dark mode
- Built with Vite for blazing-fast dev experience

### **Worker** (Cloudflare Workers + TypeScript)
- Serverless API backend using native Fetch API
- Cloudflare KV for caching
- CORS-enabled for frontend access

### **APIs**
- **Finnhub**: Real-time stock quotes (60 calls/minute)
- **Twelve Data**: Historical stock candles (8 calls/minute, 800/day)
- **CoinGecko**: Cryptocurrency prices and candles (10 calls/minute)
- **Marketaux**: Financial news with **sentiment analysis** (100 articles/day)
  - Free Tier: 100 articles/day
  - Cache: **1 hour TTL** (sentiment changes slowly)
  - Provides sentiment scores from -1.0 (bearish) to +1.0 (bullish)
- **Gold API**: Precious metal prices
- **Cloudflare Workers AI**: AI market analysis (native Worker binding; default model configured server-side)

---

## 🚀 **Quick Start**

### Prerequisites

- Node.js 18+
- Cloudflare account (for Workers)
- API keys:
  - [Finnhub](https://finnhub.io/register) (free tier)
  - [Twelve Data](https://twelvedata.com/) (free tier)
  - [CoinGecko](https://www.coingecko.com/en/api/pricing) (free tier)
  - [Marketaux](https://www.marketaux.com/)
  - [Gold API](https://www.goldapi.io/)
  - Cloudflare account with Workers AI enabled (native binding; no external LLM API key)

### Setup

#### 1. Clone Repository

```bash
git clone https://github.com/eamaster/marketmind.git
cd marketmind
```

#### 2. Worker Setup

```bash
cd worker
npm install

# Copy example env file
cp .dev.vars.example .dev.vars

# Edit .dev.vars and add your API keys

# Set Cloudflare secrets for production
wrangler secret put FINNHUB_API_KEY
wrangler secret put TWELVE_DATA_API_KEY
wrangler secret put COINGECKO_API_KEY
wrangler secret put MARKETAUX_API_TOKEN
wrangler secret put GOLD_API_KEY

# Create KV namespace
wrangler kv namespace create MARKETMIND_CACHE
# Copy the ID to wrangler.toml

# Workers AI: ensure `[ai] binding = "AI"` is present in wrangler.toml
# Model / token budget / temperature are set in wrangler.toml [vars]
# and validated in worker/src/core/aiConfig.ts (defaults: @cf/zai-org/glm-4.7-flash).

# Deploy
wrangler deploy
```

#### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev # Local development

# Update API URL in src/services/api.ts if needed
npm run build # Build for production
npm run deploy # Deploy to GitHub Pages
```

---

## 🔐 **Environment Variables**

See `worker/.dev.vars.example` for required environment variables.

**Never commit .dev.vars to git!**

---

## 🌍 **Deployment**

### Frontend → GitHub Pages

The frontend is configured to deploy to GitHub Pages using GitHub Actions.

**Automatic Deployment:**
- Push to `main` branch triggers automatic deployment
- GitHub Actions workflow builds and deploys to `gh-pages` branch
- Live at: https://eamaster.github.io/marketmind

**Manual Deployment:**
```bash
cd frontend
npm run build
npm run deploy
```

**Configuration:**
- Base path is set in `vite.config.ts`: `base: '/marketmind/'`
- Production API URL: Set in `frontend/src/services/api.ts`

### Worker → Cloudflare

**One-Time Setup:**

1. **Create KV Namespace** (if not already created):
```bash
cd worker
wrangler kv namespace create MARKETMIND_CACHE
# Copy the returned ID to wrangler.toml
```

2. **Configure Secrets**:
```bash
# Set production API keys as Cloudflare secrets
wrangler secret put FINNHUB_API_KEY
wrangler secret put TWELVE_DATA_API_KEY
wrangler secret put COINGECKO_API_KEY
wrangler secret put MARKETAUX_API_TOKEN
wrangler secret put GOLD_API_KEY
```

Optional cleanup if an old Gemini secret remains in the dashboard (not used by this Worker):
```bash
wrangler secret delete GEMINI_API_KEY
```

**Deploy Worker:**
```bash
npm run deploy
# or
wrangler deploy
```

**Deployed at:** `https://your-worker-name.workers.dev` (update in `frontend/src/services/apiClient.ts`)

**Workers AI notes:**
- Binding: `[ai] binding = "AI"` in `worker/wrangler.toml`
- Config: `AI_MODEL`, `AI_MAX_COMPLETION_TOKENS`, `AI_TEMPERATURE` in `[vars]` (see `worker/src/core/aiConfig.ts`)
- Free allocation: shared **10,000 Neurons/day** across the Cloudflare account; overage requires Workers Paid ([pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/))
- Local: `cd worker && npm run dev` (AI binding uses remote account inference; KV uses `preview_id` in `wrangler.toml`)
- Unit tests mock the binding: `cd worker && npm test`
- If local routes return 404 with “Could not create remote preview session”, authenticate Wrangler (`wrangler login`) and ensure the account can create Workers preview sessions; provider shape can still be checked via the Workers AI REST `/ai/run` API.

---

## 🧪 Testing & Verification

### Type Checking
```bash
# Frontend (tsc via build project references)
cd frontend && npx tsc -b --pretty false

# Worker
cd worker && npm run type-check
```

### Worker unit tests (mocked Workers AI binding)
```bash
cd worker && npm test
```

### Build Verification
```bash
# Build frontend
cd frontend && npm run build

# Test production build locally
npm run preview

# Worker deploy dry-run (requires Wrangler auth for some checks)
cd worker && npx wrangler deploy --dry-run
```

### Linting
```bash
cd frontend && npm run lint
```

### Rollback (AI provider)
1. Revert the Worker commit that introduced Workers AI, or restore `worker/src/integrations/gemini.ts` from git history and point `aiAnalyze.ts` back at it.
2. Redeploy the Worker: `cd worker && wrangler deploy`
3. Re-add `GEMINI_API_KEY` only if rolling back to Gemini: `wrangler secret put GEMINI_API_KEY`
4. Frontend label strings are cosmetic; redeploy GitHub Pages if attribution must match.

---

## 🔑 API Integration Details

### Hybrid Stock Data Architecture
MarketMind uses a hybrid approach to provide the best free-tier experience:

#### 1. Finnhub (Real-time Quotes)
- **Purpose:** Real-time price updates and percentage changes
- **Limit:** 60 calls/minute
- **Status:** Working perfectly for quotes
- **Documentation:** [https://finnhub.io/docs/api](https://finnhub.io/docs/api)

#### 2. Twelve Data (Historical Charts)
- **Purpose:** Daily candlestick data for charts
- **Limit:** 8 calls/minute, 800 calls/day (free tier)
- **Rate Limit Protection:** 8s delay between calls
- **Caching:** Aggressive KV caching to minimize API usage
- **Fallback:** Stale cache is served if API limit is reached
- **Documentation:** [https://twelvedata.com/docs](https://twelvedata.com/docs)

#### Why Two APIs?

**Problem**: Single API providers often have severe rate limitations  
**Solution**: Twelve Data provides reliable historical data + KV caching for efficiency

**Data Consistency**:
- ✅ After market close (4:00 PM - 9:30 AM ET): Perfect consistency
- 🟡 During market hours: Quotes show live prices, charts show recent data
- 📊 Historical data: Reliable data from Twelve Data

### CoinGecko API
- **Endpoint**: Crypto prices and OHLC candles
- **Free Tier**: 10-30 calls/minute
- **Documentation:** [https://www.coingecko.com/en/api/documentation](https://www.coingecko.com/en/api/documentation)
- **Robustness**: Includes fallback to price history if OHLC is missing (e.g., for MATIC/POL)
- **Caching**: 5 minutes

### Gold API
- **Endpoint**: Metal prices (gold, silver)
- **Free Tier**: 100 calls/month
- **Documentation:** [https://www.goldapi.io/](https://www.goldapi.io/)
- **Caching**: 5 minutes

### Marketaux News API
- **Endpoint**: Financial news articles
- **Free Tier**: 100 articles/day
- **Documentation:** [https://www.marketaux.com/documentation](https://www.marketaux.com/documentation)
- **Caching**: 10 minutes

### Cloudflare Workers AI
- **Endpoint**: `POST /api/ai/analyze` (Worker route; model invoked via `env.AI.run`)
- **Default model**: `@cf/zai-org/glm-4.7-flash` (operator-configurable; not client-selectable)
- **Free allocation**: 10,000 Neurons/day (account-wide, not unlimited)
- **Documentation:** [Workers AI](https://developers.cloudflare.com/workers-ai/) / [GLM-4.7-Flash](https://developers.cloudflare.com/workers-ai/models/glm-4.7-flash/)
- **Caching**: Successful answers cached in KV for 30 minutes (namespace `ai:wai:v1`, includes model + prompt version + market-context fingerprint)

---

## 📦 **Tech Stack**

### Frontend
- React 18
- TypeScript
- Vite
- Recharts (charts)
- Lucide React (icons)
- Tailwind CSS

### Worker
- Cloudflare Workers
- TypeScript
- Cloudflare KV (caching)
- Native Fetch API (no external framework)

---

## 🐛 **Debugging**

### Worker Logs
```bash
wrangler tail --format pretty
```

### Check Secrets
```bash
wrangler secret list
```

### Test Endpoints
```bash
# Replace YOUR_WORKER_URL with your actual worker URL

# Test stock data
curl "YOUR_WORKER_URL/api/stocks?symbol=AAPL&timeframe=1W"

# Test crypto data
curl "YOUR_WORKER_URL/api/crypto?symbol=BTC&timeframe=1D"

# Test quote
curl "YOUR_WORKER_URL/api/quote?symbol=AAPL"

# Test news
curl "YOUR_WORKER_URL/api/news?symbols=AAPL,TSLA"
```

---

## 📄 **License**

MIT

---

## 🤝 **Contributing**

Contributions welcome! Please open an issue first to discuss proposed changes.
