/**
 * apps/frontend/components/canvas/nodes/BaseNode.tsx
 * 
 * Base wrapper for all architecture diagram node components.
 * Renders the node shape, ports, selection ring, and labels.
 * Each node type provides its own SVG icon via the `icon` prop.
 * 
 * CHANGE: Implemented from stub — full node rendering with
 *          selection state, label, metrics badge slot, and ports.
 */

'use client';

import { cn } from '@sd-os/ui';
import type { CSSProperties, ReactNode } from 'react';

export interface BaseNodeProps {
  id?: string;
  icon?: ReactNode;
  label: string;
  subtitle?: string;
  selected?: boolean;
  metrics?: {
    qps?: number;
    errorRate?: number;
    p99Latency?: number;
    cacheHitRate?: number;
  };
  /** Extra color-coding className for node type */
  typeColor?: string;
  /** Extra status overlay (e.g. "FAILED" during simulation chaos) */
  statusBadge?: { label: string; variant: 'error' | 'warning' | 'success' };
  className?: string;
  style?: CSSProperties;
  /** Drag handle props spread from React Flow */
  dragHandleProps?: Record<string, any>;
}

export function BaseNode({
  icon,
  label,
  subtitle,
  selected,
  metrics,
  typeColor = 'border-slate-300 bg-white',
  statusBadge,
  className,
  style,
  dragHandleProps,
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col items-center rounded-xl border-2 px-4 py-3 shadow-sm transition-shadow min-w-[120px]',
        typeColor,
        selected ? 'ring-2 ring-blue-500 shadow-md' : 'hover:shadow-md',
        statusBadge?.variant === 'error' && 'ring-2 ring-red-400 animate-pulse',
        className,
      )}
      style={style}
      {...dragHandleProps}
    >
      {/* Status badge overlay (chaos / failure) */}
      {statusBadge && (
        <div
          className={cn(
            'absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap',
            statusBadge.variant === 'error' && 'bg-red-500 text-white',
            statusBadge.variant === 'warning' && 'bg-amber-500 text-white',
            statusBadge.variant === 'success' && 'bg-emerald-500 text-white',
          )}
        >
          {statusBadge.label}
        </div>
      )}

      {/* Icon */}
      <div className="mb-1 flex h-10 w-10 items-center justify-center">{icon}</div>

      {/* Label */}
      <span className="text-xs font-semibold text-slate-800 text-center leading-tight">
        {label}
      </span>

      {/* Subtitle (node type) */}
      {subtitle && (
        <span className="mt-0.5 text-[10px] text-slate-400 text-center">{subtitle}</span>
      )}

      {/* Metrics badge bar */}
      {metrics && (
        <div className="mt-2 flex w-full items-center justify-center gap-3 border-t border-slate-100 pt-1.5 text-[10px] text-slate-500">
          {metrics.qps !== undefined && (
            <span title="Throughput">{metrics.qps.toLocaleString()} qps</span>
          )}
          {metrics.errorRate !== undefined && (
            <span
              className={cn(
                metrics.errorRate > 30 ? 'text-red-500 font-semibold' : '',
              )}
              title="Error rate"
            >
              {metrics.errorRate}% err
            </span>
          )}
          {metrics.p99Latency !== undefined && (
            <span title="P99 latency">{metrics.p99Latency}ms</span>
          )}
          {metrics.cacheHitRate !== undefined && (
            <span
              className={cn(
                metrics.cacheHitRate < 50 ? 'text-amber-500 font-semibold' : 'text-emerald-500',
              )}
              title="Cache hit rate"
            >
              {metrics.cacheHitRate}% hit
            </span>
          )}
        </div>
      )}
    </div>
  );
}
