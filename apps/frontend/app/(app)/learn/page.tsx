'use client';

import { useState, useMemo } from 'react';
import {
  BookOpen, Search, X, TrendingUp, Flame, Layers, Sparkles,
  AlertTriangle, Loader2, LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { useTracks } from '../../../features/learn/useLearn';
import { useUsage } from '../../../features/usage/useUsage';
import { useAuthStore } from '../../../features/auth/authStore';
import { JsonLd } from '../../../components/seo/JsonLd';
import { collectionSchemaJsonLd } from '../../../lib/seo';
import { ChapterCard } from '../../../components/learn/ChapterCard';
import { NextLessonCard } from '../../../components/dashboard/NextLessonCard';
import { TrackProgressCard } from '../../../components/dashboard/TrackProgressCard';

const BRAND = '#FF6600';
const BRAND_L = 'rgba(255,102,0,0.08)';
const BRAND_B = 'rgba(255,102,0,0.20)';

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
        background: BRAND_L,
        border: `1px solid ${BRAND_B}`,
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

export default function LearnHubPage() {
  const user = useAuthStore(s => s.user);
  const { tracks, loading } = useTracks();
  const usage = useUsage();

  const validTracks = tracks.filter(t => t && t.slug);

  const totalPct = validTracks.length
    ? validTracks.reduce((s, t) => s + (t.completedPct || 0), 0) / validTracks.length
    : 0;

  const activeTrack = validTracks.length
    ? (validTracks.find(t => (t.completedPct || 0) > 0 && (t.completedPct || 0) < 1) ??
       validTracks.find(t => (t.completedPct || 0) === 0) ??
       validTracks[0])
    : null;

  const [query, setQuery] = useState('');

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return validTracks.filter(track => {
      const matchesText = !q ||
        track.name.toLowerCase().includes(q) ||
        (track.description ?? '').toLowerCase().includes(q);
      return matchesText;
    });
  }, [validTracks, query]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 style={{ width: '32px', height: '32px', color: 'var(--accent-amber)' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <JsonLd data={collectionSchemaJsonLd()} />

      {user && (
        <>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <LayoutDashboard style={{ width: '18px', height: '18px', color: 'var(--accent-amber)' }} />
              <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Dashboard
              </span>
            </div>
            <h1 className="bricolage" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Here&apos;s where you stand across all tracks.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
            <StatCard label="Overall Progress" value={`${Math.round(totalPct * 100)}%`} icon={TrendingUp} />
            <StatCard label="Tracks Active" value={`${validTracks.filter(t => t.completedPct > 0).length} / ${validTracks.length}`} icon={BookOpen} />
            <StatCard label="Daily Streak" value="—" icon={Flame} />
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
                  <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: usage.canvasExceeded ? '#EF4444' : 'var(--text-primary)' }}>
                    {usage.canvasCount} / {usage.canvasLimit}
                  </span>
                </div>
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (usage.canvasCount / usage.canvasLimit) * 100)}%`, height: '100%', background: usage.canvasExceeded ? '#EF4444' : BRAND, borderRadius: '99px', transition: 'width 300ms' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Sparkles style={{ width: '12px', height: '12px' }} /> Interviews
                  </span>
                  <span className="mono" style={{ fontSize: '11px', fontWeight: 700, color: usage.interviewExceeded ? '#EF4444' : 'var(--text-primary)' }}>
                    {usage.interviewCount} / {usage.interviewLimit}
                  </span>
                </div>
                <div style={{ height: '4px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (usage.interviewCount / usage.interviewLimit) * 100)}%`, height: '100%', background: usage.interviewExceeded ? '#EF4444' : BRAND, borderRadius: '99px', transition: 'width 300ms' }} />
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {activeTrack && (
              <NextLessonCard trackName={activeTrack.name} trackSlug={activeTrack.slug} />
            )}

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
                { label: '→ Open architecture canvas', href: '/build' },
                { label: '→ Start an interview session', href: '/interview' },
                { label: '→ Browse community blueprints', href: '/community' },
              ].map(({ label, href }) => (
                <Link key={href} href={href} style={{
                  fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none',
                  padding: '10px 14px', borderRadius: '8px',
                  border: '1px solid var(--border)', background: 'transparent',
                  transition: 'all 150ms ease',
                }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

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
        </>
      )}

      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: BRAND_L, border: `1px solid ${BRAND_B}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen style={{ width: '20px', height: '20px', color: BRAND }} />
          </div>
          <div>
            <h1 className="bricolage" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {user ? 'Curriculum' : 'Learn'}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {validTracks.length} tracks
            </p>
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: '400px', marginBottom: '24px' }}>
          <Search style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search tracks…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%', background: 'var(--bg-surface)',
              border: '1px solid var(--border)', borderRadius: '10px',
              paddingLeft: '38px', paddingRight: query ? '34px' : '14px',
              paddingTop: '10px', paddingBottom: '10px',
              fontSize: '13px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = BRAND; e.currentTarget.style.boxShadow = `0 0 0 3px ${BRAND_L}`; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}>
              <X style={{ width: '13px', height: '13px' }} />
            </button>
          )}
        </div>

        {filteredTracks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            No tracks match your search criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredTracks.map(track => (
              <ChapterCard
                key={track.id}
                slug={track.slug}
                name={track.name}
                description={track.description}
                level={track.level}
                estimatedHours={track.estimatedHours}
                completedPct={user ? track.completedPct : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
