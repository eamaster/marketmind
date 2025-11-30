# MarketMind 📈

A real-time financial analytics platform with AI-powered market insights. Track stocks, commodities, and precious metals with live data, interactive charts, and intelligent sentiment analysis.

**🌐 Live Demo:** [https://eamaster.github.io/marketmind](https://eamaster.github.io/marketmind)

---

## ✨ Features

### 📊 Real-Time Market Data
- **Stocks**: AAPL, TSLA, NVDA, MSFT, GOOGL, AMZN, META
- **Oil & Energy**: WTI Crude, Brent Crude
- **Precious Metals**: Gold (XAU), Silver (XAG)

### 🤖 AI-Powered Analysis
- Context-aware market analysis using **Google Gemini 3 Pro Preview**
- Ask questions about market trends, price movements, and sentiment
- Real-time AI insights based on current data and news

### 📰 News & Sentiment
- Aggregated financial news from multiple sources
- Bull/Bear sentiment indicators
- Real-time sentiment scoring

### 📈 Interactive Visualizations
- Beautiful, responsive charts powered by Recharts
- Multiple timeframes: 1 Day, 1 Week, 1 Month
- OHLC data with volume indicators

---

## 🏗️ Architecture

```
Frontend (React + Vite + TailwindCSS)
          ↓
     API Requests
          ↓
Cloudflare Worker (BFF Layer)
          ↓
    External APIs
    ├── Finnhub (Stocks)
    ├── Marketaux (News)
    ├── OilPriceAPI (Energy)
    ├── Gold API (Metals)
    └── Google Gemini (AI)
```

### Project Structure

```
marketmind/
├── frontend/               # React SPA
│   ├── src/
│   │   ├── components/    # UI Components
│   │   │   ├── ai/       # AI chat components
│   │   │   ├── charts/   # Chart visualizations
│   │   │   ├── layout/   # Layout components
│   │   │   └── shared/   # Shared UI elements
│   │   ├── hooks/        # Custom React hooks
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   └── config/       # Asset configurations
│   └── package.json
│
├── worker/                # Cloudflare Worker
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   │   ├── stocks.ts
│   │   │   ├── oil.ts
│   │   │   ├── gold.ts
│   │   │   ├── news.ts
│   │   │   ├── quote.ts
│   │   │   └── aiAnalyze.ts
│   │   ├── integrations/ # External API clients
│   │   │   ├── finnhub.ts
│   │   │   ├── oilprice.ts
│   │   │   ├── goldApi.ts
│   │   │   ├── marketaux.ts
│   │   │   └── gemini.ts
│   │   └── core/         # Shared utilities
│   └── wrangler.toml
│
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Cloudflare account** (for Worker deployment)
- **API Keys** (optional for development, required for production):
  - [Finnhub](https://finnhub.io/) - Stock market data
  - [Marketaux](https://www.marketaux.com/) - Financial news
  - [OilPriceAPI](https://www.oilpriceapi.com/) - Energy commodities
  - [Gold API](https://www.goldapi.io/) - Precious metals
  - [Google AI Studio](https://aistudio.google.com/app/apikey) - Gemini API

> **Note:** The application includes mock data fallback for all APIs. You can run it locally without API keys for development and testing.

---

### 🛠️ Local Development

#### 1. Clone the Repository

```bash
git clone https://github.com/eamaster/marketmind.git
cd marketmind
```

#### 2. Install Dependencies

```bash
# Install frontend dependencies
cd frontend
npm install

# Install worker dependencies
cd ../worker
npm install
```

#### 3. Configure API Keys (Optional)

Create `worker/.dev.vars` file for local development:

```env
# Optional - app will use mock data if not provided
FINNHUB_API_KEY=your_finnhub_api_key
MARKETAUX_API_TOKEN=your_marketaux_token
OILPRICE_API_KEY=your_oilprice_api_key
GOLD_API_KEY=your_gold_api_key
GEMINI_API_KEY=your_gemini_api_key
```

> **Important:** The `.dev.vars` file is gitignored and should never be committed to version control.

#### 4. Start Development Servers

**Terminal 1 - Start Worker:**
```bash
cd worker
npm run dev
# Worker runs on http://localhost:8787
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
# Frontend runs on http://localhost:5173
```

The frontend automatically proxies `/api` requests to the worker during development.

#### 5. Open in Browser

Visit **http://localhost:5173** to see the application.

---

## 📦 Deployment

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

**One-Time Setup - Configure Secrets:**
```bash
cd worker

# Set production API keys as Cloudflare secrets
wrangler secret put FINNHUB_API_KEY
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

## 🧪 Testing & Verification

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

### Finnhub (Stock Data)
- **Endpoint:** Stock candles and quotes
- **Free Tier:** Limited to daily resolution
- **Fallback:** Mock data with realistic price generation
- **Rate Limit:** 60 calls/minute (free tier)

### Marketaux (Financial News)
- **Endpoint:** News articles with sentiment scores
- **Free Tier:** 100 requests/day
- **Cache:** 30 minutes server-side caching
- **Fallback:** Mock news articles

### OilPriceAPI (Energy Commodities)
- **Endpoint:** Oil prices (WTI, Brent)
- **Note:** Currently using mock data (API requires paid plan for historical data)
- **Fallback:** Realistic mock data generation

### Gold API (Precious Metals)
- **Endpoint:** Gold and Silver prices
- **Note:** API provides current price only
- **Fallback:** Mock historical data for charts

### Google Gemini (AI Analysis)
- **Model:** `gemini-3-pro-preview`
- **Features:** Context-aware market analysis
- **Input:** Chart data, news articles, and user questions
- **Output:** Markdown-formatted AI insights
- **Fallback:** Template-based mock responses

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 7
- **Language:** TypeScript
- **Styling:** TailwindCSS 3
- **Charts:** Recharts 3
- **State Management:** TanStack Query (React Query)
- **UI Components:** Headless UI, Lucide React

### Backend (Worker)
- **Runtime:** Cloudflare Workers
- **Language:** TypeScript
- **Framework:** Custom routing with Hono-like patterns

### DevOps
- **CI/CD:** GitHub Actions
- **Frontend Hosting:** GitHub Pages
- **Worker Hosting:** Cloudflare Workers
- **Package Manager:** npm

---

## 📱 Browser Support

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Mobile responsive (optimized for desktop, mobile improvements in progress)

---

## 🔒 Security

- ✅ No API keys in frontend code
- ✅ All sensitive keys stored in Cloudflare Worker secrets
- ✅ `.dev.vars` properly gitignored
- ✅ CORS configured for production endpoints
- ✅ Git history cleaned of any past API key exposure

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (type-check + build)
5. Submit a pull request

---

## 🙏 Acknowledgments

- Market data provided by Finnhub, Marketaux, OilPriceAPI, and Gold API
- AI powered by Google Gemini
- Charts by Recharts
- Hosted on Cloudflare Workers and GitHub Pages

---

**MarketMind** - Real-time financial intelligence at your fingertips 📊✨

For questions or issues, please open an issue on GitHub.
