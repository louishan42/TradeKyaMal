'use client';

import { useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { DataCollectionEntry, DataSourceType } from '@/lib/types';

const sources: { value: DataSourceType; label: string }[] = [
  { value: 'market_price', label: 'Market Price' },
  { value: 'economic_indicator', label: 'Economic Indicator' },
  { value: 'news_sentiment', label: 'News Sentiment' },
  { value: 'technical_indicator', label: 'Technical Indicator' },
  { value: 'custom', label: 'Custom' },
];

interface DataCollectionFormProps {
  onEntryAdded: (entry: DataCollectionEntry) => void;
}

export function DataCollectionForm({ onEntryAdded }: DataCollectionFormProps) {
  const [symbol, setSymbol] = useState('');
  const [source, setSource] = useState<DataSourceType>('market_price');
  const [label, setLabel] = useState('');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const parsedValue = !isNaN(Number(value)) ? Number(value) : value;
      const entry = await apiFetch<DataCollectionEntry>('/api/data-collection', {
        method: 'POST',
        body: JSON.stringify({ symbol, source, label, value: parsedValue }),
      });
      onEntryAdded(entry);
      setSymbol('');
      setLabel('');
      setValue('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add entry');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border-subtle bg-surface-raised p-5"
    >
      <h3 className="text-sm font-semibold">Collect New Data Point</h3>
      <p className="mt-1 text-xs text-text-muted">
        Manually log trading data or import from external APIs.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Symbol</label>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g. AAPL"
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value as DataSourceType)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          >
            {sources.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Label</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Closing Price"
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-secondary">Value</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. 198.50"
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      {error && <p className="mt-3 text-xs text-negative">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-4 flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Add Data Point
      </button>
    </form>
  );
}
