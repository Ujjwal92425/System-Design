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
  const [hovered, setHovered] = useState(false);

  const strokeColor = !isSimulating
    ? '#FF6600'
    : errorRate > 50
    ? '#ef4444'
    : errorRate > 10
    ? '#f59e0b'
    : '#FF6600';

  const strokeWidth = selected ? 3.5 : 3;

  const handleLabelChange = useCallback((newLabel: string) => {
    const onChange = (data?.onLabelChange) as ((edgeId: string, label: string) => void) | undefined;
    if (onChange) {
      onChange(id, newLabel);
    }
  }, [id, data]);

  return (
    <>
      {/* Selection glow */}
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

      {/* Hover glow */}
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
          isSimulating && 'animate-pulse-edge animate-flow-dash'
        )}
        markerEnd={markerEnd}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Hover tooltip */}
      {hovered && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute"
            style={{
              transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 12}px)`,
            }}
          >
            <div className="bg-gray-900 text-white text-[9px] font-mono px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
              {label} {isSimulating && errorRate > 0 ? `· ${errorRate}% err` : ''}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}

      {/* Label */}
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
            className="text-[10px] font-mono font-semibold bg-white border border-gray-200 rounded-md px-1.5 py-0.5 text-gray-600 cursor-pointer hover:border-orange-300 focus:outline-none focus:border-orange-500"
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
