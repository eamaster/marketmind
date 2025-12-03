# MarketMind 📊 

Real-time financial market analysis dashboard powered by Cloudflare Workers and React.

---

## ✨ **Features**

- **Real-time Stock Quotes**: Live price updates using Finnhub API
- **Interactive Charts**: Historical candlestick charts with Massive.com (Polygon.io) API
- **Market News \u0026 Sentiment**: Financial news with sentiment analysis
- **AI Analysis**: Google Gemini AI-powered market insights
- **Asset Tracking**: Track stocks, commodities (gold, oil)
-**Cloudflare KV Caching**: Aggressive caching (94%+ cache hit rate) for performance

---

## 🏗️ **Architecture**

### **Frontend** (React + TypeScript)
- Deployed on GitHub Pages
- Responsive design with dark mode
- Built with Vite for blazing-fast dev experience

### **Worker** (Cloudflare Workers + TypeScript)
- Serverless API backend
- Cloudflare KV for caching
- CORS-enabled for frontend access

### **APIs**
- **Finnhub**: Real-time stock quotes (60 calls/minute)
- **Massive.com (Polygon.io)**: Historical candles (5 calls/minute, unlimited daily)
-  **Marketaux**: Financial news
- **Gold/Oil APIs**: Commodity prices
- **Google Gemini**: AI market analysis

---

## 🚀 **Quick Start**

### Prerequisites

- Node.js 18+
- Cloudflare account (for Workers)
- API keys:
  - [Finnhub](https://finnhub.io/register) (free tier)
  - [Massive.com](https://massive.com/register) (free tier)
  - [Marketaux](https://www.marketaux.com/)
  - [Oil Price API](https://www.oilpriceapi.com/)
  - [Gold API](https://www.goldapi.io/)
  - [Google Gemini](https://makersuite.google.com/app/apikey)

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
# Then set Cloudflare secrets
wrangler secret put FINNHUB_API_KEY
wrangler secret put MASSIVE_API_KEY
wrangler secret put MARKETAUX_API_TOKEN
wrangler secret put OILPRICE_API_KEY
wrangler secret put GOLD_API_KEY
wrangler secret put GEMINI_API_KEY

# Create KV namespace
wrangler kv namespace create MARKETMIND_CACHE
# Copy the ID to wrangler.toml

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
- Production API URL: `https://marketmind-worker.smah0085.workers.dev/api`

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
wrangler secret put MASSIVE_API_KEY
wrangler secret put MARKETAUX_API_TOKEN
wrangler secret put OILPRICE_API_KEY
wrangler secret put GOLD_API_KEY
wrangler secret put GEMINI_API_KEY
```

**Deploy Worker:**
```bash
npm run deploy
# or
wrangler deploy
```

**Deployed at:** https://marketmind-worker.smah0085.workers.dev

---

## 🧪 Testing \u0026 Verification

### Type Checking
```bash
# Frontend
cd frontend && npm run type-check

# Worker
cd worker && npm run type-check
```

### Build Verification
```bash
# Build frontend
cd frontend && npm run build

# Test production build locally
npm run preview
```

### Linting
```bash
cd frontend && npm run lint
```

---

## 🔑 API Integration Details

### Hybrid Stock Data Architecture
MarketMind uses a hybrid approach to provide the best free-tier experience:

#### 1. Finnhub (Real-time Quotes)
- **Purpose:** Real-time price updates and percentage changes
- **Limit:** 60 calls/minute
- **Status:** Working perfectly for quotes
- **Documentation:** [https://finnhub.io/docs/api](https://finnhub.io/docs/api)

#### 2. Massive.com (Historical Charts)
- **Purpose:** Daily candlestick data for charts
- **Limit:** 5 calls/minute (free tier), unlimited daily calls
- **Rate Limit Protection:** 12s delay between calls
- **Caching:** Aggressive KV caching to minimize API usage
- **Fallback:** Stale cache is served if API limit is reached
- **Documentation:** [https://massive.com/docs/rest/quickstart](https://massive.com/docs/rest/quickstart)
- **Note:** Formerly Polygon.io (rebranded October 2025)

#### Why Two APIs?

**Problem**: Previous providers had severe limitations (Alpha Vantage: 25/day, Finnhub free tier: blocked candles)  
**Solution**: Massive.com provides 5 calls/minute with unlimited daily calls + KV caching

**Data Consistency**:
- ✅ After market close (4:00 PM - 9:30 AM ET): Perfect consistency
- 🟡 During market hours: Quotes show live prices, charts show recent data
- 📊 Historical data: 2+ years of reliable data from Massive.com

### API Rate Limits Comparison

| Provider | Alpha Vantage | Massive.com | Finnhub |
|----------|---------------|-------------|---------|
| **Daily Calls** | ❌ 25/day | ✅ Unlimited | ✅ Unlimited |
| **Per-Minute** | ❌ N/A | ✅ 5/min | ✅ 60/min |
| **With KV Cache** | ❌ Still hits limit | ✅ ~10-30/day | ✅ ~500-1000/day |
| **Historical Data** | ✅ 20+ years | ✅ 2+ years | ❌ Blocked (free tier) |
| **Use Case** | ❌ Unusable | ✅ Charts | ✅ Quotes |

### Other APIs


**Data Quality**: Daily candles provide accurate historical price data suitable for:
- Long-term trend analysis
- Technical analysis (support/resistance calculations)
- AI-powered market insights

### Gold API
- **Endpoint**: Metal prices (gold, silver)
- **Free Tier**: 100 calls/month
- **Documentation:** [https://www.goldapi.io/](https://www.goldapi.io/)
- **Caching**: 5 minutes

### Oil Price API
- **Endpoint**: Crude oil commodity prices
- **Free Tier**: 100 calls/month
- **Documentation:** [https://www.oilpriceapi.com/](https://www.oilpriceapi.com/)
- **Caching**: 5 minutes

### Marketaux News API
- **Endpoint**: Financial news articles
- **Free Tier**: 100 articles/day
- **Documentation:** [https://www.marketaux.com/documentation](https://www.marketaux.com/documentation)
- **Caching**: 10 minutes

### Google Gemini API
- **Endpoint**: AI-powered market analysis
- **Free Tier**: 60 requests/minute  
- **Documentation:** [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)
- **Caching**: None (real-time responses)

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
- Hono framework (routing)

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
# Test Massive.com integration
curl https://marketmind-worker.smah0085.workers.dev/api/test-massive

# Test stock data
curl "https://marketmind-worker.smah0085.workers.dev/api/stocks?symbol=AAPL&timeframe=1W"

# Test quote
curl "https://marketmind-worker.smah0085.workers.dev/api/quote?symbol=AAPL"

# Test news
curl "https://marketmind-worker.smah0085.workers.dev/api/news?symbols=AAPL,TSLA"
```

---

## 📄 **License**

MIT

---

## 🤝 **Contributing**

Contributions welcome! Please open an issue first to discuss proposed changes.
