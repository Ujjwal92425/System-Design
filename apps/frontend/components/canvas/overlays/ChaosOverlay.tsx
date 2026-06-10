/**
 * ChaosOverlay — pulsing red halo rendered over a failed/chaos-injected node.
 * Stacks above MetricsOverlay via a higher z-index.
 */
'use client';

interface ChaosOverlayProps {
  x: number;
  y: number;
  width?: number;
  height?: number;
  /** Whether this specific node is currently marked as failed */
  isFailed: boolean;
  /** 0–100 error rate — drives degraded (amber) vs critical (red) state */
  errorRate?: number;
}

export function ChaosOverlay({
  x,
  y,
  width = 180,
  height = 80,
  isFailed,
  errorRate = 0,
}: ChaosOverlayProps) {
  const isCritical = isFailed || errorRate > 50;
  const isDegraded = !isCritical && errorRate > 10;

  if (!isCritical && !isDegraded) return null;

  const color = isCritical ? '#F87171' : '#E8A045';
  const animId = isCritical ? 'chaos-pulse-red' : 'chaos-pulse-amber';

  return (
    <>
      <style>{`
        @keyframes chaos-pulse-red {
          0%,100% { opacity: 0.8; transform: scale(1); }
          50%      { opacity: 0.2; transform: scale(1.06); }
        }
        @keyframes chaos-pulse-amber {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 0.15; transform: scale(1.04); }
        }
      `}</style>

      {/* Outer pulsing halo */}
      <div
        style={{
          position: 'absolute',
          left: x - 6,
          top: y - 6,
          width: width + 12,
          height: height + 12,
          borderRadius: '14px',
          border: `2px solid ${color}`,
          boxShadow: `0 0 16px ${color}55, inset 0 0 12px ${color}11`,
          animation: `${animId} 1.2s ease-in-out infinite`,
          pointerEvents: 'none',
          zIndex: 40,
        }}
      />

      {/* "FAILED" badge in top-left corner */}
      {isCritical && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y - 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.4)',
            borderRadius: '4px',
            color: '#F87171',
            pointerEvents: 'none',
            zIndex: 41,
          }}
        >
          <span style={{
            fontSize: '8px',
            fontWeight: 800,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.06em',
          }}>
            ✕ NODE FAILED
          </span>
        </div>
      )}

      {/* "DEGRADED" badge */}
      {isDegraded && (
        <div
          style={{
            position: 'absolute',
            left: x,
            top: y - 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 6px',
            background: 'rgba(232,160,69,0.1)',
            border: '1px solid rgba(232,160,69,0.35)',
            borderRadius: '4px',
            color: '#E8A045',
            pointerEvents: 'none',
            zIndex: 41,
          }}
        >
          <span style={{
            fontSize: '8px',
            fontWeight: 800,
            fontFamily: 'var(--font-mono, monospace)',
            letterSpacing: '0.06em',
          }}>
            ⚠ DEGRADED
          </span>
        </div>
      )}
    </>
  );
}
