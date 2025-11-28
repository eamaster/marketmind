# MarketMind Financial Intelligence Platform

A production-grade real-time financial analytics web application with AI-powered market insights.

## 🎯 Features

- **Real-time Market Data**: Live prices for stocks, oil, and precious metals
- **Interactive Charts**: Line charts with Recharts for all asset types
- **Sentiment Analysis**: Bull/bear indicators from news sentiment
- **AI Market Analyst**: Context-aware AI powered by Google Gemini

 - **Multi-Asset Support**:
  - 📈 Stocks (AAPL, TSLA, NVDA, MSFT, GOOGL, AMZN, META)
  - 🛢️ Oil (WTI Crude, Brent Crude)
  - 💰 Precious Metals (Gold, Silver)

## 🏗️ Architecture

```
marketmind/
├── frontend/          # React + Vite + TailwindCSS SPA
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Dashboard page
│   │   ├── services/    # API client
│   │   └── config/      # Assets configuration
│   └── package.json
├── worker/            # Cloudflare Worker BFF
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── integrations/ # External API clients
│   │   └── core/        # Utilities (cache, prompt builder)
│   └── wrangler.toml
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (for Worker deployment)
- API keys for:
  - OilPriceAPI
  - Gold API
  - Finnhub
  - Marketaux
  - Google Gemini

### Local Development

**1. Install Dependencies**

```bash
# Frontend
cd frontend
npm install

# Worker
cd ../worker
npm install
```

**2. Configure Environment Variables**

Create a `.dev.vars` file in the `worker/` directory:

```env
OILPRICE_API_KEY=your_oilprice_api_key
GOLD_API_KEY=your_gold_api_key
FINNHUB_API_KEY=your_finnhub_api_key
MARKETAUX_API_TOKEN=your_marketaux_token
GEMINI_API_KEY=your_gemini_api_key
```

> **Note**: If API keys are not configured, the application will use mock data for development.

**3. Start Development Servers**

Terminal 1 - Worker:
```bash
cd worker
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

The frontend will proxy API requests to the Worker at `http://localhost:8787`.

**4. Open Browser**

Visit `http://localhost:5173` to see the application.

## 📦 Deployment

### Frontend (GitHub Pages)

```bash
cd frontend
npm run build

# Deploy the dist/ folder to GitHub Pages
# Configure repository settings to serve from /docs or gh-pages branch
```

Update `vite.config.ts` base path to match your repository name.

### Worker (Cloudflare)

```bash
cd worker

# Configure secrets (one-time setup)
wrangler secret put OILPRICE_API_KEY
wrangler secret put GOLD_API_KEY
wrangler secret put FINNHUB_API_KEY
wrangler secret put MARKETAUX_API_TOKEN
wrangler secret put GEMINI_API_KEY

# Deploy
npm run deploy
```

Update the frontend `apiClient.ts` to use your deployed Worker URL in production.

## 🧪 Testing

```bash
# Type checking
cd frontend && npm run type-check
cd ../worker && npm run type-check

# Build verification
cd frontend && npm run build
```

## 🔑 API Integration Notes

### Mock Data Fallback

All API integrations include mock data fallbacks for development. Configure real API keys for production deployment.

### Rate Limiting

- **Marketaux**: 100 requests/day (free tier) - cached for 30 minutes
- **Other APIs**: Refer to respective documentation for limits

### Gemini Model

Currently using `gemini-1.5-pro`. Update `worker/src/integrations/gemini.ts` to switch models.

## 📱 Mobile Responsiveness

The dashboard is optimized for desktop. Mobile optimizations are in progress (refer to task.md).

## 🛠️ Tech Stack

**Frontend:**
- React 18
- Vite
- TypeScript
- TailwindCSS
- Recharts

**Backend:**
- Cloudflare Workers
- TypeScript

 **APIs:**
- OilPriceAPI
- Gold API
- Finnhub
- Marketaux
- Google Gemini

## 📄 License

MIT

## 🤝 Contributing

This is a production-grade project. Contributions are welcome via pull requests.

---

**MarketMind** - Real-time financial intelligence at your fingertips.
