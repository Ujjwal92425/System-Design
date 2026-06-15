'use client';

import { api } from '../../lib/api';
import { useState, useEffect, useCallback } from 'react';
import {
  getAllTracks,
  getTrackBySlug,
  getLessonBySlug,
} from '../../data/curriculum/index';

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
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.get(`/learn/tracks/${slug}`)
      .then(res => setTrack(res.data.data))
      .catch(() => {
        // Local curriculum fallback
        setTrack(getTrackBySlug(slug));
      })
      .finally(() => setLoading(false));
  }, [slug]);

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

  useEffect(() => {
    if (!slug) return;
    // Try API first, fall back to local curriculum data
    api.get(`/learn/lessons/${slug}`)
      .then(res => setLesson(res.data.data))
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

  const updateState = useCallback(async (
    status?: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE',
    resumeState?: { scrollPercent: number } | null,
    notes?: string
  ) => {
    if (!lesson) return;
    try {
      await api.post('/learn/progress/state', {
        lessonId: lesson.id,
        ...(status !== undefined ? { status } : {}),
        ...(resumeState !== undefined ? { resumeState } : {}),
        ...(notes !== undefined ? { notes } : {}),
      });
    } catch {
      // Silently fail for local content — progress isn't persisted
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
