'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { 
  Plus, Loader2, AlertCircle, Search, Clock, 
  Tag, ChevronLeft, ChevronRight, Eye, Pencil, Trash2 
} from 'lucide-react';

interface Lesson {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  estimatedMin: number;
  isPublished: boolean;
  publishedAt: string | null;
  module: {
    id: string;
    name: string;
    track: {
      id: string;
      name: string;
      level: number;
    }
  };
  _count: {
    quizzes: number;
  };
}

export default function AdminLessonsPage() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLessons = useCallback(async (q: string, diff: string, currPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', currPage.toString());
      params.set('limit', '15');
      if (q) params.set('search', q);
      if (diff) params.set('difficulty', diff);

      const res = await api.get(`/admin/lessons?${params}`);
      const data = res.data.data;
      setLessons(data.lessons || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch lessons');
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger search on filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLessons(search, difficulty, page);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, difficulty, page, fetchLessons]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this lesson? This will delete all associated quizzes and progress.')) return;
    try {
      await api.delete(`/admin/lessons/${id}`);
      setLessons(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete lesson');
    }
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case 'beginner': return '#36C98E';
      case 'intermediate': return '#E8A045';
      case 'advanced': return '#F87171';
      default: return 'var(--text-muted)';
    }
  };

  return (
    <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="bricolage" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Curriculum Lessons
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Author, structure, and publish MDX system design content.
          </p>
        </div>
        
        <Link href="/admin/content/lessons/new" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '9px 16px', background: 'var(--accent-amber)', color: '#080B14',
          borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
        }}>
          <Plus style={{ width: '14px', height: '14px' }} />
          <span>New Lesson</span>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search lessons..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            style={{
              width: '100%',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              paddingLeft: '36px',
              paddingRight: '12px',
              paddingTop: '9px',
              paddingBottom: '9px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          />
        </div>

        <select
          value={difficulty}
          onChange={e => { setDifficulty(e.target.value); setPage(1); }}
          className="mono"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '9px 12px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">All Difficulties</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '16px' }}>
          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <Loader2 style={{ width: '28px', height: '28px', color: 'var(--accent-amber)' }} className="animate-spin" />
        </div>
      ) : (
        <>
          {lessons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
              No lessons match your criteria.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th className="mono" style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Title</th>
                    <th className="mono" style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Track & Module</th>
                    <th className="mono" style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Difficulty</th>
                    <th className="mono" style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Est. Min</th>
                    <th className="mono" style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quizzes</th>
                    <th className="mono" style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                    <th className="mono" style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map(l => (
                    <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{l.title}</span>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>/{l.slug}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{l.module?.track?.name}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{l.module?.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className="mono" style={{ fontSize: '10px', color: getDifficultyColor(l.difficulty), fontWeight: 700, textTransform: 'uppercase' }}>
                          {l.difficulty}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock style={{ width: '12px', height: '12px' }} />
                          {l.estimatedMin}m
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {l._count?.quizzes || 0}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <span className="mono" style={{
                          fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                          color: l.isPublished ? 'var(--accent-green)' : 'var(--text-muted)',
                          background: l.isPublished ? 'rgba(54,201,142,0.08)' : 'var(--bg-elevated)',
                          border: `1px solid ${l.isPublished ? 'rgba(54,201,142,0.2)' : 'var(--border)'}`,
                        }}>
                          {l.isPublished ? 'PUBLISHED' : 'DRAFT'}
                        </span>
                      </td>
                      <td style={{ padding: '14px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <Link href={`/learn/${l.module?.track?.slug}/${l.slug}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Preview">
                            <Eye style={{ width: '14px', height: '14px' }} />
                          </Link>
                          <Link href={`/admin/content/lessons/${l.id}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Edit">
                            <Pencil style={{ width: '14px', height: '14px' }} />
                          </Link>
                          <button
                            onClick={() => handleDelete(l.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 0 }}
                            onMouseOver={e => (e.currentTarget.style.color = '#F87171')}
                            onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                            title="Delete"
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: page === 1 ? 'not-allowed' : 'pointer',
                    color: page === 1 ? 'var(--text-muted)' : 'var(--text-primary)'
                  }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px' }} />
                </button>
                <span className="mono" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    color: page === totalPages ? 'var(--text-muted)' : 'var(--text-primary)'
                  }}
                >
                  <ChevronRight style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
  );
}
