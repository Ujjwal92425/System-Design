'use client';

import { Clock, Building, ArrowRight } from 'lucide-react';

interface Prompt {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  companies: string[];
  tags: string[];
  timeLimitMin: number;
}

interface PromptCardProps {
  prompt: Prompt;
  onStart: (id: string) => void;
}

export function PromptCard({ prompt, onStart }: PromptCardProps) {
  const getDiffColor = (d: string) => {
    switch (d) {
      case 'EASY': return { bg: 'rgba(54, 201, 142, 0.1)', text: '#36C98E' };
      case 'MEDIUM': return { bg: 'rgba(232, 160, 69, 0.1)', text: '#E8A045' };
      case 'HARD': return { bg: 'rgba(248, 113, 113, 0.1)', text: '#F87171' };
      default: return { bg: 'rgba(255,255,255,0.05)', text: '#94A3B8' };
    }
  };

  const diffStyle = getDiffColor(prompt.difficulty);

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      transition: 'transform 200ms ease, border-color 200ms ease',
      cursor: 'default'
    }}
    className="hover:border-zinc-700"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
          {prompt.title}
        </h3>
        <span className="mono" style={{
          fontSize: '9px',
          fontWeight: 700,
          padding: '4px 8px',
          borderRadius: '4px',
          background: diffStyle.bg,
          color: diffStyle.text,
          letterSpacing: '0.04em'
        }}>
          {prompt.difficulty}
        </span>
      </div>

      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1 }}>
        {prompt.description}
      </p>

      {/* Target Companies */}
      {prompt.companies && prompt.companies.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <Building style={{ width: '13px', height: '13px', color: 'var(--text-muted)', flexShrink: 0 }} />
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {prompt.companies.map((co, i) => (
              <span key={i} style={{
                fontSize: '10px',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                padding: '2px 6px',
                borderRadius: '4px'
              }}>
                {co}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Meta Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTop: '1px solid var(--border)',
        paddingTop: '16px',
        marginTop: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
          <Clock style={{ width: '14px', height: '14px' }} />
          <span className="mono" style={{ fontSize: '11px', fontWeight: 600 }}>{prompt.timeLimitMin} MIN LIMIT</span>
        </div>

        <button
          onClick={() => onStart(prompt.id)}
          style={{
            background: 'var(--accent-amber)',
            color: '#080B14',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 14px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'background-color 150ms ease'
          }}
          className="hover:opacity-90"
        >
          <span>Start Attempt</span>
          <ArrowRight style={{ width: '12px', height: '12px' }} />
        </button>
      </div>
    </div>
  );
}
