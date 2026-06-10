'use client';

import { Search } from 'lucide-react';

interface PromptFilterProps {
  search: string;
  setSearch: (s: string) => void;
  difficulty: string;
  setDifficulty: (d: string) => void;
}

export function PromptFilter({ search, setSearch, difficulty, setDifficulty }: PromptFilterProps) {
  const difficulties = [
    { label: 'All Difficulties', value: '' },
    { label: 'Easy', value: 'EASY' },
    { label: 'Medium', value: 'MEDIUM' },
    { label: 'Hard', value: 'HARD' }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap',
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      padding: '12px 16px',
      borderRadius: '8px'
    }}>
      {/* Search Input */}
      <div style={{
        position: 'relative',
        flex: 1,
        minWidth: '200px'
      }}>
        <Search style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '14px',
          height: '14px',
          color: 'var(--text-muted)'
        }} />
        <input
          type="text"
          placeholder="Search prompts by title, description or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            padding: '8px 10px 8px 32px',
            fontSize: '12px',
            color: 'var(--text-primary)',
            outline: 'none'
          }}
        />
      </div>

      {/* Difficulty Filter */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {difficulties.map((diff) => (
          <button
            key={diff.value}
            onClick={() => setDifficulty(diff.value)}
            className="mono"
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: difficulty === diff.value ? '1px solid var(--accent-amber)' : '1px solid var(--border)',
              background: difficulty === diff.value ? 'rgba(232, 160, 69, 0.05)' : 'var(--bg-surface)',
              color: difficulty === diff.value ? 'var(--accent-amber)' : 'var(--text-secondary)',
              fontSize: '10px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease'
            }}
          >
            {diff.label.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
