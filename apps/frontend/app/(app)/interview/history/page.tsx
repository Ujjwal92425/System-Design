'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { HelpCircle, ArrowLeft, Calendar, Award, Loader2, Play } from 'lucide-react';
import Link from 'next/link';

export default function InterviewHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const res = await api.get('/interview/sessions/history');
        const list = res.data?.data || res.data || [];
        setHistory(list);
      } catch (err: any) {
        setError(err.message || 'Failed to load attempt history');
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px'
    }}>
      {/* Header bar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Link
          href="/interview"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            fontSize: '12px',
            fontWeight: 600,
            textDecoration: 'none'
          }}
        >
          <ArrowLeft style={{ width: '14px', height: '14px' }} />
          <span>Back to Sandbox Selector</span>
        </Link>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)' }}>
            Attempt History
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Review your historical system architecture scorecards and progress.
          </p>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '12px' }}>
          <Loader2 style={{ width: '32px', height: '32px', color: 'var(--accent-amber)', animation: 'spin 1s linear infinite' }} />
          <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RETRIEVING HISTORICAL SCORECARDS...</span>
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
      ) : history.length === 0 ? (
        <div style={{
          border: '1px dashed var(--border)',
          borderRadius: '12px',
          padding: '60px 24px',
          textAlign: 'center',
          color: 'var(--text-muted)'
        }}>
          <Award style={{ width: '36px', height: '36px', margin: '0 auto 16px', opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No interview attempts recorded yet.</p>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>Start your first timed system design mock session to begin tracking scores.</p>
          <Link
            href="/interview"
            style={{
              display: 'inline-block',
              marginTop: '16px',
              background: 'var(--accent-amber)',
              color: '#ffffff',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              textDecoration: 'none'
            }}
          >
            Start Timed Interview
          </Link>
        </div>
      ) : (
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }} className="mono">INTERVIEW SCENARIO</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }} className="mono">DATE STARTED</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }} className="mono">STATUS</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }} className="mono">SCORE</th>
                <th style={{ padding: '16px 20px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }} className="mono">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {history.map((session) => {
                const dateStr = new Date(session.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                const isScored = session.status === 'SCORED';
                const scoreVal = session.score?.totalScore ?? '-';
                
                return (
                  <tr key={session.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 150ms ease' }} className="hover:bg-gray-50">
                    <td style={{ padding: '18px 20px', fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {session.prompt?.title}
                    </td>
                    <td style={{ padding: '18px 20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />
                        <span>{dateStr}</span>
                      </div>
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      <span className="mono" style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isScored ? 'rgba(54, 201, 142, 0.1)' : 'rgba(232, 160, 69, 0.1)',
                        color: isScored ? '#36C98E' : '#E8A045'
                      }}>
                        {session.status}
                      </span>
                    </td>
                    <td style={{ padding: '18px 20px', fontSize: '14px', fontWeight: 800, color: isScored ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
                      {scoreVal} {isScored && '/ 100'}
                    </td>
                    <td style={{ padding: '18px 20px' }}>
                      <Link
                        href={`/interview/${session.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: 'var(--accent-blue)',
                          fontSize: '11px',
                          fontWeight: 700,
                          textDecoration: 'none'
                        }}
                      >
                        {isScored ? (
                          <>
                            <span>View Scorecard</span>
                          </>
                        ) : (
                          <>
                            <Play style={{ width: '10px', height: '10px', fill: 'var(--accent-blue)' }} />
                            <span>Resume Session</span>
                          </>
                        )}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
