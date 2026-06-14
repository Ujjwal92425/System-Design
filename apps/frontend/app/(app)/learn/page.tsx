'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { BookOpen, Search, Loader2, AlertCircle, Clock, X, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { TrackCard } from '../../../components/learn/TrackCard';
import { useTracks } from '../../../features/learn/useLearn';
import { api } from '../../../lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LessonSearchResult {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  estimatedMin: number;
  tags: string[];
  companies: string[];
  module: {
    name: string;
    track: { slug: string; name: string };
  };
}

// ── Difficulty filter chip ────────────────────────────────────────────────────
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

const DIFFICULTY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  beginner:     { color: '#36C98E', bg: 'rgba(54,201,142,0.08)',  border: 'rgba(54,201,142,0.25)' },
  intermediate: { color: '#E8A045', bg: 'rgba(232,160,69,0.08)',  border: 'rgba(232,160,69,0.25)' },
  advanced:     { color: '#F87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
};

// ── Lesson search result row ──────────────────────────────────────────────────
function LessonRow({ lesson }: { lesson: LessonSearchResult }) {
  const d = DIFFICULTY_STYLES[lesson.difficulty] ?? DIFFICULTY_STYLES.beginner;
  return (
    <Link
      href={`/learn/${lesson.module.track.slug}/${lesson.slug}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        textDecoration: 'none',
        transition: 'border-color 150ms ease',
        gap: '16px',
      }}
      onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
      onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      {/* Left */}
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {lesson.title}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {lesson.module.track.name} · {lesson.module.name}
          </span>
              {lesson.tags.slice(0, 2).map(t => (
                <span key={t} className="mono" style={{ fontSize: '10px', color: 'var(--accent-blue)', background: 'rgba(255,102,0,0.08)', border: '1px solid rgba(255,102,0,0.15)', padding: '1px 6px', borderRadius: '4px' }}>
                  #{t}
                </span>
              ))}
        </div>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock style={{ width: '11px', height: '11px' }} />
          {lesson.estimatedMin}m
        </span>
        <span className="mono" style={{ fontSize: '10px', color: d.color, background: d.bg, border: `1px solid ${d.border}`, padding: '2px 8px', borderRadius: '4px', fontWeight: 600, textTransform: 'capitalize' }}>
          {lesson.difficulty}
        </span>
        <ChevronRight style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
      </div>
    </Link>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function LearnCurriculumPage() {
  const { tracks, loading: tracksLoading, error: tracksError } = useTracks();
  const [activeTab, setActiveTab] = useState<'tracks' | 'search'>('tracks');

  // Track filter
  const [trackFilter, setTrackFilter] = useState('');
  const filteredTracks = tracks.filter(t =>
    t.name.toLowerCase().includes(trackFilter.toLowerCase()) ||
    t.description.toLowerCase().includes(trackFilter.toLowerCase())
  );

  // Lesson search state
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [results, setResults] = useState<LessonSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const runSearch = useCallback(async (q: string, diff: string) => {
    if (!q.trim() && !diff) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (diff)      params.set('difficulty', diff);
      const res = await api.get(`/learn/lessons/search?${params}`);
      setResults(res.data.data ?? []);
    } catch (e: any) {
      setSearchError(e.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounce text changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(query, difficulty), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, difficulty, runSearch]);

  // Auto-switch tab when user types in search
  useEffect(() => {
    if (query) setActiveTab('search');
  }, [query]);

  const clearSearch = () => {
    setQuery('');
    setDifficulty('');
    setResults([]);
    setHasSearched(false);
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '40px 32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: 'rgba(255,102,0,0.1)', border: '1px solid rgba(255,102,0,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <BookOpen style={{ width: '20px', height: '20px', color: 'var(--accent-blue)' }} />
        </div>
        <div>
          <h1 className="bricolage" style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Curriculum
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Five levels from DNS fundamentals to distributed consensus.
          </p>
        </div>
      </div>

      {/* Unified search bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '200px' }}>
          <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            placeholder="Search lessons by name, concept, or tag…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              paddingLeft: '40px',
              paddingRight: query ? '36px' : '14px',
              paddingTop: '11px',
              paddingBottom: '11px',
              fontSize: '14px',
              color: 'var(--text-primary)',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          {query && (
            <button
              onClick={clearSearch}
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-muted)' }}
            >
              <X style={{ width: '14px', height: '14px' }} />
            </button>
          )}
        </div>

        {/* Difficulty chips */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {DIFFICULTIES.map(d => {
            const s = DIFFICULTY_STYLES[d];
            const active = difficulty === d;
            return (
              <button
                key={d}
                onClick={() => setDifficulty(active ? '' : d)}
                className="mono"
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: `1px solid ${active ? s.border : 'var(--border)'}`,
                  background: active ? s.bg : 'transparent',
                  color: active ? s.color : 'var(--text-muted)',
                  fontSize: '11px',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab row (only when no query) */}
      {!query && !difficulty && (
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '0' }}>
          {(['tracks', 'search'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="mono"
              style={{
                padding: '10px 20px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid var(--accent-amber)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                cursor: 'pointer',
                marginBottom: '-1px',
                transition: 'color 150ms ease',
              }}
            >
              {tab === 'tracks' ? 'Browse Tracks' : 'Search Lessons'}
            </button>
          ))}
        </div>
      )}

      {/* ── Tracks tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'tracks' && !query && !difficulty && (
        <>
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <Search style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', width: '13px', height: '13px', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Filter tracks…"
              value={trackFilter}
              onChange={e => setTrackFilter(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                paddingLeft: '36px',
                paddingRight: '14px',
                paddingTop: '9px',
                paddingBottom: '9px',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {tracksLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
              <Loader2 style={{ width: '28px', height: '28px', color: 'var(--accent-amber)' }} className="animate-spin" />
            </div>
          )}
          {tracksError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '16px' }}>
              <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
              <span style={{ fontSize: '13px' }}>{tracksError}</span>
            </div>
          )}
          {!tracksLoading && !tracksError && (
            filteredTracks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                No tracks match "{trackFilter}".
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {filteredTracks.map(track => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* ── Lesson search results ─────────────────────────────────────────────── */}
      {(activeTab === 'search' || query || difficulty) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {searching && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '24px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
              Searching lessons…
            </div>
          )}

          {searchError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '14px' }}>
              <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
              <span style={{ fontSize: '13px' }}>{searchError}</span>
            </div>
          )}

          {!searching && hasSearched && results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              No lessons match your search.
            </div>
          )}

          {!searching && !hasSearched && !query && difficulty && (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
              Showing all <strong style={{ color: 'var(--text-primary)' }}>{difficulty}</strong> lessons…
            </p>
          )}

          {results.map(lesson => (
            <LessonRow key={lesson.id} lesson={lesson} />
          ))}

          {!searching && !query && !difficulty && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              Type a concept (e.g. "sharding", "cache", "CAP theorem") to search all lessons.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
