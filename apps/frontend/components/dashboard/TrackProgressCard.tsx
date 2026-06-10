'use client';

import Link from 'next/link';

interface TrackProgressCardProps {
  name: string;
  level: number;
  completedPct: number;
  slug: string;
  estimatedHours?: number;
}

export function TrackProgressCard({ name, level, completedPct, slug, estimatedHours }: TrackProgressCardProps) {
  const pct = Math.round(completedPct * 100);

  const LEVEL_COLORS: Record<number, { dot: string; ring: string; bar: string }> = {
    1: { dot: '#4D7FFF', ring: 'rgba(77,127,255,0.15)', bar: '#4D7FFF' },
    2: { dot: '#E8A045', ring: 'rgba(232,160,69,0.15)', bar: '#E8A045' },
    3: { dot: '#36C98E', ring: 'rgba(54,201,142,0.15)', bar: '#36C98E' },
    4: { dot: '#C084FC', ring: 'rgba(192,132,252,0.15)', bar: '#C084FC' },
    5: { dot: '#F87171', ring: 'rgba(248,113,113,0.15)', bar: '#F87171' },
  };
  const colors = LEVEL_COLORS[level] ?? LEVEL_COLORS[1];

  return (
    <Link
      href={`/learn/${slug}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        padding: '20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        textDecoration: 'none',
        transition: 'border-color 200ms ease, transform 200ms ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-bright)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: colors.dot,
              boxShadow: `0 0 8px ${colors.ring}`,
            }} />
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Level {level}
            </span>
          </div>
          <h3 className="bricolage" style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
            {name}
          </h3>
        </div>
        <span className="mono" style={{ fontSize: '22px', fontWeight: 800, color: pct === 100 ? colors.dot : 'var(--text-primary)' }}>
          {pct}<span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400 }}>%</span>
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: '4px', background: 'var(--border)', borderRadius: '9999px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: colors.bar,
          borderRadius: '9999px',
          transition: 'width 600ms ease',
        }} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {pct === 0 ? 'Not started' : pct === 100 ? '✓ Complete' : 'In progress'}
        </span>
        {estimatedHours && (
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            ~{estimatedHours}h
          </span>
        )}
      </div>
    </Link>
  );
}
