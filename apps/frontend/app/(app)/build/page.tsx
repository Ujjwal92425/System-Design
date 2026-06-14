'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { 
  FolderPlus, Loader2, AlertCircle, Compass, History, 
  Trash2, ChevronRight, Layers, LayoutGrid, FileJson
} from 'lucide-react';

interface Design {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
  updatedAt: string;
  versions: Array<{
    version: number;
    nodes: any;
  }>;
}

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: string;
  thumbnailUrl: string | null;
  tags: string[];
}

export default function BuildListPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New design creation modal/form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Filters for templates
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', 'Messaging', 'Storage', 'Social', 'Infrastructure'];

  useEffect(() => {
    Promise.all([
      api.get('/designs'),
      api.get('/designs/templates')
    ])
      .then(([designsRes, templatesRes]) => {
        setDesigns(designsRes.data.data || []);
        setTemplates(templatesRes.data.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || err.message || 'Failed to fetch workspaces');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleCreateDesign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const payload = {
        title: newTitle.trim() || 'Untitled Design',
        templateId: selectedTemplateId || undefined
      };
      const res = await api.post('/designs', payload);
      const newDesign = res.data.data;
      router.push(`/build/${newDesign.id}`);
    } catch (err: any) {
      setCreateError(err.response?.data?.message || err.message || 'Failed to create workspace');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteDesign = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workspace? It will be archived.')) return;

    try {
      await api.delete(`/designs/${id}`);
      setDesigns(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to delete workspace');
    }
  };

  const filteredTemplates = activeCategory === 'All' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 style={{ width: '32px', height: '32px', color: 'var(--accent-amber)' }} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 32px', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <Layers style={{ width: '18px', height: '18px', color: 'var(--accent-amber)' }} />
            <span className="mono" style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Build Studio
            </span>
          </div>
          <h1 className="bricolage" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Architecture Canvas
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Design microservices, route traffic topologies, and simulate system failures.
          </p>
        </div>
        
        <button
          onClick={() => {
            setNewTitle('');
            setSelectedTemplateId(null);
            setShowCreateModal(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: 'var(--accent-amber)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 150ms ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <FolderPlus style={{ width: '16px', height: '16px' }} />
          <span>New Design</span>
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: '10px', padding: '16px' }}>
          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* Main Grid: Left is designs, Right is Template picker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', alignItems: 'start' }}>
        
        {/* Left: Your Workspaces */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <History style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
            <h2 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>
              Recent Workspaces
            </h2>
            <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', marginLeft: 'auto' }}>
              {designs.length} total
            </span>
          </div>

          {designs.length === 0 ? (
            <div style={{ 
              border: '2px dashed var(--border)', 
              borderRadius: '12px', 
              padding: '48px 24px', 
              textAlign: 'center', 
              color: 'var(--text-muted)' 
            }}>
              <LayoutGrid style={{ width: '36px', height: '36px', margin: '0 auto 12px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No workspaces created yet</p>
              <p style={{ margin: '4px 0 16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Start a sandbox canvas or pick an interview template to get rolling.
              </p>
              <button
                onClick={() => {
                  setNewTitle('');
                  setSelectedTemplateId(null);
                  setShowCreateModal(true);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'transparent',
                  border: '1px solid var(--border-bright)',
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create blank workspace
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '14px' }}>
              {designs.map(d => {
                const latestVersion = d.versions?.[0];
                const nodesCount = Array.isArray(latestVersion?.nodes) ? latestVersion.nodes.length : 0;
                
                return (
                  <Link
                    key={d.id}
                    href={`/build/${d.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '20px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      transition: 'border-color 150ms ease',
                      gap: '16px'
                    }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                    onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3 className="bricolage" style={{ fontSize: '16px', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                        {d.title}
                      </h3>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {d.description || 'No description provided.'}
                      </p>
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Nodes: {nodesCount}
                        </span>
                        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Version: v{latestVersion?.version || 1}
                        </span>
                        <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Updated: {new Date(d.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <button
                        onClick={(e) => handleDeleteDesign(d.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: '6px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'color 150ms ease'
                        }}
                        onMouseOver={e => (e.currentTarget.style.color = '#F87171')}
                        onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Delete Workspace"
                      >
                        <Trash2 style={{ width: '16px', height: '16px' }} />
                      </button>
                      <ChevronRight style={{ width: '18px', height: '18px', color: 'var(--text-muted)' }} />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick-Start Templates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <Compass style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
            <h2 className="bricolage" style={{ fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>
              Blueprint Hub
            </h2>
          </div>

          {/* Categories select tab */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: activeCategory === cat ? '1px solid var(--accent-amber)' : '1px solid var(--border)',
                  background: activeCategory === cat ? 'rgba(255,102,0,0.08)' : 'transparent',
                  color: activeCategory === cat ? 'var(--accent-amber)' : 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredTemplates.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '24px 0' }}>
                No blueprints in this category.
              </p>
            ) : (
              filteredTemplates.map(t => (
                <div
                  key={t.id}
                  onClick={() => {
                    setNewTitle(`My ${t.name}`);
                    setSelectedTemplateId(t.id);
                    setShowCreateModal(true);
                  }}
                  style={{
                    padding: '16px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'border-color 150ms ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                  onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
                  onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', fontWeight: 700 }}>
                      {t.name}
                    </h4>
                    <span className="mono" style={{ 
                      fontSize: '9px', 
                      color: t.difficulty === 'advanced' ? '#F87171' : 'var(--accent-blue)',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      {t.difficulty}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {t.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Creation Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(8,11,20,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '14px',
            padding: '32px',
            maxWidth: '440px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            <div>
              <h3 className="bricolage" style={{ fontSize: '20px', color: 'var(--text-primary)', margin: 0, fontWeight: 800 }}>
                {selectedTemplateId ? 'Start from Blueprint' : 'New Custom Canvas'}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                {selectedTemplateId ? 'Initialize your workspace using the pre-seeded topology.' : 'Create a blank canvas to design your next system.'}
              </p>
            </div>

            <form onSubmit={handleCreateDesign} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }} className="mono">
                  WORKSPACE NAME
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rate Limiter Design"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />
              </div>

              {createError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#F87171',
                  background: 'rgba(248,113,113,0.06)',
                  border: '1px solid rgba(248,113,113,0.15)',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  fontSize: '12px'
                }}>
                  <AlertCircle style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                  <span>{createError}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--accent-amber)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {creating && <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />}
                  <span>{creating ? 'Initializing...' : 'Create Workspace'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
