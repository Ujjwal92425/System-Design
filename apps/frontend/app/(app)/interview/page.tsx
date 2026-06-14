'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { PromptCard } from '@/components/interview/PromptCard';
import { PromptFilter } from '@/components/interview/PromptFilter';
import { HelpCircle, History, Sparkles, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function InterviewSelector() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');

  // Fetch prompts on mount
  useEffect(() => {
    async function loadPrompts() {
      try {
        setLoading(true);
        const res = await api.get('/interview/prompts');
        const list = res.data?.data || res.data || [];
        setPrompts(list);
      } catch (err: any) {
        setError(err.message || 'Failed to load interview prompts');
      } finally {
        setLoading(false);
      }
    }
    loadPrompts();
  }, []);

  const handleStartPrompt = async (promptId: string) => {
    try {
      const res = await api.post('/interview/sessions', { promptId });
      const session = res.data?.data || res.data;
      router.push(`/interview/${session.id}`);
    } catch (err: any) {
      alert(err?.response?.data?.message || err.message || 'Failed to start interview session');
    }
  };

  // Filter logic
  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch = search === '' || 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      (p.companies && p.companies.some((co: string) => co.toLowerCase().includes(search.toLowerCase())));
      
    const matchesDiff = difficulty === '' || p.difficulty === difficulty;

    return matchesSearch && matchesDiff;
  });

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px'
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles style={{ width: '20px', height: '20px', color: 'var(--accent-amber)' }} />
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)' }}>
              Timed Interview Sandbox
            </h1>
          </div>
          <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
            Simulate real staff-level system design rounds under strict time constraints.
          </p>
        </div>

        <Link
          href="/interview/history"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px 16px',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none',
            transition: 'background-color 150ms ease'
          }}
          className="hover:bg-gray-100"
        >
          <History style={{ width: '15px', height: '15px' }} />
          <span>My Attempt History</span>
        </Link>
      </div>

      {/* Filter panel */}
      <PromptFilter
        search={search}
        setSearch={setSearch}
        difficulty={difficulty}
        setDifficulty={setDifficulty}
      />

      {/* List content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <Loader2 style={{ width: '32px', height: '32px', color: 'var(--accent-amber)', animation: 'spin 1s linear infinite' }} />
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>LOADING PROMPTS FROM DEPLOYMENT...</span>
        </div>
      ) : error ? (
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          padding: '24px',
          textAlign: 'center',
          color: '#EF4444'
        }}>
          <HelpCircle style={{ width: '32px', height: '32px', margin: '0 auto 12px' }} />
          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>{error}</p>
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: '12px',
          padding: '60px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <HelpCircle style={{ width: '36px', height: '36px', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No interview prompts match your criteria.</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Try adjusting your search queries or difficulty filter.</p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '24px'
        }}>
          {filteredPrompts.map((prompt) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              onStart={handleStartPrompt}
            />
          ))}
        </div>
      )}

      {/* CSS Spin Keyframe */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
