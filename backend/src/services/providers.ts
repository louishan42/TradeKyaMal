export type ProviderId = 'finnhub' | 'alpha_vantage' | 'fred' | 'newsapi';

export interface ProviderMeta {
  id: ProviderId;
  name: string;
  description: string;
  envKey: string;
  configured: boolean;
  fields: ProviderField[];
}

export interface ProviderField {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

export function getProviders(): ProviderMeta[] {
  return [
    {
      id: 'finnhub',
      name: 'Finnhub',
      description: 'Real-time stock quotes',
      envKey: 'FINNHUB_API_KEY',
      configured: Boolean(process.env.FINNHUB_API_KEY),
      fields: [
        { name: 'symbol', label: 'Symbol', placeholder: 'AAPL', required: true },
      ],
    },
    {
      id: 'alpha_vantage',
      name: 'Alpha Vantage',
      description: 'Stock quotes and RSI technical indicator',
      envKey: 'ALPHA_VANTAGE_API_KEY',
      configured: Boolean(process.env.ALPHA_VANTAGE_API_KEY),
      fields: [
        { name: 'symbol', label: 'Symbol', placeholder: 'AAPL', required: true },
        {
          name: 'indicator',
          label: 'Indicator',
          placeholder: 'quote or rsi',
          required: false,
        },
      ],
    },
    {
      id: 'fred',
      name: 'FRED',
      description: 'US economic indicators (rates, CPI, GDP)',
      envKey: 'FRED_API_KEY',
      configured: Boolean(process.env.FRED_API_KEY),
      fields: [
        {
          name: 'seriesId',
          label: 'Series ID',
          placeholder: 'FEDFUNDS or CPIAUCSL',
          required: true,
        },
      ],
    },
    {
      id: 'newsapi',
      name: 'NewsAPI',
      description: 'Financial news headlines for sentiment',
      envKey: 'NEWSAPI_KEY',
      configured: Boolean(process.env.NEWSAPI_KEY),
      fields: [
        {
          name: 'query',
          label: 'Search Query',
          placeholder: 'Apple stock OR AAPL',
          required: true,
        },
      ],
    },
  ];
}
