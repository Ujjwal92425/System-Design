'use client';

import { useParams } from 'next/navigation';
import {
  curriculumData, getTrackBySlug,
} from '../../../../data/curriculum/index';
import {
  ArrowLeft, ChevronRight, Clock, BookOpen, CheckCircle, Circle, Zap, BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { useProgressStore } from '../../../../features/learn/progressStore';
import { JsonLd } from '../../../../components/seo/JsonLd';
import { breadcrumbSchemaJsonLd, collectionPageSchemaJsonLd } from '../../../../lib/seo';
import { BRAND, BRAND_L, BRAND_B, DiffBadge, PROGRESS_COLORS } from '../../../../components/ui/curriculum-shared';

// ── Public track page: full lesson listing with progress overlay ──────────
// Anyone can view. Progress is shown from localStorage if available.

export default function TrackPage() {
  const params = useParams();
  const trackSlug = params.trackSlug as string;
  const track = curriculumData.tracks.find(t => t.slug === trackSlug);
  const detail = curriculumData.trackDetails[trackSlug] as any;
  const modules = detail?.modules ?? [];

  const lessonStatuses = useProgressStore(s => s.lessonStatuses);

  const lessonIds = useMemo(() => {
    const ids = new Set<string>();
    for (const mod of modules) {
      for (const l of mod.lessons ?? []) ids.add(l.id);
    }
    return ids;
  }, [modules]);

  const trackProgress = useMemo(() => {
    const total = lessonIds.size;
    if (total === 0) return { completed: 0, total, percent: 0 };
    const completed = [...lessonIds].filter(id => lessonStatuses[id]?.status === 'COMPLETE').length;
    return { completed, total, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [lessonIds, lessonStatuses]);

  if (!track) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Track Not Found</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
          The track you are looking for does not exist.
        </p>
        <Link href="/learn" style={{ color: BRAND, fontWeight: 600 }}>
          ← Back to Curriculum
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '36px 24px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <JsonLd data={breadcrumbSchemaJsonLd([
        { name: 'Home', path: '/' },
        { name: 'Curriculum', path: '/learn' },
        { name: track.name, path: `/learn/${trackSlug}` },
      ])} />
      <JsonLd data={collectionPageSchemaJsonLd({
        name: track.name,
        description: track.description || '',
        slug: trackSlug,
      })} />

      <Link href="/learn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: BRAND, fontWeight: 600, textDecoration: 'none', width: 'fit-content' }}>
        <ArrowLeft style={{ width: '14px', height: '14px' }} /> Curriculum
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px', flexShrink: 0,
          background: BRAND_L, border: `1px solid ${BRAND_B}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpen style={{ width: '24px', height: '24px', color: BRAND }} />
        </div>
        <div style={{ flex: 1 }}>
          <span className="mono" style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
            color: BRAND, background: BRAND_L, border: `1px solid ${BRAND_B}`,
            padding: '2px 10px', borderRadius: '20px', display: 'inline-block', marginBottom: '6px',
          }}>
            Level {track.level}
          </span>
          <h1 className="bricolage" style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            {track.name}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '560px', lineHeight: 1.6 }}>
            {track.description}
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <BookOpen style={{ width: '13px', height: '13px' }} />
              {trackProgress.total} lessons
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock style={{ width: '13px', height: '13px' }} />
              ~{track.estimatedHours}h
            </span>
          </div>
          {trackProgress.total > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: '1', maxWidth: '240px', height: '6px', background: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  width: `${trackProgress.percent}%`, height: '100%',
                  background: PROGRESS_COLORS.gradient,
                  borderRadius: '999px', transition: 'width 400ms ease',
                }} />
              </div>
              <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {trackProgress.completed}/{trackProgress.total} ({trackProgress.percent}%)
              </span>
            </div>
          )}
          {track.learningGoals && track.learningGoals.length > 0 && (
            <div style={{ marginTop: '16px', background: BRAND_L, border: `1px solid ${BRAND_B}`, borderRadius: '10px', padding: '14px 18px' }}>
              <p className="mono" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: BRAND, margin: '0 0 6px' }}>
                Learning Goals
              </p>
              <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                {track.learningGoals.map((g: string, i: number) => (
                  <li key={i} style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.5 }}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {modules.map((mod: any, mi: number) => {
        const modLessons = mod.lessons ?? [];
        const modCompleted = modLessons.filter((l: any) => lessonStatuses[l.id]?.status === 'COMPLETE').length;
        return (
          <div key={mod.id} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '14px', overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <span className="mono" style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                  Module {mod.order ?? mi + 1}
                </span>
                <h2 className="bricolage" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '2px 0 0' }}>
                  {mod.name}
                </h2>
              </div>
              <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {modCompleted}/{modLessons.length}
              </span>
            </div>

            {modLessons.map((lesson: any, li: number) => {
              const state = lessonStatuses[lesson.id];
              const status = state?.status ?? 'NOT_STARTED';
              const isCompleted = status === 'COMPLETE';
              return (
                <Link
                  key={lesson.id}
                  href={`/learn/${trackSlug}/${lesson.slug}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 20px', textDecoration: 'none',
                    borderTop: li === 0 ? 'none' : '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    transition: 'background 120ms',
                  }}
                  onMouseOver={e => { e.currentTarget.style.background = BRAND_L; }}
                  onMouseOut={e =>  { e.currentTarget.style.background = 'var(--bg-surface)'; }}
                >
                  {isCompleted ? (
                    <CheckCircle style={{ width: '16px', height: '16px', color: '#22c55e', flexShrink: 0 }} />
                  ) : (
                    <Circle style={{ width: '16px', height: '16px', color: 'var(--text-muted)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="mono" style={{ fontSize: '10px', fontWeight: 700, color: BRAND, marginRight: '8px' }}>
                      {String(lesson.order ?? li + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {lesson.title}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Clock style={{ width: '10px', height: '10px' }} />{lesson.estimatedMin}m
                    </span>
                    {lesson.difficulty && <DiffBadge d={lesson.difficulty} />}
                    <ChevronRight style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
