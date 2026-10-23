/**
 * MetricsOverlay — floating QPS/latency badge rendered over a canvas node.
 * Mounts as an absolutely-positioned div so it can overlay the SVG canvas.
 */
'use client';

import { Activity, Clock, AlertTriangle } from 'lucide-react';

interface NodeMetrics {
  qps: number;
  latency: number;
  errorRate: number;
  cpu?: number;
}

interface MetricsOverlayProps {
  /** Position of the node's top-left corner on the canvas */
  x: number;
  y: number;
  /** Node dimensions so we can place the badge correctly */
  width?: number;
  height?: number;
  metrics: NodeMetrics | null;
  isSimulating: boolean;
}

export function MetricsOverlay({
  x,
  y,
  width = 180,
  height = 80,
  metrics,
  isSimulating,
}: MetricsOverlayProps) {
  if (!isSimulating || !metrics) return null;

  const { qps, latency, errorRate } = metrics;

  const isError = errorRate > 50;
  const isDegraded = !isError && (errorRate > 10 || latency > 150);
  const accent = isError ? '#F87171' : isDegraded ? '#E8A045' : '#36C98E';

  return (
    <div
      style={{
        position: 'absolute',
        // Anchor badge to top-right corner of the node with a small offset
        left: x + width - 4,
        top: y - 28,
        zIndex: 30,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        minWidth: '90px',
      }}
    >
      {/* QPS pill */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 7px',
        background: 'var(--bg-elevated)',
        border: `1px solid ${accent}44`,
        borderRadius: '5px',
        boxShadow: `0 0 8px ${accent}22`,
        color: accent,
        backdropFilter: 'blur(4px)',
      }}>
        <Activity style={{ width: '9px', height: '9px', flexShrink: 0 }} />
        <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.02em' }}>
          {qps >= 1000 ? `${(qps / 1000).toFixed(1)}k` : qps}
          <span style={{ fontWeight: 400, opacity: 0.7 }}>/s</span>
        </span>
      </div>

      {/* Latency pill */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 7px',
        background: 'var(--bg-elevated)',
        border: `1px solid var(--border)`,
        borderRadius: '5px',
        color: 'var(--text-secondary)',
        backdropFilter: 'blur(4px)',
      }}>
        <Clock style={{ width: '9px', height: '9px', flexShrink: 0 }} />
        <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
          {latency}
          <span style={{ fontWeight: 400, opacity: 0.7 }}>ms</span>
        </span>
      </div>

      {/* Error rate pill — only show when there are errors */}
      {errorRate > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '3px 7px',
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.3)',
          borderRadius: '5px',
          color: '#F87171',
          backdropFilter: 'blur(4px)',
        }}>
          <AlertTriangle style={{ width: '9px', height: '9px', flexShrink: 0 }} />
          <span style={{ fontSize: '9px', fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
            {Math.round(errorRate)}
            <span style={{ fontWeight: 400, opacity: 0.7 }}>% err</span>
          </span>
        </div>
      )}
    </div>
  );
}
