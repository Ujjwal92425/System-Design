'use client';

import { useState } from 'react';
import { TrendingUp, Clock } from 'lucide-react';

interface MetricsSnapshot {
  tick: number;
  timestamp: number;
  inputQps: number;
  systemHealth: string;
  nodes: {
    id: string;
    label: string;
    qps: number;
    latency: number;
    errorRate: number;
  }[];
}

interface MetricsChartProps {
  history: MetricsSnapshot[];
}

export function MetricsChart({ history }: MetricsChartProps) {
  const [activeMetric, setActiveMetric] = useState<'qps' | 'latency'>('qps');

  const width = 540;
  const height = 160;
  const padding = { top: 15, right: 15, bottom: 25, left: 45 };

  const dataPoints = history.map((snapshot) => {
    if (activeMetric === 'qps') {
      return snapshot.inputQps || 0;
    } else {
      const sum = snapshot.nodes.reduce((s, n) => s + n.latency, 0);
      return snapshot.nodes.length ? Math.round(sum / snapshot.nodes.length) : 0;
    }
  });

  const maxVal = Math.max(...dataPoints, activeMetric === 'qps' ? 1000 : 50);
  const minVal = 0;
  const valRange = maxVal - minVal || 1;

  let pathD = '';
  if (dataPoints.length > 1) {
    const segments = dataPoints.map((val, idx) => {
      const x = padding.left + (idx / (dataPoints.length - 1)) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((val - minVal) / valRange) * (height - padding.top - padding.bottom);
      return `${x},${y}`;
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

        <div className="flex bg-yc-bg-card border border-yc-border rounded-md p-0.5">
          <button
            onClick={() => setActiveMetric('qps')}
            className={`font-mono px-2.5 py-1 border-none rounded text-[10px] font-bold cursor-pointer transition-colors ${
              activeMetric === 'qps'
                ? 'bg-yc-bg-alt text-yc-accent'
                : 'bg-transparent text-yc-text-muted'
            }`}
          >
            QPS
          </button>
          <button
            onClick={() => setActiveMetric('latency')}
            className={`font-mono px-2.5 py-1 border-none rounded text-[10px] font-bold cursor-pointer transition-colors ${
              activeMetric === 'latency'
                ? 'bg-yc-bg-alt text-yc-accent'
                : 'bg-transparent text-yc-text-muted'
            }`}
          >
            LATENCY
          </button>
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
                  {activeMetric === 'qps'
                    ? `${Math.round(tick.val)}/s`
                    : `${Math.round(tick.val)}ms`}
                </text>
              </g>
            ))}

            {pathD && (
              <>
                <path
                  d={pathD}
                  fill="none"
                  stroke={activeMetric === 'qps' ? 'rgba(255,102,0,0.15)' : 'rgba(255,102,0,0.15)'}
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
