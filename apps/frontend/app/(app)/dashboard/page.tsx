'use client';

import Link from 'next/link';
import { useTracks } from '../../../features/learn/useLearn';
import { useUsage } from '../../../features/usage/useUsage';
import { Loader2, BookOpen, Flame, LayoutDashboard, TrendingUp, Layers, Sparkles, AlertTriangle } from 'lucide-react';

import { TrackProgressCard } from '@/components/dashboard/TrackProgressCard';
import { NextLessonCard } from '@/components/dashboard/NextLessonCard';

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
        background: 'rgba(255,102,0,0.08)',
        border: '1px solid rgba(255,102,0,0.15)',
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
  const usage = useUsage();

  const validTracks = tracks.filter(t => t && t.slug);

  // Derived stats
  const totalPct = validTracks.length
    ? validTracks.reduce((s, t) => s + (t.completedPct || 0), 0) / validTracks.length
    : 0;

  // Find the first in-progress track to surface as "next" 
  const activeTrack = validTracks.length
    ? (validTracks.find(t => (t.completedPct || 0) > 0 && (t.completedPct || 0) < 1) ??
       validTracks.find(t => (t.completedPct || 0) === 0) ??
       validTracks[0])
    : null;

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
          value={`${validTracks.filter(t => t.completedPct > 0).length} / ${validTracks.length}`}
          icon={BookOpen}
        />
        <StatCard
          label="Daily Streak"
          value="—"
          icon={Flame}
        />
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <p className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Free Tier Usage
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Layers style={{ width: '12px', height: '12px' }} /> Canvases
              </span>
              <span className="mono" style={{
                fontSize: '11px', fontWeight: 700,
                color: usage.canvasExceeded ? '#EF4444' : 'var(--text-primary)',
              }}>
                {usage.canvasCount} / {usage.canvasLimit}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (usage.canvasCount / usage.canvasLimit) * 100)}%`, height: '100%', background: usage.canvasExceeded ? '#EF4444' : '#FF6600', borderRadius: '99px', transition: 'width 300ms' }} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles style={{ width: '12px', height: '12px' }} /> Interviews
              </span>
              <span className="mono" style={{
                fontSize: '11px', fontWeight: 700,
                color: usage.interviewExceeded ? '#EF4444' : 'var(--text-primary)',
              }}>
                {usage.interviewCount} / {usage.interviewLimit}
              </span>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.min(100, (usage.interviewCount / usage.interviewLimit) * 100)}%`, height: '100%', background: usage.interviewExceeded ? '#EF4444' : '#FF6600', borderRadius: '99px', transition: 'width 300ms' }} />
            </div>
          </div>
          {usage.canvasExceeded && usage.interviewExceeded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <AlertTriangle style={{ width: '11px', height: '11px', color: '#EF4444' }} />
              <span style={{ fontSize: '10px', color: '#EF4444' }}>Limit reached. Delete old items to create new ones.</span>
            </div>
          )}
        </div>
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
          {validTracks.map(track => (
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
