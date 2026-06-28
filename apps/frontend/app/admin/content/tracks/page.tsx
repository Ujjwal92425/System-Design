'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Loader2, Plus, Eye, Pencil } from 'lucide-react';
import { api } from '../../../../lib/api';

interface Track {
  id: string;
  slug: string;
  name: string;
  level: number;
  isPublished: boolean;
  _count?: { modules: number };
}

export default function AdminTracksPage() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/learn/tracks')
      .then(r => setTracks(r.data.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="bricolage" style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Tracks</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Manage curriculum tracks and their modules.</p>
        </div>
        <Link href="/admin/content/tracks/new" style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '9px 16px', background: 'var(--accent-amber)', color: '#080B14',
          borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none',
        }}>
          <Plus style={{ width: '14px', height: '14px' }} /> New Track
        </Link>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 style={{ width: '24px', height: '24px', color: 'var(--accent-amber)' }} className="animate-spin" />
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['Level', 'Name', 'Slug', 'Status', 'Actions'].map(h => (
                <th key={h} className="mono" style={{ textAlign: 'left', padding: '10px 14px', fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tracks.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-surface)')}
                onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ padding: '12px 14px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--accent-amber)', fontWeight: 700 }}>L{t.level}</span>
                </td>
                <td style={{ padding: '12px 14px', fontSize: '14px', color: 'var(--text-primary)', fontWeight: 600 }}>{t.name}</td>
                <td style={{ padding: '12px 14px' }}>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.slug}</span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <span className="mono" style={{
                    fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                    color: t.isPublished ? 'var(--accent-green)' : 'var(--text-muted)',
                    background: t.isPublished ? 'rgba(54,201,142,0.08)' : 'var(--bg-elevated)',
                    border: `1px solid ${t.isPublished ? 'rgba(54,201,142,0.2)' : 'var(--border)'}`,
                  }}>
                    {t.isPublished ? 'PUBLISHED' : 'DRAFT'}
                  </span>
                </td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Link href={`/learn/${t.slug}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Preview">
                      <Eye style={{ width: '14px', height: '14px' }} />
                    </Link>
                    <Link href={`/admin/content/tracks/${t.id}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Edit">
                      <Pencil style={{ width: '14px', height: '14px' }} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
