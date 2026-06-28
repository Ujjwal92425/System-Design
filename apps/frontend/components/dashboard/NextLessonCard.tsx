'use client';

import Link from 'next/link';
import { BookOpen } from 'lucide-react';

interface NextLessonCardProps {
  trackName: string;
  trackSlug: string;
  lessonTitle?: string;
  lessonSlug?: string;
}

export function NextLessonCard({ trackName, trackSlug, lessonTitle, lessonSlug }: NextLessonCardProps) {
  const href = lessonSlug ? `/learn/${trackSlug}/${lessonSlug}` : `/learn/${trackSlug}`;

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(77,127,255,0.06) 0%, rgba(232,160,69,0.04) 100%)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen style={{ width: '14px', height: '14px', color: 'var(--accent-blue)' }} />
          <span className="mono" style={{ fontSize: '10px', color: 'var(--accent-blue)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Resume learning
          </span>
        </div>

        <div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px', margin: 0 }}>
            {trackName}
          </p>
          <h3 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)', fontWeight: 700, margin: 0, marginTop: '4px', lineHeight: 1.3 }}>
            {lessonTitle ?? 'Start the track →'}
          </h3>
        </div>
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
          transition: 'opacity 150ms ease, transform 150ms ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.opacity = '0.85';
          e.currentTarget.style.transform = 'translateX(2px)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        Continue Learning →
      </Link>
    </div>
  );
}
