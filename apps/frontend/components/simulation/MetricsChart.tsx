'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, Clock, Loader2 } from 'lucide-react';

interface MetricsSnapshot {
  tick: number;
  timestamp: number;
  inputQps?: number;
  systemHealth: string;
  nodes: {
    id: string;
    label: string;
    qps: number;
    latency: number;
    errorRate: number;
    queueDepth?: number;
    cpu?: number;
  }[];
}

interface MetricsChartProps {
  history: MetricsSnapshot[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1)}K`;
  return String(Math.round(n));
}

function formatMetric(val: number, metric: string): string {
  const abs = Math.abs(val);
  if (metric === 'qps') {
    if (abs >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M/s`;
    if (abs >= 1_000) return `${(val / 1_000).toFixed(1)}K/s`;
    return `${Math.round(val)}/s`;
  }
  if (metric === 'errorRate') return `${Math.round(val)}%`;
  if (metric === 'queueDepth') return formatNumber(val);
  return `${Math.round(val)}ms`;
}

function computeNiceMax(values: number[]): number {
  if (values.length === 0) return 1;
  const rawMax = Math.max(...values);
  if (rawMax <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  let nice: number;
  if (normalized <= 1) nice = 1;
  else if (normalized <= 2) nice = 2;
  else if (normalized <= 5) nice = 5;
  else nice = 10;
  return nice * magnitude;
}

export function MetricsChart({ history }: MetricsChartProps) {
  const [activeMetric, setActiveMetric] = useState<'qps' | 'latency' | 'errorRate' | 'queueDepth'>('qps');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  const nodeOptions = useMemo(
    () => (history.length > 0 ? history[history.length - 1].nodes : []),
    [history]
  );

  // FIX: Added time-aware data point mapping.
  // Previously, points were evenly spaced regardless of tick gaps.
  // Now we interpolate based on tick delta when ticks are missing.
  // Returns { values: number[], tickNumbers: number[] }.
  const chartData = useMemo(() => {
    if (history.length === 0) return { values: [], tickNumbers: [] };
    
    // De-duplicate ticks and sort ascending
    const uniqueHistory = history
      .filter((snapshot, idx, self) => self.findIndex((s) => s.tick === snapshot.tick) === idx)
      .sort((a, b) => (a.tick ?? 0) - (b.tick ?? 0));

    const values: number[] = [];
    const tickNumbers: number[] = [];
    for (let i = 0; i < uniqueHistory.length; i++) {
      const snapshot = uniqueHistory[i];
      let val: number;
      if (selectedNodeId) {
        const node = snapshot.nodes.find((n: any) => n.id === selectedNodeId);
        if (!node) { val = 0; } 
        else if (activeMetric === 'qps') val = node.qps || 0;
        else if (activeMetric === 'latency') val = node.latency || 0;
        else if (activeMetric === 'errorRate') val = node.errorRate || 0;
        else if (activeMetric === 'queueDepth') val = (node as any).queueDepth || 0;
        else val = 0;
      } else {
        if (activeMetric === 'qps') val = snapshot.inputQps || 0;
        else if (activeMetric === 'errorRate') {
          const sum = snapshot.nodes.reduce((s: number, n: any) => s + (n.errorRate || 0), 0);
          val = snapshot.nodes.length ? sum / snapshot.nodes.length : 0;
        } else if (activeMetric === 'queueDepth') {
          const total = snapshot.nodes.reduce((s: number, n: any) => s + ((n as any).queueDepth || 0), 0);
          val = snapshot.nodes.length ? total / snapshot.nodes.length : 0;
        } else {
          const sum = snapshot.nodes.reduce((s: number, n: any) => s + n.latency, 0);
          val = snapshot.nodes.length ? sum / snapshot.nodes.length : 0;
        }
      }
      values.push(val);
      tickNumbers.push(snapshot.tick ?? i);
    }
    return { values, tickNumbers };
  }, [history, selectedNodeId, activeMetric]);

  const dataPoints = chartData.values;

  const maxVal = useMemo(() => computeNiceMax(dataPoints), [dataPoints]);
  const minVal = 0;
  const valRange = maxVal - minVal || 1;

  const width = 540;
  const height = 100;
  const padding = { top: 10, right: 15, bottom: 20, left: 52 };

  let pathD = '';
  if (dataPoints.length === 1) {
    const val = dataPoints[0];
    const x = padding.left + (width - padding.left - padding.right) / 2;
    const y = height - padding.bottom - ((val - minVal) / valRange) * (height - padding.top - padding.bottom);
    pathD = `M ${padding.left},${y.toFixed(1)} L ${x.toFixed(1)},${y.toFixed(1)}`;
  } else if (dataPoints.length > 1) {
    const firstTick = chartData.tickNumbers[0];
    const lastTick = chartData.tickNumbers[chartData.tickNumbers.length - 1];
    const tickRange = Math.max(1, lastTick - firstTick);
    const segments = chartData.tickNumbers.map((tick, idx) => {
      const normalizedTick = (tick - firstTick) / tickRange;
      const x = padding.left + normalizedTick * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((dataPoints[idx] - minVal) / valRange) * (height - padding.top - padding.bottom);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    pathD = `M ${segments.join(' L ')}`;
  }

  const yTicks = 4;
  const gridLinesY = Array.from({ length: yTicks }).map((_, idx) => {
    const val = minVal + (idx / (yTicks - 1)) * valRange;
    const y = height - padding.bottom - (idx / (yTicks - 1)) * (height - padding.top - padding.bottom);
    return { val, y };
  });

  return (
    <div className="bg-white border border-yc-border rounded-xl p-4 flex flex-col gap-2.5 h-[170px] w-full">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xs text-yc-text m-0 font-bold flex items-center gap-1.5">
            {activeMetric === 'qps' ? (
              <TrendingUp className="w-3.5 h-3.5 text-yc-accent" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-yc-accent" />
            )}
            <span>System Telemetry Chart</span>
          </h4>
          <p className="mt-0.5 text-[10px] text-yc-text-muted">
            Real-time rolling charts for request throughput and performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="text-[9px] font-mono bg-white border border-yc-border rounded px-1.5 py-1 text-yc-text-muted focus:outline-none"
          >
            <option value="">All Nodes (Aggregate)</option>
            {nodeOptions.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
          <div className="flex bg-white border border-yc-border rounded-md p-0.5">
            {(['qps', 'latency', 'errorRate', 'queueDepth'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={`font-mono px-2 py-1 border-none rounded text-[9px] font-bold cursor-pointer transition-colors ${
                  activeMetric === m
                    ? 'bg-yc-accent/10 text-yc-accent'
                    : 'bg-transparent text-yc-text-muted'
                }`}
              >
                {m === 'errorRate' ? 'ERR%' : m === 'queueDepth' ? 'QUEUE' : m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        {history.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-yc-text-muted font-mono text-[10px] gap-1">
            <Loader2 className="w-4 h-4 text-yc-accent animate-spin" />
            <span>Awaiting simulation tick metrics...</span>
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full block">
            {gridLinesY.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={width - padding.right}
                  y2={tick.y}
                  stroke="#F3F1EB"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={tick.y + 3}
                  fill="#666666"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {formatMetric(tick.val, activeMetric)}
                </text>
              </g>
            ))}

            {pathD && (
              <>
                <path
                  d={pathD}
                  fill="none"
                  stroke="rgba(255,102,0,0.15)"
                  strokeWidth="5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={pathD}
                  fill="none"
                  stroke="#FF6600"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {dataPoints.length > 0 && (
                  <circle
                    cx={
                      dataPoints.length === 1
                        ? padding.left + (width - padding.left - padding.right) / 2
                        : padding.left + (width - padding.left - padding.right)
                    }
                    cy={height - padding.bottom - ((dataPoints[dataPoints.length - 1] - minVal) / valRange) * (height - padding.top - padding.bottom)}
                    r="3"
                    fill="#FF6600"
                  />
                )}
              </>
            )}

            <text
              x={padding.left}
              y={height - 4}
              fill="#666666"
              fontSize="8"
              fontFamily="monospace"
              textAnchor="start"
            >
              -{history.length}s
            </text>
            <text
              x={width - padding.right}
              y={height - 4}
              fill="#666666"
              fontSize="8"
              fontFamily="monospace"
              textAnchor="end"
            >
              Now
            </text>
          </svg>
        )}
      </div>
    </div>
  );
}
