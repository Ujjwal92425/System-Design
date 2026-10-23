'use client';

import { useState } from 'react';
import { RubricBreakdown } from './RubricBreakdown';
import { MissedItems } from './MissedItems';
import { ModelAnswer } from './ModelAnswer';
import { CheckCircle2, Award, ArrowLeft, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface ScorecardProps {
  score: {
    totalScore: number;
    rubricResults: any[];
    missedItems: any[];
    aiFeedback?: string;
  };
  prompt: {
    title: string;
    modelAnswer?: any;
  };
}

export function Scorecard({ score, prompt }: ScorecardProps) {
  const [activeTab, setActiveTab] = useState<'rubric' | 'gaps' | 'model'>('rubric');
  
  const totalWeight = score.rubricResults.reduce((sum, r) => sum + r.weight, 0);
  const scorePct = totalWeight > 0 ? Math.round((score.totalScore / totalWeight) * 100) : 0;

  const getGrade = (pct: number) => {
    if (pct >= 90) return { label: 'L6+ PRINCIPAL ARCHITECT', color: '#10B981' };
    if (pct >= 75) return { label: 'L5 SENIOR ENGINEER', color: '#3B82F6' };
    if (pct >= 50) return { label: 'L4 SYSTEMS ENGINEER', color: '#E8A045' };
    return { label: 'DEGRADED / REDESIGN NEEDED', color: '#EF4444' };
  };

  const grade = getGrade(scorePct);

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '16px',
      padding: '32px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      maxWidth: '600px',
      width: '100%',
      margin: '0 auto',
      boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
    }}>
      {/* Score Header */}
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          background: 'rgba(232, 160, 69, 0.05)',
          border: '2.5px solid var(--accent-amber)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-amber)',
          marginBottom: '8px'
        }}>
          <Award style={{ width: '36px', height: '36px' }} />
        </div>
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.06em' }}>
          INTERVIEW ROUND EVALUATION REPORT
        </span>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: 'var(--text-primary)' }}>
          {prompt.title}
        </h2>
      </div>

      {/* Score Meter */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>SCORE</span>
          <span style={{ fontSize: '28px', fontWeight: 900, color: grade.color }}>
            {scorePct}%
          </span>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {score.totalScore} / {totalWeight} PTS
          </span>
        </div>

        <div style={{ height: '40px', width: '1px', background: 'var(--border)' }} />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>GRADE</span>
          <span style={{ fontSize: '14px', fontWeight: 800, color: grade.color, textAlign: 'center', marginTop: '6px' }}>
            {grade.label}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['rubric', 'gaps', 'model'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="mono"
            style={{
              flex: 1,
              padding: '10px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--accent-amber)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '10px',
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: '-1px'
            }}
          >
            {tab === 'rubric' ? 'CRITERIA' : tab === 'gaps' ? 'RECOMMENDATIONS' : 'SOLUTION'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '160px' }}>
        {activeTab === 'rubric' && <RubricBreakdown results={score.rubricResults} />}
        {activeTab === 'gaps' && <MissedItems missed={score.missedItems} />}
        {activeTab === 'model' && <ModelAnswer answer={prompt.modelAnswer} />}
      </div>

      {/* Action Footer */}
      <div style={{
        display: 'flex',
        gap: '12px',
        borderTop: '1px solid var(--border)',
        paddingTop: '20px',
        marginTop: '8px'
      }}>
        <Link
          href="/interview"
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          <span>Exit Interview</span>
        </Link>

        <button
          onClick={() => window.location.reload()}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'var(--accent-amber)',
            color: '#080B14',
            border: 'none',
            borderRadius: '8px',
            padding: '10px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <RefreshCw style={{ width: '14px', height: '14px' }} />
          <span>Retry Session</span>
        </button>
      </div>
    </div>
  );
}
