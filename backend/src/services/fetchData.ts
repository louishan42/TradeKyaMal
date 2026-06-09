import { DataCollection } from '../models/DataCollection';
import type { ProviderId } from './providers';

export interface FetchParams {
  provider: ProviderId;
  symbol?: string;
  seriesId?: string;
  query?: string;
  indicator?: string;
}

export interface FetchedEntry {
  symbol: string;
  source: string;
  label: string;
  value: string | number;
  metadata?: Record<string, unknown>;
}

interface FinnhubQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

async function fetchFinnhub(symbol: string): Promise<FetchedEntry[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) throw new Error('FINNHUB_API_KEY not configured');

  const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`;
  const res = await fetch(url);
  const data = (await res.json()) as FinnhubQuote;

  if (!data.c) throw new Error(`No quote found for ${symbol}`);

  return [
    {
      symbol,
      source: 'market_price',
      label: 'Current Price',
      value: data.c,
      metadata: { provider: 'finnhub', change: data.d, changePercent: data.dp },
    },
    {
      symbol,
      source: 'market_price',
      label: 'Day High',
      value: data.h,
      metadata: { provider: 'finnhub' },
    },
    {
      symbol,
      source: 'market_price',
      label: 'Day Low',
      value: data.l,
      metadata: { provider: 'finnhub' },
    },
    {
      symbol,
      source: 'market_price',
      label: 'Open Price',
      value: data.o,
      metadata: { provider: 'finnhub' },
    },
  ];
}

async function fetchAlphaVantage(
  symbol: string,
  indicator = 'quote'
): Promise<FetchedEntry[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) throw new Error('ALPHA_VANTAGE_API_KEY not configured');

  if (indicator === 'rsi') {
    const url = `https://www.alphavantage.co/query?function=RSI&symbol=${symbol}&interval=daily&time_period=14&series_type=close&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = (await res.json()) as Record<string, Record<string, { RSI: string }>>;

    const series = data['Technical Analysis: RSI'];
    if (!series) {
      const msg = (data as { Note?: string; Information?: string }).Note ||
        (data as { Information?: string }).Information;
      throw new Error(msg || 'RSI data unavailable — check API rate limit');
    }

    const latest = Object.entries(series)[0];
    return [
      {
        symbol,
        source: 'technical_indicator',
        label: 'RSI (14-day)',
        value: parseFloat(latest[1].RSI),
        metadata: { provider: 'alpha_vantage', date: latest[0] },
      },
    ];
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
  const res = await fetch(url);
  const data = (await res.json()) as Record<string, Record<string, string>>;

  const quote = data['Global Quote'];
  if (!quote || !quote['05. price']) {
    const msg = (data as { Note?: string; Information?: string }).Note ||
      (data as { Information?: string }).Information;
    throw new Error(msg || `No quote found for ${symbol}`);
  }

  return [
    {
      symbol,
      source: 'market_price',
      label: 'Current Price',
      value: parseFloat(quote['05. price']),
      metadata: {
        provider: 'alpha_vantage',
        change: quote['09. change'],
        changePercent: quote['10. change percent'],
        volume: quote['06. volume'],
      },
    },
    {
      symbol,
      source: 'market_price',
      label: 'Volume',
      value: parseInt(quote['06. volume'], 10),
      metadata: { provider: 'alpha_vantage' },
    },
  ];
}

async function fetchFred(seriesId: string): Promise<FetchedEntry[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error('FRED_API_KEY not configured');

  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=1`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    observations?: { date: string; value: string }[];
    error_message?: string;
  };

  if (data.error_message) throw new Error(data.error_message);

  const latest = data.observations?.[0];
  if (!latest || latest.value === '.') {
    throw new Error(`No data for FRED series ${seriesId}`);
  }

  return [
    {
      symbol: seriesId,
      source: 'economic_indicator',
      label: `${seriesId} Latest Value`,
      value: parseFloat(latest.value),
      metadata: { provider: 'fred', date: latest.date, seriesId },
    },
  ];
}

async function fetchNewsApi(query: string): Promise<FetchedEntry[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) throw new Error('NEWSAPI_KEY not configured');

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    totalResults: number;
    articles: { title: string; source: { name: string }; publishedAt: string }[];
    message?: string;
  };

  if (data.status !== 'ok') {
    throw new Error(data.message || 'NewsAPI request failed');
  }

  const symbol = query.split(' ')[0].toUpperCase().slice(0, 10);

  return data.articles.map((article, i) => ({
    symbol,
    source: 'news_sentiment',
    label: `Headline ${i + 1}`,
    value: article.title,
    metadata: {
      provider: 'newsapi',
      source: article.source.name,
      publishedAt: article.publishedAt,
      query,
    },
  }));
}

export async function fetchFromProvider(params: FetchParams): Promise<FetchedEntry[]> {
  switch (params.provider) {
    case 'finnhub':
      if (!params.symbol) throw new Error('symbol is required');
      return fetchFinnhub(params.symbol.toUpperCase());
    case 'alpha_vantage':
      if (!params.symbol) throw new Error('symbol is required');
      return fetchAlphaVantage(params.symbol.toUpperCase(), params.indicator);
    case 'fred':
      if (!params.seriesId) throw new Error('seriesId is required');
      return fetchFred(params.seriesId.toUpperCase());
    case 'newsapi':
      if (!params.query) throw new Error('query is required');
      return fetchNewsApi(params.query);
    default:
      throw new Error('Unknown provider');
  }
}

export async function fetchAndStore(params: FetchParams) {
  const entries = await fetchFromProvider(params);
  const now = new Date();

  const saved = await Promise.all(
    entries.map((entry) =>
      DataCollection.create({
        ...entry,
        symbol: entry.symbol.toUpperCase(),
        collectedAt: now,
      })
    )
  );

  return saved;
}
