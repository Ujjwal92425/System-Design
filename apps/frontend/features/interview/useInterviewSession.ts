import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';

export interface Prompt {
  id: string;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  companies: string[];
  requirements: string[];
  timeLimitMin: number;
  rubric: any;
  hints: string[];
}

export interface InterviewSession {
  id: string;
  userId: string;
  promptId: string;
  designId?: string;
  status: 'IN_PROGRESS' | 'SCORED' | 'EXPIRED';
  startedAt: string;
  endedAt?: string;
  hintsUsed: number;
  timeLimit: number; // in minutes
  prompt: Prompt;
  score?: any;
}

export function useInterviewSession(sessionId?: string) {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [isTimerStarted, setIsTimerStarted] = useState<boolean>(false);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch Session
  const fetchSession = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/interview/sessions/${id}`);
      const data = res.data?.data || res.data;
      setSession(data);
      
      // Calculate remaining time
      const startTime = new Date(data.startedAt).getTime();
      const limitMs = data.timeLimit * 60 * 1000;
      const elapsedMs = Date.now() - startTime;
      const remainingSec = Math.max(0, Math.floor((limitMs - elapsedMs) / 1000));
      
      setTimeLeft(remainingSec);
      if (data.status === 'IN_PROGRESS' && remainingSec > 0) {
        setIsTimerStarted(true);
        setIsTimerRunning(true);
      } else {
        setIsTimerRunning(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to fetch session');
    } finally {
      setLoading(false);
    }
  }, []);

  // Start Session
  const startSession = useCallback(async (promptId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.post('/interview/sessions', { promptId });
      const data = res.data?.data || res.data;
      setSession(data);
      setTimeLeft(data.timeLimit * 60);
      setIsTimerStarted(true);
      setIsTimerRunning(true);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to start interview');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Request Hint
  const requestHint = useCallback(async () => {
    if (!session) return;
    try {
      const res = await api.post(`/interview/sessions/${session.id}/hint`);
      const updated = res.data?.data || res.data;
      setSession(prev => prev ? { ...prev, hintsUsed: updated.hintsUsed } : null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to use hint');
    }
  }, [session]);

  // Link Canvas Design
  const linkDesign = useCallback(async (designId: string) => {
    if (!session) return;
    try {
      const res = await api.post(`/interview/sessions/${session.id}/design`, { designId });
      const updated = res.data?.data || res.data;
      setSession(prev => prev ? { ...prev, designId: updated.designId } : null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to link design');
    }
  }, [session]);

  // Submit Session Design
  const submitDesign = useCallback(async (design: any) => {
    if (!session) return;
    try {
      setLoading(true);
      setIsTimerRunning(false);
      const res = await api.post(`/interview/sessions/${session.id}/submit`, { design });
      const data = res.data?.data || res.data;
      setSession(prev => prev ? { ...prev, status: 'SCORED', score: data.score } : null);
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to submit design');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [session]);

  // Timer Countdown loop
  useEffect(() => {
    if (isTimerRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsTimerRunning(false);
            if (session) {
              setSession(s => s ? { ...s, status: 'EXPIRED' } : null);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning, timeLeft, session]);

  // Fetch session on load if id provided
  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId);
    }
  }, [sessionId, fetchSession]);

  const toggleTimer = useCallback(() => {
    setIsTimerRunning(prev => !prev);
  }, []);

  return {
    session,
    loading,
    error,
    timeLeft,
    isTimerRunning,
    isTimerStarted,
    startSession,
    fetchSession,
    requestHint,
    linkDesign,
    submitDesign,
    toggleTimer,
    startTimer: () => setIsTimerRunning(true)
  };
}
