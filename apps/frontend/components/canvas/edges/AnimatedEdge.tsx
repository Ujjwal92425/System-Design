/**
 * AnimatedEdge — SVG connection rendered between two canvas nodes.
 * During an active simulation the stroke animates with stroke-dashoffset
 * to give directional packet-flow feedback.
 */
'use client';

interface AnimatedEdgeProps {
  id: string;
  source: { x: number; y: number };
  target: { x: number; y: number };
  label?: string;
  /** Whether the simulation is currently running */
  isSimulating?: boolean;
  /** 0–100 error rate on this edge's source node */
  errorRate?: number;
  isSelected?: boolean;
  onDelete?: (id: string) => void;
}

export function AnimatedEdge({
  id,
  source,
  target,
  label,
  isSimulating = false,
  errorRate = 0,
  isSelected = false,
  onDelete,
}: AnimatedEdgeProps) {
  // Cubic bezier: pull control points perpendicular to the source/target midpoint
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const mx = (source.x + target.x) / 2;
  const my = (source.y + target.y) / 2;

  // Slight bow upward for readability when many edges overlap
  const controlX = mx;
  const controlY = my - Math.abs(dx) * 0.2;

  const pathD = `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${target.x} ${target.y}`;

  // Colour encodes health: grey (idle) → blue (healthy) → amber (degraded) → red (failing)
  const strokeColor =
    !isSimulating ? 'rgba(90,105,140,0.5)'
    : errorRate > 50 ? '#F87171'
    : errorRate > 10 ? '#E8A045'
    : '#4D7FFF';

  // Unique dash-animation ID per edge so they don't share keyframe timing
  const animId = `flow-${id.replace(/[^a-z0-9]/gi, '-')}`;

  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* Animation keyframe injected inline — no external stylesheet needed */}
      {isSimulating && (
        <style>{`
          @keyframes ${animId} {
            from { stroke-dashoffset: 24; }
            to   { stroke-dashoffset: 0; }
          }
        `}</style>
      )}

      {/* Wide invisible hit-area for delete clicks */}
      {onDelete && (
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth={14}
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onClick={(e) => { e.stopPropagation(); onDelete(id); }}
        />
      )}

      {/* Shadow / glow layer during simulation */}
      {isSimulating && (
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth={6}
          strokeOpacity={0.15}
          strokeLinecap="round"
        />
      )}

      {/* Main visible stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={isSelected ? 'var(--accent-amber)' : strokeColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        strokeLinecap="round"
        strokeDasharray={isSimulating ? '8 4' : 'none'}
        style={
          isSimulating
            ? { animation: `${animId} 0.6s linear infinite` }
            : undefined
        }
      />

      {/* Arrowhead marker at target */}
      <polygon
        points={`${target.x},${target.y} ${target.x - 8},${target.y - 4} ${target.x - 8},${target.y + 4}`}
        fill={isSelected ? 'var(--accent-amber)' : strokeColor}
        transform={`rotate(${Math.atan2(dy, dx) * (180 / Math.PI)}, ${target.x}, ${target.y})`}
        style={{ pointerEvents: 'none' }}
      />

      {/* Optional edge protocol label */}
      {label && (
        <text
          x={controlX}
          y={controlY - 8}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--font-mono, monospace)"
          fill="var(--text-muted)"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
