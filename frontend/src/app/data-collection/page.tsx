'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { ApiFetchPanel } from '@/components/ApiFetchPanel';
import { DataCollectionForm } from '@/components/DataCollectionForm';
import { DataCollectionTable } from '@/components/DataCollectionTable';
import { apiFetch } from '@/lib/api';
import type { DataCollectionEntry } from '@/lib/types';

interface Provider {
  id: string;
  name: string;
  configured: boolean;
}

const SOURCE_INFO = [
  { name: 'Finnhub', type: 'Real-time stock quotes', provider: 'finnhub' },
  { name: 'Alpha Vantage', type: 'Quotes & RSI indicator', provider: 'alpha_vantage' },
  { name: 'FRED', type: 'US economic indicators', provider: 'fred' },
  { name: 'NewsAPI', type: 'Financial news headlines', provider: 'newsapi' },
  { name: 'Manual Entry', type: 'Custom data points', provider: null },
];

export default function DataCollectionPage() {
  const [entries, setEntries] = useState<DataCollectionEntry[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      apiFetch<DataCollectionEntry[]>('/api/data-collection'),
      apiFetch<Provider[]>('/api/fetch/providers').catch(() => []),
    ])
      .then(([data, provs]) => {
        setEntries(data);
        setProviders(provs);
      })
      .catch(() => setError('Could not load data. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  function addEntries(newEntries: DataCollectionEntry[]) {
    setEntries((prev) => [...newEntries, ...prev]);
  }

  return (
    <div>
      <PageHeader
        title="Data Collection"
        description="Fetch live data from financial APIs or add entries manually."
      />

      {error && (
        <div className="mb-6 rounded-lg border border-negative/30 bg-negative/10 px-4 py-3 text-sm text-negative">
          {error}
        </div>
      )}

      <div className="mb-6 rounded-xl border border-border-subtle bg-surface-raised p-5">
        <h3 className="text-sm font-semibold">Data Sources</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SOURCE_INFO.map((source) => {
            const prov = providers.find((p) => p.id === source.provider);
            const status = source.provider
              ? prov?.configured
                ? 'Active'
                : 'Key needed'
              : 'Active';

            return (
              <div
                key={source.name}
                className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-3 py-2.5"
              >
                <div>
                  <p className="text-xs font-medium">{source.name}</p>
                  <p className="text-[11px] text-text-muted">{source.type}</p>
                </div>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider ${
                    status === 'Active' ? 'text-positive' : 'text-warning'
                  }`}
                >
                  {status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <ApiFetchPanel onEntriesFetched={addEntries} />

      <div className="mt-6">
        <DataCollectionForm onEntryAdded={(entry) => addEntries([entry])} />
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold">
          Collected Data
          {!loading && (
            <span className="ml-2 text-xs font-normal text-text-muted">
              ({entries.length} entries)
            </span>
          )}
        </h3>
        {loading ? (
          <div className="rounded-xl border border-border-subtle bg-surface-raised p-12 text-center text-sm text-text-muted">
            Loading...
          </div>
        ) : (
          <DataCollectionTable
            entries={entries}
            onEntryDeleted={(id) =>
              setEntries((prev) => prev.filter((e) => e._id !== id))
            }
          />
        )}
      </div>
    </div>
  );
}
