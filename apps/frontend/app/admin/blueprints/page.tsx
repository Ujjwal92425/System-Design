'use client';

import { useEffect, useState } from 'react';
import { Loader2, Star, Flag, Trash2, CheckCircle, XCircle, Eye } from 'lucide-react';

interface AdminBlueprint {
  id: string; title: string; description: string; tags: string[];
  voteCount: number; forkCount: number; viewCount: number;
  isPublished: boolean; isFeatured: boolean; publishedAt: string;
  createdAt: string;
  author: { id: string; name: string | null; email: string };
  design: { id: string; title: string };
  _count: { comments: number; votes: number; reports: number };
}

interface Report {
  id: string; reason: string; status: string; createdAt: string;
  blueprint: { id: string; title: string };
  reporter: { id: string; name: string | null; email: string };
}

export default function AdminBlueprints() {
  const [blueprints, setBlueprints] = useState<AdminBlueprint[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<'blueprints' | 'reports'>('blueprints');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('accessToken');
        const [bpRes, repRes] = await Promise.all([
          fetch('/api/admin/blueprints', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/admin/reports', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (bpRes.ok) {
          const d = await bpRes.json();
          setBlueprints(d.data);
        }
        if (repRes.ok) {
          const d = await repRes.json();
          setReports(d.data);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  async function handleFeature(id: string, featured: boolean) {
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/blueprints/${id}/feature`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ featured }),
    });
    setBlueprints((prev) => prev.map((b) => b.id === id ? { ...b, isFeatured: featured } : b));
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this blueprint from the community?')) return;
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/blueprints/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setBlueprints((prev) => prev.map((b) => b.id === id ? { ...b, isPublished: false } : b));
  }

  async function handleReview(reportId: string, status: string) {
    const token = localStorage.getItem('accessToken');
    await fetch(`/api/admin/reports/${reportId}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    setReports((prev) => prev.map((r) => r.id === reportId ? { ...r, status } : r));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>Blueprint Moderation</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
        Manage community blueprints and reports
      </p>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button
          onClick={() => setTab('blueprints')}
          style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px',
            background: tab === 'blueprints' ? 'var(--accent-blue)' : 'var(--bg-surface)',
            color: tab === 'blueprints' ? '#fff' : 'var(--text-primary)',
          }}
        >
          All Blueprints ({blueprints.length})
        </button>
        <button
          onClick={() => setTab('reports')}
          style={{
            padding: '8px 20px', borderRadius: '8px', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px',
            background: tab === 'reports' ? 'var(--accent-blue)' : 'var(--bg-surface)',
            color: tab === 'reports' ? '#fff' : 'var(--text-primary)',
          }}
        >
          Pending Reports ({reports.filter((r) => r.status === 'pending').length})
        </button>
      </div>

      {tab === 'blueprints' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {blueprints.map((bp) => (
            <div key={bp.id} style={{
              background: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'start',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>{bp.title}</span>
                  {bp.isFeatured && <span style={{ fontSize: '10px', color: 'var(--color-warning)', fontWeight: 600 }}>FEATURED</span>}
                  {!bp.isPublished && <span style={{ fontSize: '10px', color: 'var(--color-error)', fontWeight: 600 }}>REMOVED</span>}
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  by {bp.author.name || bp.author.email} &middot; {bp._count.votes} votes &middot; {bp._count.comments} comments &middot; {bp._count.reports} reports
                </p>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Design: {bp.design?.title || 'N/A'} &middot; Created {new Date(bp.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => handleFeature(bp.id, !bp.isFeatured)}
                  title={bp.isFeatured ? 'Unfeature' : 'Feature'}
                  style={{
                    padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: bp.isFeatured ? 'rgba(245,158,11,0.1)' : 'var(--bg-surface)', cursor: 'pointer', fontSize: '11px',
                  }}
                >
                  <Star className={`w-3.5 h-3.5 ${bp.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
                {bp.isPublished && (
                  <button
                    onClick={() => handleRemove(bp.id)}
                    title="Remove from community"
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--color-error)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '11px' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
          {blueprints.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '32px' }}>No blueprints yet</p>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {reports.filter((r) => r.status === 'pending').length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '32px' }}>No pending reports</p>
          ) : (
            reports.filter((r) => r.status === 'pending').map((rep) => (
              <div key={rep.id} style={{
                background: 'var(--bg-surface)', border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: '12px', padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'start',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <Flag className="w-3.5 h-3.5 text-red-400" />
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>Report on "{rep.blueprint.title}"</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
                    Reason: {rep.reason}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Reported by {rep.reporter.name || rep.reporter.email} &middot; {new Date(rep.createdAt).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleReview(rep.id, 'dismissed')}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <XCircle className="w-3 h-3" /> Dismiss
                  </button>
                  <button
                    onClick={() => handleReview(rep.id, 'reviewed')}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: 'var(--color-error)', color: '#fff', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <CheckCircle className="w-3 h-3" /> Take Down
                  </button>
                </div>
              </div>
            ))
          )}

          {reports.filter((r) => r.status !== 'pending').length > 0 && (
            <details style={{ marginTop: '16px' }}>
              <summary style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500 }}>
                Reviewed Reports ({reports.filter((r) => r.status !== 'pending').length})
              </summary>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {reports.filter((r) => r.status !== 'pending').map((rep) => (
                  <div key={rep.id} style={{
                    background: 'var(--bg-surface)', border: '1px solid var(--border)',
                    borderRadius: '8px', padding: '12px', display: 'flex', justifyContent: 'space-between',
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', fontWeight: 500 }}>{rep.blueprint.title}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>{rep.reason}</span>
                    </div>
                    <span style={{
                      fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                      background: rep.status === 'reviewed' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                      color: rep.status === 'reviewed' ? 'var(--color-error)' : 'var(--color-success)',
                    }}>
                      {rep.status === 'reviewed' ? 'REMOVED' : 'DISMISSED'}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
