'use client';

import { api } from '../../lib/api';
import { useState, useEffect } from 'react';

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
    api.get('/learn/tracks')
      .then(res => setTracks(res.data.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
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
      .catch(err => setError(err.message))
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
    resumeState: any;
  };
  navigation: {
    prev: { slug: string; title: string } | null;
    next: { slug: string; title: string } | null;
  };
  quizzes: any[];
}

export function useLesson(slug: string) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    api.get(`/learn/lessons/${slug}`)
      .then(res => setLesson(res.data.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug]);

  const markComplete = async () => {
    if (!lesson) return;
    await api.post('/learn/progress/state', { lessonId: lesson.id, status: 'COMPLETE' });
    setLesson(prev => prev ? { ...prev, userState: { ...prev.userState, status: 'COMPLETE' } } : null);
  };

  const toggleBookmark = async () => {
    if (!lesson) return;
    const newVal = !lesson.userState.bookmarked;
    await api.post('/learn/progress/bookmark', { lessonId: lesson.id, bookmarked: newVal });
    setLesson(prev => prev ? { ...prev, userState: { ...prev.userState, bookmarked: newVal } } : null);
  };

  return { lesson, loading, error, markComplete, toggleBookmark };
}
