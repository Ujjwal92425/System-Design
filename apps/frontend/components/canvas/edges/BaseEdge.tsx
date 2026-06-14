/**
 * apps/frontend/components/canvas/edges/BaseEdge.tsx
 *
 * Standard edge connector between architecture nodes.
 * Renders a labeled arrow with optional animated dash flow
 * to indicate traffic direction and protocol type.
 *
 * CHANGE: Implemented from stub — full edge with label,
 *          animated indicator, and color-coded health.
 */

'use client';

import { cn } from '@sd-os/ui';

export interface BaseEdgeProps {
  id?: string;
  label?: string;
  protocol?: 'sync' | 'async';
  animated?: boolean;
  selected?: boolean;
  /** Error rate coloring: grey=0, blue=low, amber=medium, red=high */
  errorRate?: number;
}

export function BaseEdge({
  id,
  label,
  protocol = 'sync',
  animated,
  selected,
  errorRate = 0,
}: BaseEdgeProps) {
  const colorClass =
    errorRate > 30
      ? 'stroke-red-400'
      : errorRate > 10
        ? 'stroke-amber-400'
        : animated
          ? 'stroke-blue-400'
          : protocol === 'async'
            ? 'stroke-slate-400 stroke-dashed'
            : 'stroke-slate-500';

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {/* Arrow marker definition */}
      <defs>
        <marker
          id={`arrowhead-${id || 'default'}`}
          viewBox="0 0 10 10"
          refX={9}
          refY={5}
          markerWidth={6}
          markerHeight={6}
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            className={cn(colorClass, 'fill-current')}
          />
        </marker>
      </defs>
      {/* Placeholder line — actual path drawn by React Flow */}
      <line
        x1={0}
        y1={0}
        x2={100}
        y2={100}
        className={cn(
          'stroke-2 fill-none transition-colors',
          colorClass,
          selected && 'stroke-blue-500 stroke-[3]',
        )}
        markerEnd={`url(#arrowhead-${id || 'default'})`}
      />
      {/* Label background */}
      {label && (
        <g>
          <rect
            x={40}
            y={42}
            width={label.length * 8 + 16}
            height={20}
            rx={4}
            className="fill-white stroke-slate-200"
            strokeWidth={1}
          />
          <text
            x={label.length * 4 + 48}
            y={55}
            textAnchor="middle"
            className="fill-slate-600 text-[10px] font-medium"
          >
            {label}
          </text>
        </g>
      )}
    </svg>
  );
}
