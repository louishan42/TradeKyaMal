# TradeTan — Trading Intelligence Dashboard

Design Thinking 3 assignment platform for trading data collection and multi-agent analysis.

## Tech Stack

| Layer | Language / Tool | Why |
|-------|----------------|-----|
| **Frontend** | TypeScript + Next.js 15 + Tailwind CSS | Professional dashboard UI, fast dev, great for presentations |
| **Backend** | TypeScript + Express.js | Clean REST API, easy MongoDB integration, same language as frontend |
| **Database** | MongoDB + Mongoose | Flexible schema for varied trading data (prices, indicators, sentiment) |
| **Shared types** | TypeScript | Keeps frontend and backend in sync |

## Folder Structure

```
TradeTan/
├── frontend/          # Next.js dashboard (UI)
│   └── src/
│       ├── app/       # Pages (overview, data collection, agents)
│       ├── components/
│       └── lib/       # API client & types
├── backend/           # Express REST API
│   └── src/
│       ├── config/    # Database connection
│       ├── models/    # MongoDB schemas
│       └── routes/    # API endpoints
└── shared/            # Shared TypeScript types
    └── types/
```

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB running locally (`brew services start mongodb-community`) or a [MongoDB Atlas](https://www.mongodb.com/atlas) free cluster

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Runs on **http://localhost:4000**

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Runs on **http://localhost:3000**

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/data-collection` | List collected data |
| POST | `/api/data-collection` | Add a data point |
| DELETE | `/api/data-collection/:id` | Remove a data point |
| GET | `/api/data-collection/stats` | Dashboard statistics |
| GET | `/api/fetch/providers` | List API providers and key status |
| POST | `/api/fetch` | Fetch from external API and save to DB |
| GET | `/api/agents` | List all agents |
| GET | `/api/agents/:id` | Agent details & run history |
| GET | `/api/market/quote/:symbol` | Live quote (requires Finnhub key) |

## Recommended Trading APIs

| API | Use Case | Free Tier |
|-----|----------|-----------|
| [Finnhub](https://finnhub.io) | Real-time quotes, news, earnings | 60 calls/min |
| [Alpha Vantage](https://www.alphavantage.co) | Stocks, forex, technical indicators | 25 calls/day |
| [FRED](https://fred.stlouisfed.org/docs/api/) | US economic indicators (CPI, rates) | Unlimited |
| [Polygon.io](https://polygon.io) | Historical & real-time market data | Limited free |
| [NewsAPI](https://newsapi.org) | Financial news for sentiment | 100 req/day |

Add `FINNHUB_API_KEY` to `backend/.env` to enable live market quotes.

## Agents (Placeholders)

Three agent modules are scaffolded but not yet implemented:

- **Almanac Agent** — seasonal/calendar pattern analysis
- **Macro Agent** — macroeconomic indicator monitoring
- **Technical Agent** — price action & indicator signals

Wire agent logic in `backend/src/routes/agents.ts` and replace placeholders in `frontend/src/app/agents/`.

## Deployment

| Service | Platform | Guide |
|---------|----------|-------|
| Frontend | Vercel | Set root directory to `frontend` |
| Backend | Railway / Render | Set root directory to `backend` |
| Database | MongoDB Atlas | Free M0 cluster |

Full step-by-step instructions: **[DEPLOYMENT.md](./DEPLOYMENT.md)**

## Assignment Notes

This platform demonstrates the **data collection → analysis → decision** pipeline central to design thinking in trading systems. Start by populating the data collection layer, then connect each agent to consume that data and produce actionable signals.
