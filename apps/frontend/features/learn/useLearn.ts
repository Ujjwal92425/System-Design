'use client';

import { api } from '../../lib/api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useProgressStore } from './progressStore';
import { useAuthStore } from '../auth/authStore';

export interface TrackSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  level: number;
  order: number;
  iconUrl?: string;
  estimatedHours?: number;
  learningGoals: string[];
  isPublished: boolean;
  completedPct: number;
}

export interface LessonListItem {
  id: string;
  slug: string;
  title: string;
  order: number;
  estimatedMin: number;
  difficulty: string;
  tags: string[];
  isPublished: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
}

export interface ModuleWithLessons {
  id: string;
  name: string;
  description: string;
  order: number;
  estimatedMin: number;
  lessons: LessonListItem[];
}

export interface TrackDetail extends TrackSummary {
  modules: ModuleWithLessons[];
}

export function useTracks() {
  const [tracks, setTracks] = useState<TrackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/learn/tracks')
      .then(res => {
        if (cancelled) return;
        const data = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setTracks(data);
      })
      .catch(err => { if (!cancelled) setError(err?.message || 'Failed to load tracks'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { tracks, loading, error };
}

export function useTrack(slug: string) {
  const [rawTrack, setRawTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lessonStatuses = useProgressStore((s) => s.lessonStatuses);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api.get(`/learn/tracks/${slug}`)
      .then(res => {
        const data = res.data?.data ?? res.data;
        setRawTrack(data as TrackDetail);
      })
      .catch(err => setError(err?.message || `Track "${slug}" not found`))
      .finally(() => setLoading(false));
  }, [slug]);

  const track = useMemo(() => {
    if (!rawTrack) return null;
    const modules = rawTrack.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({
        ...l,
        status: accessToken ? l.status : (lessonStatuses[l.id]?.status || l.status),
      })),
    }));
    const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
    const completedLessons = modules.reduce(
      (sum, m) => sum + m.lessons.filter((l) => l.status === 'COMPLETE').length,
      0
    );
    return {
      ...rawTrack,
      modules,
      completedPct: totalLessons > 0 ? completedLessons / totalLessons : 0,
    };
  }, [rawTrack, lessonStatuses, accessToken]);

  return { track, loading, error };
}

export interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  content: string | null;
  estimatedMin: number;
  difficulty: string;
  companies: string[];
  tags: string[];
  module: { id: string; name: string; track: { slug: string; name: string } };
  userState: {
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';
    bookmarked: boolean;
    notes: string | null;
    resumeState: { scrollPercent: number } | null;
  };
  navigation: {
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
  };
  quizzes: Array<{
    id: string;
    title: string;
    passingScore: number;
    isRequired: boolean;
    questions: Array<{
      id: string;
      type: string;
      content: string;
      options: string[];
      correctAnswer: string;
      explanation: string;
      order: number;
    }>;
  }>;
  // Premium gating — when true, content will be null and a lockedMessage is returned
  isLocked?: boolean;
  lockedMessage?: string;
}

export function useLesson(slug: string) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lessonStatuses = useProgressStore((s) => s.lessonStatuses);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(null);
    api.get(`/learn/lessons/${slug}`)
      .then(res => {
        const data = res.data?.data ?? res.data;
        setLesson(data as LessonDetail);
      })
      .catch(err => setError(err?.message || `Lesson "${slug}" not found`))
      .finally(() => setLoading(false));
  }, [slug]);

  // Merge persisted progress (status, bookmark, notes, resumeState) from localStorage only if not logged in
  useEffect(() => {
    if (!lesson) return;
    const stored = lessonStatuses[lesson.id];
    if (stored && !accessToken) {
      setLesson(prev => {
        if (!prev) return null;
        const merged = { ...prev.userState };
        if (stored.status) merged.status = stored.status;
        if (stored.bookmarked !== undefined) merged.bookmarked = stored.bookmarked;
        if (stored.notes !== undefined) merged.notes = stored.notes;
        if (stored.resumeState !== undefined) merged.resumeState = stored.resumeState;
        return { ...prev, userState: merged };
      });
    }
  }, [lessonStatuses, lesson?.id, accessToken]);

  const updateState = useCallback(async (
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE',
    resumeState?: { scrollPercent: number } | null,
    notes?: string
  ) => {
    if (!lesson) return;
    const updates: Record<string, any> = {};
    if (status !== undefined) updates.status = status;
    if (resumeState !== undefined) updates.resumeState = resumeState;
    if (notes !== undefined) updates.notes = notes;
    // Persist locally first (works offline, survives refresh)
    useProgressStore.getState().updateLessonProgress(lesson.id, updates);
    // Try API (best effort — local persistence already handled)
    try {
      await api.post('/learn/progress/state', {
        lessonId: lesson.id,
        ...(status !== undefined ? { status } : {}),
        ...(resumeState !== undefined ? { resumeState } : {}),
        ...(notes !== undefined ? { notes } : {}),
      });
    } catch {
      // Silently fail — progress already saved locally
    }
    setLesson(prev => {
      if (!prev) return null;
      return { ...prev, userState: { ...prev.userState, ...updates } as LessonDetail['userState'] };
    });
  }, [lesson]);

  const markComplete = useCallback(() => updateState('COMPLETE'), [updateState]);

  const toggleBookmark = useCallback(async () => {
    if (!lesson) return;
    const newVal = !lesson.userState.bookmarked;
    useProgressStore.getState().updateLessonProgress(lesson.id, { bookmarked: newVal });
    try {
      await api.post('/learn/progress/bookmark', { lessonId: lesson.id, bookmarked: newVal });
    } catch {
      // Silently fail for local content
    }
    setLesson(prev =>
      prev ? { ...prev, userState: { ...prev.userState, bookmarked: newVal } } : null
    );
  }, [lesson]);

  return { lesson, loading, error, updateState, markComplete, toggleBookmark };
}
