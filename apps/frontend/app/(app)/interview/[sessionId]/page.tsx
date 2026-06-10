'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Scorecard } from '@/components/interview/Scorecard';
import { HelpCircle, Loader2 } from 'lucide-react';

export default function ActiveInterviewSession({ params }: { params: Promise<{ sessionId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const sessionId = resolvedParams.sessionId;

  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        setLoading(true);
        const res = await api.get(`/interview/sessions/${sessionId}`);
        const data = res.data?.data || res.data;
        setSession(data);

        if (data.status === 'IN_PROGRESS') {
          let designId = data.designId;

          // Create a design canvas if none linked yet
          if (!designId) {
            const createRes = await api.post('/designs', {
              name: `Interview: ${data.prompt.title}`,
              description: `Timed attempt for ${data.prompt.title}`,
              nodes: [],
              edges: []
            });
            const design = createRes.data?.data || createRes.data;
            designId = design.id;

            // Link design to the interview session
            await api.post(`/interview/sessions/${sessionId}/design`, { designId });
          }

          // Redirect to the canvas editor with interview parameters
          router.push(`/build/${designId}?interviewSessionId=${sessionId}`);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [sessionId, router]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '12px' }}>
        <Loader2 style={{ width: '36px', height: '36px', color: 'var(--accent-amber)', animation: 'spin 1s linear infinite' }} />
        <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PREPARING INTERVIEW ROUND...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', gap: '16px' }}>
        <HelpCircle style={{ width: '40px', height: '40px', color: '#EF4444' }} />
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>Error Loading Session</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
      </div>
    );
  }

  // Display scorecard for finished sessions
  if (session?.status === 'SCORED') {
    return (
      <div style={{ padding: '60px 24px', display: 'flex', justifyContent: 'center' }}>
        <Scorecard score={session.score} prompt={session.prompt} />
      </div>
    );
  }

  return null;
}
