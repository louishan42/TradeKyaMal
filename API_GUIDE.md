# TradeKyaMal — API Data Fetch Guide

## Overview

TradeKyaMal pulls live trading data from external financial APIs through the backend, stores it in MongoDB, and displays it on the dashboard.

```
┌─────────────┐     POST /api/fetch      ┌─────────────┐     External API     ┌──────────┐
│  Dashboard  │ ──────────────────────► │   Backend   │ ──────────────────► │ Finnhub  │
│  (Vercel)   │                         │  (Render)   │                     │ FRED     │
│             │ ◄────────────────────── │             │ ◄────────────────── │ etc.     │
└─────────────┘     saved entries       └──────┬──────┘     raw data        └──────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │  MongoDB    │
                                          │   Atlas     │
                                          └─────────────┘
```

---

## Step-by-Step Process

### 1. Get API keys (one-time)

| Provider | What you get | Free signup |
|----------|-------------|-------------|
| Finnhub | Stock price, high, low, open | https://finnhub.io/register |
| Alpha Vantage | Stock quote or RSI indicator | https://www.alphavantage.co/support/#api-key |
| FRED | Fed rate, CPI, GDP, unemployment | https://fred.stlouisfed.org/docs/api/api_key.html |
| NewsAPI | Financial news headlines | https://newsapi.org/register |

### 2. Add keys to backend

**Local** — edit `backend/.env`:
```env
FINNHUB_API_KEY=your_key_here
ALPHA_VANTAGE_API_KEY=your_key_here
FRED_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here
MONGODB_URI=mongodb://localhost:27017/tradekyamal
```

**Production (Render)** — add the same keys in Render Dashboard → Environment.

### 3. Start the backend

```bash
cd backend
npm install
npm run dev
```

Backend runs at `http://localhost:4000`

### 4. Use the dashboard

1. Open `http://localhost:3000/data-collection`
2. In **Fetch from External APIs**:
   - Select a provider (e.g. Finnhub)
   - Enter a symbol (e.g. `AAPL`)
   - Click **Fetch & Save Data**
3. Data appears in the **Collected Data** table below

### 5. What happens behind the scenes

```
User clicks "Fetch & Save"
    → Frontend: POST /api/fetch { provider: "finnhub", symbol: "AAPL" }
    → Backend validates API key exists
    → Backend calls https://finnhub.io/api/v1/quote?symbol=AAPL&token=KEY
    → Backend parses response into data points (price, high, low, open)
    → Backend saves each point to MongoDB
    → Backend returns { count: 4, entries: [...] }
    → Frontend adds entries to the table
```

---

## API Reference

### List providers

```
GET /api/fetch/providers
```

Returns which APIs are configured (key present or missing).

### Fetch and store data

```
POST /api/fetch
Content-Type: application/json
```

**Finnhub (stock quote):**
```json
{ "provider": "finnhub", "symbol": "AAPL" }
```

**Alpha Vantage (quote):**
```json
{ "provider": "alpha_vantage", "symbol": "AAPL", "indicator": "quote" }
```

**Alpha Vantage (RSI):**
```json
{ "provider": "alpha_vantage", "symbol": "AAPL", "indicator": "rsi" }
```

**FRED (economic indicator):**
```json
{ "provider": "fred", "seriesId": "FEDFUNDS" }
```

Common FRED series: `FEDFUNDS` (Fed rate), `CPIAUCSL` (CPI), `UNRATE` (unemployment), `GDP`

**NewsAPI (headlines):**
```json
{ "provider": "newsapi", "query": "Apple stock" }
```

### View collected data

```
GET /api/data-collection
```

### Manual entry

```
POST /api/data-collection
Content-Type: application/json

{
  "symbol": "AAPL",
  "source": "market_price",
  "label": "Closing Price",
  "value": 198.50
}
```

---

## File Locations

| What | Where |
|------|-------|
| Fetch route | `backend/src/routes/fetch.ts` |
| Provider config | `backend/src/services/providers.ts` |
| API call logic | `backend/src/services/fetchData.ts` |
| MongoDB model | `backend/src/models/DataCollection.ts` |
| Dashboard UI | `frontend/src/components/ApiFetchPanel.tsx` |
| Data collection page | `frontend/src/app/data-collection/page.tsx` |
