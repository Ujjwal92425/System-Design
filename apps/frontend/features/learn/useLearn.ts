'use client';

import { api } from '../../lib/api';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getAllTracks,
  getTrackBySlug,
  getLessonBySlug,
} from '../../data/curriculum/index';
import { useProgressStore } from './progressStore';

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
    // Try API first, fall back to local curriculum data
    api.get('/learn/tracks')
      .then(res => {
        if (cancelled) return;
        const data = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setTracks(data);
      })
      .catch(() => {
        if (cancelled) return;
        try {
          const local = getAllTracks();
          setTracks(Array.isArray(local) ? local.filter(t => t && t.slug) : []);
        } catch {
          setTracks([]);
        }
      })
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

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/learn/tracks/${slug}`)
      .then(res => setRawTrack(res.data.data))
      .catch(() => {
        // Local curriculum fallback
        setRawTrack(getTrackBySlug(slug));
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const track = useMemo(() => {
    if (!rawTrack) return null;
    const modules = rawTrack.modules.map((m) => ({
      ...m,
      lessons: m.lessons.map((l) => ({
        ...l,
        status: lessonStatuses[l.id]?.status || l.status,
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
  }, [rawTrack, lessonStatuses]);

  return { track, loading, error };
}

export interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  content: string;
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
}

export function useLesson(slug: string) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lessonStatuses = useProgressStore((s) => s.lessonStatuses);

  // Load lesson from API or local curriculum
  useEffect(() => {
    if (!slug) return;
    // Try API first, fall back to local curriculum data
    api.get(`/learn/lessons/${slug}`)
      .then(res => {
        const data = res.data.data as LessonDetail;
        setLesson(data);
      })
      .catch(() => {
        // Local curriculum fallback
        const local = getLessonBySlug(slug);
        if (local) {
          setLesson(local as LessonDetail);
        } else {
          setError(`Lesson "${slug}" not found`);
        }
      })
      .finally(() => setLoading(false));
  }, [slug]);

  // Reactively merge persisted progress from store (handles rehydration race)
  useEffect(() => {
    if (!lesson) return;
    const stored = lessonStatuses[lesson.id];
    if (stored && stored.status !== lesson.userState.status) {
      setLesson(prev => {
        if (!prev) return null;
        return { ...prev, userState: { ...prev.userState, status: stored.status } };
      });
    }
  }, [lessonStatuses, lesson?.id]);

  const updateState = useCallback(async (
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE',
    resumeState?: { scrollPercent: number } | null,
    notes?: string
  ) => {
    if (!lesson) return;
    // Persist locally first (works offline, survives refresh)
    if (status !== undefined) {
      useProgressStore.getState().updateLessonStatus(lesson.id, status);
    }
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
      const next = { ...prev.userState };
      if (status !== undefined) next.status = status;
      if (resumeState !== undefined) next.resumeState = resumeState;
      if (notes !== undefined) next.notes = notes;
      return { ...prev, userState: next };
    });
  }, [lesson]);

  const markComplete = useCallback(() => updateState('COMPLETE'), [updateState]);

  const toggleBookmark = useCallback(async () => {
    if (!lesson) return;
    const newVal = !lesson.userState.bookmarked;
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
