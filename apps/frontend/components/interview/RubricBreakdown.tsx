'use client';

import { CheckCircle2, XCircle } from 'lucide-react';

interface RubricItem {
  id: string;
  name: string;
  weight: number;
  passed: boolean;
  score: number;
}

interface RubricBreakdownProps {
  results: RubricItem[];
}

export function RubricBreakdown({ results }: RubricBreakdownProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <h4 className="mono" style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
        EVALUATION CRITERIA BREAKDOWN
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {results.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '10px 14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {item.passed ? (
                <CheckCircle2 style={{ width: '16px', height: '16px', color: '#36C98E' }} />
              ) : (
                <XCircle style={{ width: '16px', height: '16px', color: '#F87171' }} />
              )}
              <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
                {item.name}
              </span>
            </div>
            <span className="mono" style={{
              fontSize: '11px',
              fontWeight: 700,
              color: item.passed ? '#36C98E' : 'var(--text-muted)'
            }}>
              {item.score} / {item.weight} PTS
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
