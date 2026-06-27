'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  BookOpen, Search, Clock, ChevronRight, X,
  Layers, BarChart2, Zap, Database, Server, GitBranch,
  Radio, Layout, Monitor, Shield, ChevronDown, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { JsonLd } from '../../../components/seo/JsonLd';
import { collectionSchemaJsonLd } from '../../../lib/seo';

// ── Public curriculum page: no auth required, full SEO ─────────────────────
// Anyone can browse all tracks and lessons. Data fetched from API.

const BRAND   = '#FF6600';
const BRAND_L = 'rgba(255,102,0,0.08)';
const BRAND_B = 'rgba(255,102,0,0.20)';

const DIFFICULTIES = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;

const DIFF: Record<string, { label: string; color: string; bg: string; border: string }> = {
  BEGINNER:     { label: 'Beginner',     color: '#22c55e', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.25)'  },
  INTERMEDIATE: { label: 'Intermediate', color: BRAND,     bg: BRAND_L,                  border: BRAND_B                 },
  ADVANCED:     { label: 'Advanced',     color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.25)'  },
};

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

function DiffBadge({ d }: { d: string }) {
  const s = DIFF[d] ?? DIFF.BEGINNER;
  return (
    <span style={{
      fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '2px 7px', borderRadius: '4px', flexShrink: 0,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
    }}>{s.label}</span>
  );
}

function LessonRow({ l, trackSlug }: { l: any; trackSlug: string }) {
  return (
    <Link href={`/learn/${trackSlug}/${l.slug}`} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', background: 'var(--bg-surface)',
      border: '1px solid var(--border)', borderRadius: '10px',
      textDecoration: 'none', gap: '12px', transition: 'border-color 150ms, background 150ms',
    }}
      onMouseOver={e => { e.currentTarget.style.borderColor = BRAND; e.currentTarget.style.background = BRAND_L; }}
      onMouseOut={e =>  { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-surface)'; }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {l.title}
        </p>
        <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{l.trackName}</span>
          {(l.tags ?? []).slice(0, 2).map((t: string) => (
            <span key={t} className="mono" style={{ fontSize: '9px', color: BRAND, background: BRAND_L, border: `1px solid ${BRAND_B}`, padding: '1px 5px', borderRadius: '3px' }}>#{t}</span>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Clock style={{ width: '10px', height: '10px' }} />{l.estimatedMin}m
        </span>
        <DiffBadge d={l.difficulty} />
        <ChevronRight style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
      </div>
    </Link>
  );
}

function TrackCard({ track }: { track: any }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const Icon = TRACK_ICONS[track.slug] ?? BookOpen;

  useEffect(() => {
    if (open && !detail) {
      api.get(`/learn/tracks/${track.slug}`)
        .then(res => {
          const data = res.data?.data ?? res.data;
          setDetail(data);
        })
        .catch(() => { /* silent */ });
    }
  }, [open, track.slug, detail]);

  const totalLessons = detail
    ? (detail.modules ?? []).reduce((s: number, m: any) => s + (m.lessons?.length ?? 0), 0)
    : 0;

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${open ? BRAND : 'var(--border)'}`,
      borderRadius: '14px', overflow: 'hidden',
      boxShadow: open ? `0 0 0 3px ${BRAND_L}` : 'none',
      transition: 'border-color 200ms, box-shadow 200ms',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'flex-start', gap: '14px',
          padding: '20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
        }}
        onMouseOver={e => { if (!open) (e.currentTarget.parentElement as HTMLElement).style.borderColor = BRAND_B; }}
        onMouseOut={e =>  { if (!open) (e.currentTarget.parentElement as HTMLElement).style.borderColor = 'var(--border)'; }}
        data-track="curriculum:track_expand"
        data-track-track={track.slug}
      >
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: open ? BRAND : BRAND_L,
          border: `1px solid ${BRAND_B}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 200ms',
        }}>
          <Icon style={{ width: '20px', height: '20px', color: open ? '#fff' : BRAND }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '5px' }}>
            <span className="mono" style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: BRAND, background: BRAND_L, border: `1px solid ${BRAND_B}`,
              padding: '2px 8px', borderRadius: '20px',
            }}>
              Level {track.level}
            </span>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {totalLessons} lessons · {track.estimatedHours}h estimated
            </span>
          </div>
          <h3 className="bricolage" style={{
            margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3,
          }}>
            {track.name}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            {track.description}
          </p>
        </div>
        <div style={{
          flexShrink: 0, marginTop: '2px',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 200ms',
        }}>
          <ChevronDown style={{ width: '17px', height: '17px', color: open ? BRAND : 'var(--text-muted)' }} />
        </div>
      </button>

      {open && detail && (
        <div style={{ borderTop: `1px solid var(--border)` }}>
          <div style={{ padding: '12px 20px', background: BRAND_L, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {totalLessons} lessons in this track
            </span>
            <Link
              href={`/learn/${track.slug}`}
              onClick={e => e.stopPropagation()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                fontSize: '12px', fontWeight: 600, color: '#fff',
                background: BRAND, border: 'none',
                padding: '6px 14px', borderRadius: '7px',
                textDecoration: 'none', transition: 'opacity 150ms',
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseOut={e => (e.currentTarget.style.opacity = '1')}
              data-track="curriculum:open_track"
              data-track-track={track.slug}
            >
              Open Track <ChevronRight style={{ width: '12px', height: '12px' }} />
            </Link>
          </div>

          {(detail.modules ?? []).map((mod: any) => (
            <div key={mod.id}>
              <div style={{
                padding: '8px 20px 6px',
                background: 'var(--bg-elevated)',
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
              }}>
                <span className="mono" style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em',
                  textTransform: 'uppercase', color: 'var(--text-muted)',
                }}>
                  {mod.name}
                </span>
              </div>

              {(mod.lessons ?? []).map((lesson: any, i: number) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${track.slug}/${lesson.slug}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 20px', textDecoration: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    background: 'var(--bg-surface)', transition: 'background 120ms',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = BRAND_L; }}
                  onMouseOut={e =>  { e.currentTarget.style.background = 'var(--bg-surface)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                    <span className="mono" style={{
                      fontSize: '10px', fontWeight: 700, color: BRAND,
                      minWidth: '22px', flexShrink: 0,
                    }}>
                      {String(lesson.order ?? i + 1).padStart(2, '0')}
                    </span>
                    <span style={{
                      fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {lesson.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock style={{ width: '10px', height: '10px' }} />{lesson.estimatedMin}m
                    </span>
                    <DiffBadge d={lesson.difficulty ?? 'BEGINNER'} />
                    <ChevronRight style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LearnCurriculumPage() {
  const [tracks, setTracks] = useState<any[]>([]);
  const [tracksLoading, setTracksLoading] = useState(true);

  useEffect(() => {
    api.get('/learn/tracks')
      .then(res => {
        const data = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setTracks(data);
      })
      .catch(() => { /* silent */ })
      .finally(() => setTracksLoading(false));
  }, []);

  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const filteredTracks = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tracks.filter(track => {
      const matchesText = !q ||
        track.name.toLowerCase().includes(q) ||
        (track.description ?? '').toLowerCase().includes(q);

      return matchesText;
    });
  }, [tracks, query]);

  const clearSearch = () => { setQuery(''); setDifficulty(''); };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <JsonLd data={collectionSchemaJsonLd()} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://systemdesignos.com/' },
          { '@type': 'ListItem', position: 2, name: 'Curriculum', item: 'https://systemdesignos.com/learn' },
        ],
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: BRAND_L, border: `1px solid ${BRAND_B}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpen style={{ width: '20px', height: '20px', color: BRAND }} />
        </div>
        <div>
          <h1 className="bricolage" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Curriculum
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {tracksLoading ? 'Loading...' : `${tracks.length} tracks`}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '200px' }}>
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
            onBlur={e =>  { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          {query && (
            <button onClick={clearSearch} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}>
              <X style={{ width: '13px', height: '13px' }} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {DIFFICULTIES.map(d => {
            const s = DIFF[d];
            const active = difficulty === d;
            return (
              <button key={d} onClick={() => setDifficulty(active ? '' : d)} className="mono" style={{
                padding: '8px 13px', borderRadius: '8px', cursor: 'pointer',
                border: `1px solid ${active ? s.border : 'var(--border)'}`,
                background: active ? s.bg : 'transparent',
                color: active ? s.color : 'var(--text-muted)',
                fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
                transition: 'all 150ms',
              }}>
                {s.label}
              </button>
            );
          })}
          {(query || difficulty) && (
            <button onClick={clearSearch} className="mono" style={{
              padding: '8px 11px', borderRadius: '8px', cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <X style={{ width: '10px', height: '10px' }} /> Clear
            </button>
          )}
        </div>
      </div>

      {tracksLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : filteredTracks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
          No tracks match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTracks.map(track => (
            <TrackCard key={track.id} track={track} />
          ))}
        </div>
      )}
    </div>
  );
}
