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

  // SVG dimensions
  const width = 540;
  const height = 160;
  const padding = { top: 15, right: 15, bottom: 25, left: 45 };

  // Calculate points
  const dataPoints = history.map((snapshot) => {
    if (activeMetric === 'qps') {
      return snapshot.inputQps || 0;
    } else {
      // average of node latencies
      const sum = snapshot.nodes.reduce((s, n) => s + n.latency, 0);
      return snapshot.nodes.length ? Math.round(sum / snapshot.nodes.length) : 0;
    }
  });

  const maxVal = Math.max(...dataPoints, activeMetric === 'qps' ? 1000 : 50);
  const minVal = 0;
  const valRange = maxVal - minVal || 1;

  // Generate SVG path string
  let pathD = '';
  if (dataPoints.length > 1) {
    const segments = dataPoints.map((val, idx) => {
      const x = padding.left + (idx / (dataPoints.length - 1)) * (width - padding.left - padding.right);
      const y = height - padding.bottom - ((val - minVal) / valRange) * (height - padding.top - padding.bottom);
      return `${x},${y}`;
    });
    pathD = `M ${segments.join(' L ')}`;
  }

  // Draw gridlines
  const yTicks = 4;
  const gridLinesY = Array.from({ length: yTicks }).map((_, idx) => {
    const val = minVal + (idx / (yTicks - 1)) * valRange;
    const y = height - padding.bottom - (idx / (yTicks - 1)) * (height - padding.top - padding.bottom);
    return { val, y };
  });

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      height: '100%'
    }}>
      
      {/* Chart Headers & Metric Toggles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 className="bricolage" style={{ fontSize: '15px', color: 'var(--text-primary)', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            {activeMetric === 'qps' ? <TrendingUp style={{ width: '14px', height: '14px', color: 'var(--accent-blue)' }} /> : <Clock style={{ width: '14px', height: '14px', color: 'var(--accent-amber)' }} />}
            <span>System Telemetry Chart</span>
          </h4>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-muted)' }}>
            Real-time rolling charts for request throughput and performance.
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '6px', padding: '2px' }}>
          <button
            onClick={() => setActiveMetric('qps')}
            className="mono"
            style={{
              padding: '4px 10px',
              background: activeMetric === 'qps' ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              color: activeMetric === 'qps' ? 'var(--accent-blue)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            QPS
          </button>
          <button
            onClick={() => setActiveMetric('latency')}
            className="mono"
            style={{
              padding: '4px 10px',
              background: activeMetric === 'latency' ? 'var(--bg-surface)' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 700,
              color: activeMetric === 'latency' ? 'var(--accent-amber)' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
          >
            LATENCY
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ flex: 1, position: 'relative', minHeight: '120px' }}>
        {history.length < 2 ? (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            fontSize: '11px'
          }} className="mono">
            Awaiting simulation tick metrics...
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', display: 'block' }}>
            
            {/* Grid Lines & Y Axis Labels */}
            {gridLinesY.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={width - padding.right}
                  y2={tick.y}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={tick.y + 4}
                  fill="var(--text-muted)"
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

            {/* Line Path */}
            {pathD && (
              <>
                {/* Glow under the line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={activeMetric === 'qps' ? 'rgba(77,127,255,0.15)' : 'rgba(232,160,69,0.15)'}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Main line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={activeMetric === 'qps' ? 'var(--accent-blue)' : 'var(--accent-amber)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Time / Ticks X Axis labels */}
            <text
              x={padding.left}
              y={height - 6}
              fill="var(--text-muted)"
              fontSize="9"
              fontFamily="monospace"
              textAnchor="start"
            >
              -{history.length}s
            </text>
            <text
              x={width - padding.right}
              y={height - 6}
              fill="var(--text-muted)"
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
