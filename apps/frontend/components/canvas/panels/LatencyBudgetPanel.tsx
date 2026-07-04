'use client';

import { useState, useMemo, memo } from 'react';
import { CanvasNode, CanvasEdge } from '@/features/canvas/useCanvasStore';
import { cn } from '@sd-os/ui';
import { Timer, ArrowRight, AlertTriangle } from 'lucide-react';

interface LatencyBudgetPanelProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

interface PathResult {
  path: string[];
  totalLatency: number;
}

const PROTOCOL_LATENCY_MS: Record<string, number> = {
  'HTTP': 5,
  'HTTPS': 5,
  'gRPC': 2,
  'TCP': 1,
  'UDP': 0.5,
  'Kafka': 3,
  'Redis': 0.5,
  'WebSocket': 3,
};

function getHopLatency(label: string): number {
  return PROTOCOL_LATENCY_MS[label] ?? 5;
}

function findAllPaths(edges: CanvasEdge[], source: string, target: string): PathResult[] {
  const adjacency = new Map<string, { target: string; label: string }[]>();
  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push({ target: edge.target, label: edge.label || 'HTTP' });
  }

  const results: PathResult[] = [];
  const visited = new Set<string>();

  function dfs(current: string, path: string[], accumLatency: number) {
    if (current === target) {
      results.push({ path: [...path], totalLatency: accumLatency });
      return;
    }
    if (visited.has(current)) return;
    visited.add(current);
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      path.push(neighbor.target);
      dfs(neighbor.target, path, accumLatency + getHopLatency(neighbor.label));
      path.pop();
    }
    visited.delete(current);
  }

  visited.add(source);
  const neighbors = adjacency.get(source) || [];
  for (const neighbor of neighbors) {
    dfs(neighbor.target, [source, neighbor.target], getHopLatency(neighbor.label));
  }

  return results;
}

function LatencyBudgetPanel({ nodes, edges }: LatencyBudgetPanelProps) {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');

  const paths = useMemo(() => {
    if (!sourceId || !targetId || sourceId === targetId) return [];
    return findAllPaths(edges, sourceId, targetId);
  }, [nodes, edges, sourceId, targetId]);

  const criticalPath = useMemo(() => {
    if (paths.length === 0) return null;
    return paths.reduce((max, p) => (p.totalLatency > max.totalLatency ? p : max), paths[0]);
  }, [paths]);

  const nodeLookup = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-yc-border">
        <div className="flex items-center gap-2 mb-3">
          <Timer className="w-4 h-4 text-yc-accent" />
          <h3 className="text-xs font-bold text-yc-text uppercase tracking-wider">Latency Budget</h3>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-[9px] font-semibold text-yc-text-muted uppercase tracking-wider block mb-1">Source</label>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full text-[10px] font-mono border border-yc-border rounded-md px-2 py-1.5 bg-white text-yc-text focus:outline-none focus:border-yc-accent"
            >
              <option value="">Select source...</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{String(n.data?.label || n.id)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[9px] font-semibold text-yc-text-muted uppercase tracking-wider block mb-1">Destination</label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full text-[10px] font-mono border border-yc-border rounded-md px-2 py-1.5 bg-white text-yc-text focus:outline-none focus:border-yc-accent"
            >
              <option value="">Select destination...</option>
              {nodes.map((n) => (
                <option key={n.id} value={n.id}>{String(n.data?.label || n.id)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!sourceId || !targetId ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <ArrowRight className="w-8 h-8 text-yc-text-muted/30 mb-2" />
            <p className="text-[10px] text-yc-text-muted">Select source and destination nodes to calculate latency budget.</p>
          </div>
        ) : paths.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-[10px] text-yc-text-muted">No path found between selected nodes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {criticalPath && (
              <div className="bg-yc-accent/5 border border-yc-accent/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-bold text-yc-accent uppercase tracking-wider">Critical Path</span>
                  <span className="text-xs font-bold text-yc-accent">{criticalPath.totalLatency}ms</span>
                </div>
                <p className="text-[9px] text-yc-text-muted font-mono truncate">
                  {criticalPath.path.map((id) => nodeLookup.get(id)?.data?.label || id).join(' → ')}
                </p>
              </div>
            )}

            <p className="text-[9px] font-semibold text-yc-text-muted uppercase tracking-wider">
              All Paths ({paths.length})
            </p>

            <div className="space-y-1.5">
              {paths.map((p, i) => (
                <div
                  key={i}
                  className={cn(
                    'border border-yc-border rounded-lg p-2.5 transition-colors',
                    p === criticalPath ? 'bg-yc-accent/5 border-yc-accent/30' : 'bg-white hover:bg-yc-bg'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn('text-[9px] font-bold', p === criticalPath ? 'text-yc-accent' : 'text-yc-text')}>
                      Path {i + 1}
                    </span>
                    <span className={cn('text-[10px] font-mono font-bold', p === criticalPath ? 'text-yc-accent' : 'text-yc-text')}>
                      {p.totalLatency}ms
                    </span>
                  </div>
                  <p className="text-[8px] text-yc-text-muted font-mono truncate">
                    {p.path.map((id) => nodeLookup.get(id)?.data?.label || id).join(' → ')}
                  </p>
                  {p === criticalPath && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-[8px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                        BUDGET EXCEEDED
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(LatencyBudgetPanel);
