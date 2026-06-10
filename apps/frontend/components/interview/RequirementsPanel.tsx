'use client';

import { BookOpen, Star, ShieldAlert } from 'lucide-react';

interface Prompt {
  title: string;
  description: string;
  difficulty: string;
  requirements: string[];
}

interface RequirementsPanelProps {
  prompt: Prompt;
}

export function RequirementsPanel({ prompt }: RequirementsPanelProps) {
  // Separate functional vs non-functional requirements dynamically if they contain keywords
  const functionalReqs = prompt.requirements.filter(req => 
    !req.toLowerCase().includes('latency') && 
    !req.toLowerCase().includes('qps') && 
    !req.toLowerCase().includes('availability') && 
    !req.toLowerCase().includes('sla')
  );

  const nonFunctionalReqs = prompt.requirements.filter(req => 
    req.toLowerCase().includes('latency') || 
    req.toLowerCase().includes('qps') || 
    req.toLowerCase().includes('availability') || 
    req.toLowerCase().includes('sla')
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Description header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen style={{ width: '16px', height: '16px', color: 'var(--accent-amber)' }} />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase' }}>
            System Description
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {prompt.description}
        </p>
      </div>

      {/* Functional Requirements */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Star style={{ width: '15px', height: '15px', color: '#36C98E' }} />
          <h4 className="mono" style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            FUNCTIONAL REQUIREMENTS
          </h4>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {functionalReqs.map((req, i) => (
            <li key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {req}
            </li>
          ))}
          {functionalReqs.length === 0 && (
            <li style={{ fontSize: '11px', color: 'var(--text-muted)', listStyle: 'none' }}>
              No specific functional requirements listed.
            </li>
          )}
        </ul>
      </div>

      {/* Non-Functional Requirements */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert style={{ width: '15px', height: '15px', color: 'var(--accent-blue)' }} />
          <h4 className="mono" style={{ margin: 0, fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            NON-FUNCTIONAL SPECS / SLA
          </h4>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {nonFunctionalReqs.map((req, i) => (
            <li key={i} style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              {req}
            </li>
          ))}
          {nonFunctionalReqs.length === 0 && (
            <li style={{ fontSize: '11px', color: 'var(--text-muted)', listStyle: 'none' }}>
              No specific non-functional constraints specified.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
