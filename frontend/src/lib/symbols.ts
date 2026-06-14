export interface SymbolOption {
  value: string;
  label: string;
}

export const STOCK_SYMBOLS: SymbolOption[] = [
  { value: 'AAPL', label: 'AAPL — Apple' },
  { value: 'MSFT', label: 'MSFT — Microsoft' },
  { value: 'GOOGL', label: 'GOOGL — Alphabet' },
  { value: 'AMZN', label: 'AMZN — Amazon' },
  { value: 'META', label: 'META — Meta Platforms' },
  { value: 'TSLA', label: 'TSLA — Tesla' },
  { value: 'NVDA', label: 'NVDA — NVIDIA' },
  { value: 'JPM', label: 'JPM — JPMorgan Chase' },
  { value: 'V', label: 'V — Visa' },
  { value: 'WMT', label: 'WMT — Walmart' },
  { value: 'JNJ', label: 'JNJ — Johnson & Johnson' },
  { value: 'PG', label: 'PG — Procter & Gamble' },
  { value: 'UNH', label: 'UNH — UnitedHealth' },
  { value: 'HD', label: 'HD — Home Depot' },
  { value: 'BAC', label: 'BAC — Bank of America' },
  { value: 'XOM', label: 'XOM — Exxon Mobil' },
  { value: 'DIS', label: 'DIS — Walt Disney' },
  { value: 'NFLX', label: 'NFLX — Netflix' },
  { value: 'AMD', label: 'AMD — Advanced Micro Devices' },
  { value: 'INTC', label: 'INTC — Intel' },
];

export const FRED_SERIES: SymbolOption[] = [
  { value: 'FEDFUNDS', label: 'FEDFUNDS — Fed Funds Rate' },
  { value: 'CPIAUCSL', label: 'CPIAUCSL — CPI (Inflation)' },
  { value: 'UNRATE', label: 'UNRATE — Unemployment Rate' },
  { value: 'GDP', label: 'GDP — Gross Domestic Product' },
  { value: 'DGS10', label: 'DGS10 — 10-Year Treasury Yield' },
  { value: 'T10Y2Y', label: 'T10Y2Y — 10Y-2Y Spread' },
];

export const NEWS_QUERIES: SymbolOption[] = [
  { value: 'Apple stock OR AAPL', label: 'AAPL — Apple' },
  { value: 'Microsoft stock OR MSFT', label: 'MSFT — Microsoft' },
  { value: 'Tesla stock OR TSLA', label: 'TSLA — Tesla' },
  { value: 'NVIDIA stock OR NVDA', label: 'NVDA — NVIDIA' },
  { value: 'Federal Reserve interest rates', label: 'Fed & interest rates' },
  { value: 'US inflation economy', label: 'US inflation & economy' },
];

const SELECT_CLASS =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent';

export { SELECT_CLASS };

export function getDefaultFieldValue(fieldName: string, _providerId: string): string {
  if (fieldName === 'symbol') return STOCK_SYMBOLS[0]?.value ?? '';
  if (fieldName === 'seriesId') return FRED_SERIES[0]?.value ?? '';
  if (fieldName === 'query') return NEWS_QUERIES[0]?.value ?? '';
  if (fieldName === 'indicator') return 'quote';
  return '';
}

export function getFieldOptions(
  fieldName: string,
  _providerId: string
): SymbolOption[] | null {
  if (fieldName === 'symbol') return STOCK_SYMBOLS;
  if (fieldName === 'seriesId') return FRED_SERIES;
  if (fieldName === 'query') return NEWS_QUERIES;
  return null;
}
