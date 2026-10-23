'use client';

export const BRAND   = '#FF6600';
export const BRAND_L = 'rgba(255,102,0,0.08)';
export const BRAND_B = 'rgba(255,102,0,0.20)';

export const PROGRESS_COLORS = {
  gradient: 'linear-gradient(90deg, #FF6600 0%, #FF8C38 100%)',
};

export function DiffBadge({ d }: { d: string }) {
  const DIFF: Record<string, { label: string; color: string; bg: string; border: string }> = {
    BEGINNER:     { label: 'Beginner',     color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)'  },
    INTERMEDIATE: { label: 'Intermediate', color: BRAND,     bg: BRAND_L,                  border: BRAND_B                 },
    ADVANCED:     { label: 'Advanced',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'  },
  };
  const s = DIFF[d] ?? DIFF.BEGINNER;
  return (
    <span style={{
      fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: '4px', flexShrink: 0,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  );
}
