'use client';

import { memo, useCallback, useState } from 'react';
import { EdgeProps, getSmoothStepPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';

const EDGE_LABELS = ['HTTP', 'HTTPS', 'gRPC', 'TCP', 'UDP', 'Kafka', 'Redis', 'WebSocket'];

function FlowEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  const label = String(data?.label || 'HTTP');
  const isSimulating = Boolean(data?.isSimulating);
  const errorRate = Number(data?.errorRate || 0);
  const qps = Number(data?.qps || 0);
  const [hovered, setHovered] = useState(false);

  const strokeColor = !isSimulating
    ? '#FF6600'
    : errorRate > 50
    ? '#ef4444'
    : errorRate > 10
    ? '#f59e0b'
    : '#FF6600';

  const strokeWidth = selected ? 3.5 : 3;

  const packetCount = qps > 2000 ? 3 : qps > 500 ? 2 : qps > 0 ? 1 : 0;
  const speed = qps > 2000 ? '1s' : qps > 500 ? '1.5s' : '2s';

  const handleLabelChange = useCallback((newLabel: string) => {
    const onChange = (data?.onLabelChange) as ((edgeId: string, label: string) => void) | undefined;
    if (onChange) {
      onChange(id, newLabel);
    }
  }, [id, data]);

  return (
    <>
      {selected && (
        <path
          d={edgePath}
          fill="none"
          stroke="#FF6600"
          strokeWidth={8}
          strokeOpacity={0.25}
          strokeLinecap="round"
        />
      )}

      {hovered && (
        <path
          d={edgePath}
          fill="none"
          stroke="#FF6600"
          strokeWidth={10}
          strokeOpacity={0.15}
          strokeLinecap="round"
        />
      )}

      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeLinecap: 'round',
          transition: 'stroke 300ms ease, stroke-width 200ms ease',
        }}
        className={cn(
          'hover:!stroke-[4px] transition-all',
          isSimulating && 'animate-flow-dash'
        )}
        markerEnd={markerEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {isSimulating && packetCount > 0 && (
        <>
          {Array.from({ length: packetCount }).map((_, idx) => {
            const delay = (idx * (1.5 / packetCount)).toFixed(2) + 's';
            return (
              <g key={`${id}-packet-${idx}`}>
                <circle r="7" fill={strokeColor} opacity="0.15" className="pointer-events-none">
                  <animateMotion dur={speed} repeatCount="indefinite" path={edgePath} begin={delay} />
                </circle>
                <circle r="4" fill={strokeColor} opacity="0.85" className="pointer-events-none">
                  <animateMotion dur={speed} repeatCount="indefinite" path={edgePath} begin={delay} />
                </circle>
              </g>
            );
          })}
        </>
      )}

      {hovered && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 12}px)`,
            }}
          >
            <div className="bg-yc-bg-card text-yc-text text-[9px] font-mono px-2 py-1 rounded-md shadow-lg border border-yc-border whitespace-nowrap">
              {label} {isSimulating && errorRate > 0 ? `· ${errorRate}% err` : ''}
              {isSimulating && qps > 0 ? ` · ${qps.toLocaleString()} qps` : ''}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      <EdgeLabelRenderer>
        <div
          className="absolute nodrag nopan pointer-events-auto"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <select
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="text-[10px] font-mono font-semibold bg-white border border-yc-border rounded-md px-1.5 py-0.5 text-yc-text cursor-pointer hover:border-yc-accent focus:outline-none focus:border-yc-accent"
            onClick={(e) => e.stopPropagation()}
          >
            {EDGE_LABELS.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(FlowEdge);

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}
