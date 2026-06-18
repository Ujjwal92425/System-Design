'use client';

import { useMemo, useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

interface NodeMetric {
  id: string;
  label: string;
  qps: number;
  latency: number;
  errorRate: number;
  cpu?: number;
  memory?: number;
  queueDepth?: number;
}

interface SimNodeTableProps {
  nodes: NodeMetric[];
  chaosModes?: Record<string, string>;
}

type SortKey = 'label' | 'qps' | 'latency' | 'errorRate' | 'cpu';

export function SimNodeTable({ nodes, chaosModes = {} }: SimNodeTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('qps');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...nodes].sort((a, b) => {
      const av = sortKey === 'label' ? a.label : (a[sortKey] ?? 0);
      const bv = sortKey === 'label' ? b.label : (b[sortKey] ?? 0);
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [nodes, sortKey, sortAsc]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(false); }
  };

  if (nodes.length === 0) {
    return (
      <div className="text-center py-6 text-[11px] text-yc-text-muted font-mono">
        Start simulation to see per-node metrics
      </div>
    );
  }

  const cols: { key: SortKey; label: string; align?: string }[] = [
    { key: 'label', label: 'Node' },
    { key: 'qps', label: 'QPS' },
    { key: 'latency', label: 'Latency' },
    { key: 'cpu', label: 'CPU' },
    { key: 'errorRate', label: 'Errors' },
  ];

  return (
    <div className="border border-yc-border rounded-lg overflow-hidden">
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-[10px] font-mono">
          <thead className="bg-yc-bg-card sticky top-0 z-10">
            <tr>
              {cols.map((c) => (
                <th key={c.key} className="text-left px-2.5 py-1.5 text-yc-text-muted font-bold">
                  <button
                    type="button"
                    onClick={() => toggleSort(c.key)}
                    className="inline-flex items-center gap-0.5 hover:text-yc-accent"
                  >
                    {c.label}
                    {sortKey === c.key && <ArrowUpDown className="w-2.5 h-2.5" />}
                  </button>
                </th>
              ))}
              <th className="text-left px-2.5 py-1.5 text-yc-text-muted font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((n) => {
              const chaos = chaosModes[n.id];
              const isFailed = chaos === 'KILL' || n.errorRate > 50;
              const isWarn = !isFailed && (chaos || n.errorRate > 10 || n.latency > 150);
              return (
                <tr key={n.id} className="border-t border-yc-border/50 hover:bg-yc-bg-card/50">
                  <td className="px-2.5 py-1.5 text-yc-text font-semibold truncate max-w-[120px]">{n.label}</td>
                  <td className="px-2.5 py-1.5">{n.qps.toLocaleString()}</td>
                  <td className={`px-2.5 py-1.5 ${n.latency > 200 ? 'text-red-500' : n.latency > 100 ? 'text-amber-500' : ''}`}>
                    {n.latency}ms
                  </td>
                  <td className={`px-2.5 py-1.5 ${(n.cpu ?? 0) > 80 ? 'text-red-500' : ''}`}>{n.cpu ?? 0}%</td>
                  <td className={`px-2.5 py-1.5 ${n.errorRate > 0 ? 'text-red-500 font-bold' : ''}`}>{n.errorRate}%</td>
                  <td className="px-2.5 py-1.5">
                    {isFailed ? (
                      <span className="text-red-500 font-bold">FAILED</span>
                    ) : isWarn ? (
                      <span className="text-amber-500">{chaos || 'DEGRADED'}</span>
                    ) : (
                      <span className="text-emerald-500">OK</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
