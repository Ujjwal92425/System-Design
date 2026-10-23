'use client';

import { useEffect, useState } from 'react';
import { adminService } from '@/api-clients/admin';
import { Loader2, Star, Flag, Trash2, CheckCircle, XCircle, Plus, MessageSquare } from 'lucide-react';

interface AdminBlueprint {
  id: string; title: string; description: string; tags: string[];
  voteCount: number; forkCount: number; viewCount: number;
  isPublished: boolean; isFeatured: boolean; publishedAt: string; createdAt: string;
  author: { id: string; name: string | null; email: string };
  design: { id: string; title: string };
  _count: { comments: number; votes: number; reports: number };
}

interface AdminComment {
  id: string; content: string; parentId: string | null; deletedAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string; avatarUrl: string | null };
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

  // Create blueprint modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    designId: '', title: '', description: '', tags: '', mediaUrls: '', authorId: '',
  });
  const [creating, setCreating] = useState(false);

  // Comments drawer per blueprint
  const [expandedBp, setExpandedBp] = useState<string | null>(null);
  const [comments, setComments] = useState<AdminComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [bps, reps] = await Promise.all([
          adminService.listBlueprints(),
          adminService.listPendingReports(),
        ]);
        setBlueprints(bps);
        setReports(reps);
      } catch (err) { console.error(err); }
      setLoading(false);
    }
    load();
  }, []);

  async function handleFeature(id: string, featured: boolean) {
    await adminService.featureBlueprint(id, featured);
    setBlueprints((prev) => prev.map((b) => b.id === id ? { ...b, isFeatured: featured } : b));
  }

  async function handleRemove(id: string) {
    if (!confirm('Remove this blueprint from the community?')) return;
    await adminService.removeBlueprint(id);
    setBlueprints((prev) => prev.map((b) => b.id === id ? { ...b, isPublished: false } : b));
  }

  async function handleHardDelete(id: string) {
    if (!confirm('PERMANENTLY delete this blueprint and all its data? This cannot be undone.')) return;
    await adminService.hardDeleteBlueprint(id);
    setBlueprints((prev) => prev.filter((b) => b.id !== id));
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const data: any = {
        designId: createForm.designId,
        title: createForm.title,
        description: createForm.description,
        tags: createForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
      };
      if (createForm.mediaUrls.trim()) {
        data.mediaUrls = createForm.mediaUrls.split(',').map((u) => u.trim()).filter(Boolean);
      }
      if (createForm.authorId.trim()) data.authorId = createForm.authorId.trim();
      const bp = await adminService.createBlueprint(data);
      setBlueprints((prev) => [bp, ...prev]);
      setShowCreate(false);
      setCreateForm({ designId: '', title: '', description: '', tags: '', mediaUrls: '', authorId: '' });
    } catch (err) { console.error(err); }
    setCreating(false);
  }

  async function toggleComments(bpId: string) {
    if (expandedBp === bpId) {
      setExpandedBp(null);
      return;
    }
    setExpandedBp(bpId);
    setLoadingComments(true);
    try {
      const data = await adminService.listCommentsForBlueprint(bpId);
      setComments(data);
    } catch (err) { console.error(err); }
    setLoadingComments(false);
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('Delete this comment permanently?')) return;
    await adminService.deleteComment(commentId);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  async function handleReview(reportId: string, status: string) {
    await adminService.reviewReport(reportId, status);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '4px' }}>Blueprint Moderation</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Manage community blueprints, comments, and reports
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          style={{
            padding: '8px 16px', borderRadius: '8px', border: 'none',
            background: 'var(--accent-blue)', color: '#fff', cursor: 'pointer',
            fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          <Plus className="w-4 h-4" /> Create Blueprint
        </button>
      </div>

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
            <div key={bp.id}>
              <div style={{
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
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button
                    onClick={() => toggleComments(bp.id)}
                    title="View comments"
                    style={{
                      padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                      background: expandedBp === bp.id ? 'rgba(59,130,246,0.1)' : 'var(--bg-surface)',
                      cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span style={{ fontSize: '10px' }}>{bp._count.comments}</span>
                  </button>
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

              {expandedBp === bp.id && (
                <div style={{
                  marginLeft: '16px', marginTop: '4px', padding: '12px 16px',
                  background: 'var(--bg-surface)', border: '1px solid var(--border)',
                  borderRadius: '0 0 12px 12px', borderTop: 'none',
                }}>
                  {loadingComments ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px' }}>
                      No comments on this blueprint
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                      {comments.map((c) => (
                        <div key={c.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 10px', borderRadius: '8px',
                          background: c.deletedAt ? 'rgba(239,68,68,0.05)' : 'transparent',
                          border: '1px solid var(--border)',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                {c.user.name || c.user.email}
                              </span>
                              {c.parentId && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>↳ reply</span>}
                              {c.deletedAt && <span style={{ fontSize: '10px', color: 'var(--color-error)', fontWeight: 600 }}>DELETED</span>}
                            </div>
                            <p style={{
                              fontSize: '12px', color: 'var(--text-primary)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>
                              {c.deletedAt ? '[deleted]' : c.content}
                            </p>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {!c.deletedAt && (
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              title="Delete comment"
                              style={{
                                padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(239,68,68,0.3)',
                                color: 'var(--color-error)', background: 'transparent', cursor: 'pointer',
                                fontSize: '10px', marginLeft: '8px', flexShrink: 0,
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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

      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }} onClick={() => setShowCreate(false)}>
          <div style={{
            background: 'var(--bg-surface)', borderRadius: '16px', padding: '32px',
            width: '500px', maxWidth: '90vw', maxHeight: '80vh', overflowY: 'auto',
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Create Blueprint</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Design ID *</label>
                <input value={createForm.designId} onChange={(e) => setCreateForm((f) => ({ ...f, designId: e.target.value }))}
                  placeholder="cuid..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: '13px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Title *</label>
                <input value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Blueprint title" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: '13px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Description *</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the architecture..." rows={3}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: '13px', color: 'var(--text-primary)', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Tags (comma-separated)</label>
                  <input value={createForm.tags} onChange={(e) => setCreateForm((f) => ({ ...f, tags: e.target.value }))}
                    placeholder="microservices, aws" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: '13px', color: 'var(--text-primary)' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Author ID (optional)</label>
                  <input value={createForm.authorId} onChange={(e) => setCreateForm((f) => ({ ...f, authorId: e.target.value }))}
                    placeholder="Defaults to you" style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: '13px', color: 'var(--text-primary)' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Media URLs (comma-separated, optional)</label>
                <input value={createForm.mediaUrls} onChange={(e) => setCreateForm((f) => ({ ...f, mediaUrls: e.target.value }))}
                  placeholder="https://..." style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: '13px', color: 'var(--text-primary)' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                Cancel
              </button>
              <button onClick={handleCreate} disabled={creating || !createForm.designId || !createForm.title || !createForm.description}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: creating || !createForm.designId || !createForm.title || !createForm.description ? 'var(--border)' : 'var(--accent-blue)',
                  color: creating || !createForm.designId || !createForm.title || !createForm.description ? 'var(--text-muted)' : '#fff',
                  cursor: creating || !createForm.designId || !createForm.title || !createForm.description ? 'not-allowed' : 'pointer',
                  fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : 'Create Blueprint'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
