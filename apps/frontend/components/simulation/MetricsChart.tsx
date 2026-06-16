'use client';

import { useState, useMemo } from 'react';
import { TrendingUp, Clock } from 'lucide-react';

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

  const dataPoints = useMemo(() => {
    return history.map((snapshot) => {
      if (selectedNodeId) {
        const node = snapshot.nodes.find((n) => n.id === selectedNodeId);
        if (!node) return 0;
        if (activeMetric === 'qps') return node.qps || 0;
        if (activeMetric === 'latency') return node.latency || 0;
        if (activeMetric === 'errorRate') return node.errorRate || 0;
        if (activeMetric === 'queueDepth') return (node as any).queueDepth || 0;
        return 0;
      }
      if (activeMetric === 'qps') return snapshot.inputQps || 0;
      if (activeMetric === 'errorRate') {
        const avg = snapshot.nodes.reduce((s, n) => s + (n.errorRate || 0), 0);
        return snapshot.nodes.length ? avg / snapshot.nodes.length : 0;
      }
      if (activeMetric === 'queueDepth') {
        const total = snapshot.nodes.reduce((s, n) => s + ((n as any).queueDepth || 0), 0);
        return snapshot.nodes.length ? total / snapshot.nodes.length : 0;
      }
      const sum = snapshot.nodes.reduce((s, n) => s + n.latency, 0);
      return snapshot.nodes.length ? sum / snapshot.nodes.length : 0;
    });
  }, [history, selectedNodeId, activeMetric]);

  const maxVal = useMemo(() => computeNiceMax(dataPoints), [dataPoints]);
  const minVal = 0;
  const valRange = maxVal - minVal || 1;

  const width = 540;
  const height = 160;
  const padding = { top: 15, right: 15, bottom: 25, left: 52 };

  let pathD = '';
  if (dataPoints.length > 1) {
    const segments = dataPoints.map((val, idx) => {
      const x = padding.left + (idx / (dataPoints.length - 1)) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((val - minVal) / valRange) * (height - padding.top - padding.bottom);
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
    <div className="bg-yc-bg-alt border border-yc-border rounded-xl p-5 flex flex-col gap-3.5 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-sm text-yc-text m-0 font-bold flex items-center gap-1.5">
            {activeMetric === 'qps' ? (
              <TrendingUp className="w-3.5 h-3.5 text-yc-accent" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-yc-accent" />
            )}
            <span>System Telemetry Chart</span>
          </h4>
          <p className="mt-0.5 text-[11px] text-yc-text-muted">
            Real-time rolling charts for request throughput and performance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedNodeId}
            onChange={(e) => setSelectedNodeId(e.target.value)}
            className="text-[9px] font-mono bg-yc-bg-card border border-yc-border rounded px-1.5 py-1 text-yc-text-muted focus:outline-none"
          >
            <option value="">All Nodes (Aggregate)</option>
            {nodeOptions.map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
          <div className="flex bg-yc-bg-card border border-yc-border rounded-md p-0.5">
            {(['qps', 'latency', 'errorRate', 'queueDepth'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setActiveMetric(m)}
                className={`font-mono px-2 py-1 border-none rounded text-[9px] font-bold cursor-pointer transition-colors ${
                  activeMetric === m
                    ? 'bg-yc-bg-alt text-yc-accent'
                    : 'bg-transparent text-yc-text-muted'
                }`}
              >
                {m === 'errorRate' ? 'ERR%' : m === 'queueDepth' ? 'QUEUE' : m.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-[120px]">
        {history.length < 2 ? (
          <div className="absolute inset-0 flex items-center justify-center text-yc-text-muted font-mono text-[11px]">
            Awaiting simulation tick metrics...
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
                  stroke="#E5E2D9"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={tick.y + 4}
                  fill="#666666"
                  fontSize="9"
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
                  strokeWidth="6"
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
                    cx={padding.left + (dataPoints.length - 1) / (dataPoints.length - 1) * (width - padding.left - padding.right)}
                    cy={height - padding.bottom - ((dataPoints[dataPoints.length - 1] - minVal) / valRange) * (height - padding.top - padding.bottom)}
                    r="3"
                    fill="#FF6600"
                  />
                )}
              </>
            )}

            <text
              x={padding.left}
              y={height - 6}
              fill="#666666"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="start"
            >
              -{history.length}s
            </text>
            <text
              x={width - padding.right}
              y={height - 6}
              fill="#666666"
              fontSize="9"
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
