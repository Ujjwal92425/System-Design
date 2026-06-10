'use client';

import Link from 'next/link';
import { useTracks } from '../../../features/learn/useLearn';
import { Loader2, BookOpen, Flame, LayoutDashboard, TrendingUp } from 'lucide-react';

// ── TrackProgressCard ─────────────────────────────────────────────────────────
interface TrackProgressCardProps {
  name: string;
  level: number;
  completedPct: number;
  slug: string;
  estimatedHours?: number;
}

function TrackProgressCard({ name, level, completedPct, slug, estimatedHours }: TrackProgressCardProps) {
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
        transition: 'border-color 200ms ease',
      }}
      onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
      onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
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

// ── NextLessonCard ────────────────────────────────────────────────────────────
interface NextLessonCardProps {
  trackName: string;
  trackSlug: string;
  lessonTitle?: string;
  lessonSlug?: string;
}

function NextLessonCard({ trackName, trackSlug, lessonTitle, lessonSlug }: NextLessonCardProps) {
  const href = lessonSlug ? `/learn/${trackSlug}/${lessonSlug}` : `/learn/${trackSlug}`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(77,127,255,0.06) 0%, rgba(232,160,69,0.04) 100%)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <BookOpen style={{ width: '14px', height: '14px', color: 'var(--accent-blue)' }} />
        <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Resume
        </span>
      </div>

      <div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>{trackName}</p>
        <h3 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
          {lessonTitle ?? 'Start the track →'}
        </h3>
      </div>

      <Link
        href={href}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          alignSelf: 'flex-start',
          padding: '9px 18px',
          background: 'var(--accent-amber)',
          color: '#080B14',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          textDecoration: 'none',
          transition: 'opacity 150ms ease',
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
        onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
      >
        Continue Learning →
      </Link>
    </div>
  );
}

// ── StatCard ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px',
        background: 'rgba(77,127,255,0.08)',
        border: '1px solid rgba(77,127,255,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon style={{ width: '18px', height: '18px', color: 'var(--accent-blue)' }} />
      </div>
      <div>
        <p className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
          {label}
        </p>
        <p className="bricolage" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { tracks, loading } = useTracks();

  // Derived stats
  const totalPct = tracks.length
    ? tracks.reduce((s, t) => s + t.completedPct, 0) / tracks.length
    : 0;

  // Find the first in-progress track to surface as "next" 
  const activeTrack =
    tracks.find(t => t.completedPct > 0 && t.completedPct < 1) ??
    tracks.find(t => t.completedPct === 0) ??
    tracks[0];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 style={{ width: '32px', height: '32px', color: 'var(--accent-amber)' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>

      {/* Page heading */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <LayoutDashboard style={{ width: '18px', height: '18px', color: 'var(--accent-amber)' }} />
          <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Dashboard
          </span>
        </div>
        <h1 className="bricolage" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Welcome back, Architect
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Here's where you stand across all five tracks.
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
        <StatCard
          label="Overall Progress"
          value={`${Math.round(totalPct * 100)}%`}
          icon={TrendingUp}
        />
        <StatCard
          label="Tracks Active"
          value={`${tracks.filter(t => t.completedPct > 0).length} / ${tracks.length}`}
          icon={BookOpen}
        />
        <StatCard
          label="Daily Streak"
          value="—"
          icon={Flame}
        />
      </div>

      {/* Two-column area: Next lesson + Track progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

        {/* Next lesson to resume */}
        {activeTrack && (
          <NextLessonCard
            trackName={activeTrack.name}
            trackSlug={activeTrack.slug}
          />
        )}

        {/* Quick links */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          <p className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Quick Jump
          </p>
          {[
            { label: '→ Browse all curriculum tracks', href: '/learn' },
            { label: '→ Open architecture canvas', href: '/build' },
            { label: '→ Start an interview session', href: '/interview' },
            { label: '→ Browse community blueprints', href: '/community' },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'transparent',
                transition: 'all 150ms ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-bright)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Track progress cards */}
      <div>
        <p className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
          All Tracks
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {tracks.map(track => (
            <TrackProgressCard
              key={track.id}
              name={track.name}
              level={track.level}
              completedPct={track.completedPct}
              slug={track.slug}
              estimatedHours={track.estimatedHours}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
