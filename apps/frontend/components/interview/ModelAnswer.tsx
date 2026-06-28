'use client';

import { CheckCircle } from 'lucide-react';

interface ModelAnswerProps {
  answer: any; // Can be text description or list of components
}

export function ModelAnswer({ answer }: ModelAnswerProps) {
  const modelSteps = Array.isArray(answer) 
    ? answer 
    : typeof answer === 'string'
      ? [answer]
      : ['Configure Client/DNS mapping', 'Introduce API Gateway & Rate Limiter', 'Establish Web Server auto-scaling', 'Implement Write-through Cache (Redis)', 'Configure SQL master-replica database clustering'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <h4 className="mono" style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>
        STANDARD REFERENCE ARCHITECTURE
      </h4>
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          A correct production-grade implementation of this scenario requires the following component hierarchy:
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {modelSteps.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <CheckCircle style={{ width: '14px', height: '14px', color: 'var(--accent-blue)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-primary)' }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
