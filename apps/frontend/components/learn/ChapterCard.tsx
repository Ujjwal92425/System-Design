'use client';

import Link from 'next/link';
import {
  BookOpen, Shield, Radio, Database, Server, GitBranch,
  Layers, BarChart2, Layout, Monitor, Zap,
} from 'lucide-react';
import { BRAND, BRAND_L, BRAND_B } from '../ui/curriculum-shared';

const TRACK_ICONS: Record<string, React.ComponentType<any>> = {
  'networking-os-security':           Shield,
  'apis-protocols-authentication':    Radio,
  'databases':                        Database,
  'caching-cdns':                     Zap,
  'distributed-infrastructure':       Server,
  'architecture-patterns':            GitBranch,
  'advanced-distributed-systems':     Layers,
  'system-design-interviews':         BarChart2,
  'frontend-performance':             Layout,
  'production-operations':            Monitor,
};

interface ChapterCardProps {
  slug: string;
  name: string;
  description: string;
  level: number;
  estimatedHours?: number;
  completedPct?: number;
}

export function ChapterCard({ slug, name, description, level, estimatedHours, completedPct }: ChapterCardProps) {
  const Icon = TRACK_ICONS[slug] ?? BookOpen;
  const pct = completedPct ? Math.round(completedPct * 100) : 0;

  return (
    <Link
      href={`/learn/${slug}`}
      style={{
        display: 'flex', flexDirection: 'column', gap: '14px',
        padding: '20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        textDecoration: 'none',
        transition: 'border-color 200ms ease, transform 200ms ease',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = BRAND_B;
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', gap: '14px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: BRAND_L, border: `1px solid ${BRAND_B}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon style={{ width: '20px', height: '20px', color: BRAND }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span className="mono" style={{
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: BRAND, background: BRAND_L, border: `1px solid ${BRAND_B}`,
            padding: '2px 8px', borderRadius: '20px',
          }}>
            Level {level}
          </span>
          <h3 className="bricolage" style={{
            margin: '6px 0 2px', fontSize: '15px', fontWeight: 700,
            color: 'var(--text-primary)', lineHeight: 1.3,
          }}>
            {name}
          </h3>
          <p style={{
            margin: 0, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5,
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {description}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {estimatedHours && (
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            ~{estimatedHours}h
          </span>
        )}
        {completedPct !== undefined && (
          <span className="mono" style={{ fontSize: '14px', fontWeight: 700, color: pct === 100 ? '#22c55e' : 'var(--text-primary)' }}>
            {pct}%
          </span>
        )}
      </div>

      {completedPct !== undefined && (
        <div style={{ height: '4px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: BRAND, borderRadius: '999px',
            transition: 'width 600ms ease',
          }} />
        </div>
      )}
    </Link>
  );
}
