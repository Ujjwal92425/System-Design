'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Editor from '@monaco-editor/react';
import { api } from '@/lib/api';
import { 
  ChevronLeft, Save, Loader2, AlertCircle, 
  HelpCircle, Settings, FileText, Code2 
} from 'lucide-react';

interface Track {
  id: string;
  name: string;
  level: number;
}

interface Module {
  id: string;
  name: string;
  trackId: string;
  track?: Track;
}

export default function AdminNewLessonPage() {
  const router = useRouter();

  // Tracks & Modules list for select dropdown
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [estimatedMin, setEstimatedMin] = useState(10);
  const [content, setContent] = useState('## Heading\n\nWrite your lesson MDX content here...');
  const [tagsInput, setTagsInput] = useState('');
  const [companiesInput, setCompaniesInput] = useState('');
  const [isPublished, setIsPublished] = useState(false);

  // Status
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Tracks and Modules
  useEffect(() => {
    setLoadingModules(true);
    api.get('/admin/tracks')
      .then(async (res) => {
        const tracksList = res.data.data || [];
        setTracks(tracksList);

        // Fetch details of each track to collect its modules
        const allModules: Module[] = [];
        for (const t of tracksList) {
          try {
            const detailRes = await api.get(`/admin/tracks/${t.id}`);
            const modulesOfTrack = detailRes.data.data?.modules || [];
            modulesOfTrack.forEach((m: any) => {
              allModules.push({
                ...m,
                track: t
              });
            });
          } catch (e) {
            console.error('Failed to load modules for track:', t.id);
          }
        }
        setModules(allModules);
        if (allModules.length > 0) {
          setSelectedModuleId(allModules[0].id);
        }
      })
      .catch((err) => {
        setError('Failed to load curriculum structures.');
      })
      .finally(() => {
        setLoadingModules(false);
      });
  }, []);

  // Auto-slugify title
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModuleId) {
      setError('Please select a target module.');
      return;
    }

    setSaving(true);
    setError(null);

    const tags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    const companies = companiesInput.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);

    try {
      const payload = {
        moduleId: selectedModuleId,
        slug,
        title,
        content,
        order: 1, // Will default or can be ordered in track list
        estimatedMin,
        difficulty,
        tags,
        companies,
        isPublished
      };

      const res = await api.post('/admin/lessons', payload);
      const newLesson = res.data.data;
      router.push(`/admin/content/lessons/${newLesson.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create lesson');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-base)' }}>
      
      {/* Top Header Controls */}
      <div style={{
        height: '56px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--bg-surface)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/admin/content/lessons" style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            padding: '6px',
            borderRadius: '6px',
            textDecoration: 'none'
          }}>
            <ChevronLeft style={{ width: '20px', height: '20px' }} />
          </Link>
          <h2 className="bricolage" style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: 700, margin: 0 }}>
            Create New Lesson
          </h2>
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || loadingModules}
          style={{
            padding: '8px 16px',
            background: 'var(--accent-amber)',
            color: '#080B14',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {saving ? <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" /> : <Save style={{ width: '14px', height: '14px' }} />}
          <span>{saving ? 'Creating...' : 'Create & Continue'}</span>
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#F87171', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', padding: '12px 24px', flexShrink: 0 }}>
          <AlertCircle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
          <span style={{ fontSize: '13px' }}>{error}</span>
        </div>
      )}

      {/* Main Form + Editor Body split */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side: Metadata Fields */}
        <form onSubmit={handleSubmit} style={{
          width: '360px',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto',
          flexShrink: 0
        }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <Settings style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Lesson Properties
            </span>
          </div>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">LESSON TITLE</label>
            <input
              type="text"
              placeholder="e.g. Load Balancers 101"
              value={title}
              onChange={e => handleTitleChange(e.target.value)}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Slug */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">URL SLUG</label>
            <input
              type="text"
              placeholder="e.g. load-balancers-101"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              required
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Module Select */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">TARGET MODULE</label>
            {loadingModules ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 0' }}>
                <Loader2 style={{ width: '12px', height: '12px', color: 'var(--accent-amber)' }} className="animate-spin" />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Loading modules...</span>
              </div>
            ) : (
              <select
                value={selectedModuleId}
                onChange={e => setSelectedModuleId(e.target.value)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {modules.map(m => (
                  <option key={m.id} value={m.id}>
                    L{m.track?.level} · {m.track?.name} — {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Difficulty & Est Minutes split */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">DIFFICULTY</label>
              <select
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as any)}
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">EST MINUTES</label>
              <input
                type="number"
                min="1"
                max="120"
                value={estimatedMin}
                onChange={e => setEstimatedMin(parseInt(e.target.value) || 10)}
                required
                style={{
                  padding: '8px 10px',
                  borderRadius: '6px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Tags */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">TAGS (COMMA SEPARATED)</label>
            <input
              type="text"
              placeholder="e.g. caching, redis, scaling"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Companies */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '10px', color: 'var(--text-muted)' }} className="mono">COMPANIES (COMMA SEPARATED)</label>
            <input
              type="text"
              placeholder="e.g. google, netflix"
              value={companiesInput}
              onChange={e => setCompaniesInput(e.target.value)}
              style={{
                padding: '8px 10px',
                borderRadius: '6px',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>

          {/* Publish Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
            <input
              type="checkbox"
              id="isPublished"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer',
                accentColor: 'var(--accent-amber)'
              }}
            />
            <label htmlFor="isPublished" style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>
              Publish immediately
            </label>
          </div>

        </form>

        {/* Right Side: Monaco MDX Editor */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#1e1e1e' }}>
          <div style={{
            height: '36px',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            justifyContent: 'space-between'
          }}>
            <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Code2 style={{ width: '12px', height: '12px', color: 'var(--accent-blue)' }} />
              <span>MDX EDITOR (MONACO)</span>
            </span>
          </div>

          <Editor
            height="100%"
            defaultLanguage="markdown"
            theme="vs-dark"
            value={content}
            onChange={(val) => setContent(val || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              lineNumbers: 'on',
              wordWrap: 'on',
              padding: { top: 16 }
            }}
          />
        </div>

      </div>

    </div>
  );
}
