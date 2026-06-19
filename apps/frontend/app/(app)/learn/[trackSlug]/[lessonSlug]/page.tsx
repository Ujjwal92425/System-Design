'use client';

import { use, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck,
  CheckCircle2, Clock, Building2, Tag, Loader2, AlertCircle, LogIn,
} from 'lucide-react';
import { LessonRenderer } from '../../../../../components/learn/LessonRenderer';
import { ProgressBar } from '../../../../../components/learn/ProgressBar';
import { QuizBlock } from '../../../../../components/learn/QuizBlock';
import { useLesson } from '../../../../../features/learn/useLearn';
import { useAuthStore } from '../../../../../features/auth/authStore';
import { Breadcrumbs } from '../../../../../components/seo/Breadcrumb';
import { FaqSchema } from '../../../../../components/seo/FaqSchema';

// ── Public lesson page: no auth required to read. Auth required for progress. ──

export default function LessonPage({
  params,
}: {
  params: Promise<{ trackSlug: string; lessonSlug: string }>;
}) {
  const { trackSlug, lessonSlug } = use(params);
  const { lesson, loading, error, updateState, markComplete, toggleBookmark } = useLesson(lessonSlug);
  const accessToken = useAuthStore(s => s.accessToken);
  const router = useRouter();

  const [completing, setCompleting] = useState(false);
  const scrollPctRef = useRef(0);
  const inProgressFiredRef = useRef(false);

  useEffect(() => {
    if (!lesson) return;
    const saved = lesson.userState.resumeState?.scrollPercent;
    if (!saved || saved < 2) return;

    const restoreTimer = setTimeout(() => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0) {
        window.scrollTo({ top: (saved / 100) * scrollable, behavior: 'instant' });
      }
    }, 200);

    return () => clearTimeout(restoreTimer);
  }, [lesson?.id]);

  const handleScrollProgress = useCallback(
    (pct: number) => {
      scrollPctRef.current = pct;
      if (pct >= 10 && !inProgressFiredRef.current && lesson?.userState.status === 'NOT_STARTED') {
        inProgressFiredRef.current = true;
        updateState('IN_PROGRESS');
      }
    },
    [lesson?.userState.status, updateState]
  );

  useEffect(() => {
    if (!lesson) return;
    const saveScroll = () => {
      if (scrollPctRef.current > 1) {
        const payload = JSON.stringify({
          lessonId: lesson.id,
          resumeState: { scrollPercent: Math.round(scrollPctRef.current) },
        });
        navigator.sendBeacon?.('/api/learn/progress/state', new Blob([payload], { type: 'application/json' }));
      }
    };
    window.addEventListener('beforeunload', saveScroll);
    return () => {
      saveScroll();
      window.removeEventListener('beforeunload', saveScroll);
    };
  }, [lesson?.id, lesson]);

  const handleComplete = async () => {
    // Require auth to mark complete — soft prompt for anonymous users
    if (!accessToken) {
      router.push(`/login?redirect=/learn/${trackSlug}/${lessonSlug}`);
      return;
    }
    setCompleting(true);
    await markComplete();
    setCompleting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16">
        <div className="flex items-center space-x-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error || 'Lesson not found'}</p>
        </div>
      </div>
    );
  }

  const isComplete = lesson.userState.status === 'COMPLETE';
  const isBookmarked = lesson.userState.bookmarked;
  const hasQuiz = lesson.quizzes.length > 0;

  const DIFFICULTY_COLORS: Record<string, string> = {
    beginner:     'text-emerald-600 bg-emerald-50 border-emerald-200',
    intermediate: 'text-amber-600 bg-amber-50 border-amber-200',
    advanced:     'text-rose-600 bg-rose-50 border-rose-200',
  };

  return (
    <>
      <ProgressBar onProgressChange={handleScrollProgress} />

      <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">
        <Breadcrumbs items={[
          { name: 'Curriculum', path: '/learn' },
          { name: lesson.module.track.name, path: `/learn/${trackSlug}` },
          { name: lesson.title, path: '' },
        ]} />

        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-black tracking-tight text-gray-900 leading-tight">
              {lesson.title}
            </h1>
            <button
              onClick={toggleBookmark}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
              className="p-2 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-500 hover:text-yellow-500 transition-colors flex-shrink-0"
            >
              {isBookmarked
                ? <BookmarkCheck className="w-5 h-5 text-yellow-400" />
                : <Bookmark className="w-5 h-5" />}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${DIFFICULTY_COLORS[lesson.difficulty] ?? DIFFICULTY_COLORS.beginner}`}>
              {lesson.difficulty}
            </span>
            <span className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{lesson.estimatedMin} min read</span>
            </span>
            {isComplete && (
              <span className="flex items-center space-x-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" />
                <span>Completed</span>
              </span>
            )}
          </div>

          {lesson.companies.length > 0 && (
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <Building2 className="w-3.5 h-3.5 text-gray-500" />
              {lesson.companies.map(c => (
                <span key={c} className="text-xs text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full capitalize">
                  {c}
                </span>
              ))}
            </div>
          )}

          {lesson.tags.length > 0 && (
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <Tag className="w-3.5 h-3.5 text-gray-500" />
              {lesson.tags.map(t => (
                <span key={t} className="text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200" />

        <div className="min-h-[400px]">
          <LessonRenderer mdxSource={lesson.content} />
        </div>

        {hasQuiz && (
          <FaqSchema
            questions={lesson.quizzes[0].questions.map(q => ({
              question: q.content,
              answer: q.explanation,
            }))}
          />
        )}

        {hasQuiz && (
          <QuizBlock
            quiz={lesson.quizzes[0]}
            onSuccess={() => {
              markComplete();
            }}
          />
        )}

        {!hasQuiz && !isComplete && (
          <div className="border border-indigo-200 bg-indigo-50 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Done reading?</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Mark this lesson as complete to update your track progress.
              </p>
            </div>
            <button
              onClick={handleComplete}
              disabled={completing && !!accessToken}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-2"
            >
              {!accessToken ? (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign in to Complete</span>
                </>
              ) : completing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark Complete</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          {lesson.navigation.prev ? (
            <Link
              href={`/learn/${trackSlug}/${lesson.navigation.prev.slug}`}
              className="flex items-center space-x-3 p-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition group"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500 group-hover:text-gray-700 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Previous</p>
                <p className="text-sm font-semibold text-gray-700 truncate">{lesson.navigation.prev.title}</p>
              </div>
            </Link>
          ) : <div />}

          {lesson.navigation.next ? (
            <Link
              href={`/learn/${trackSlug}/${lesson.navigation.next.slug}`}
              className="flex items-center justify-end space-x-3 p-4 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-xl transition group text-right"
            >
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Next</p>
                <p className="text-sm font-semibold text-gray-700 truncate">{lesson.navigation.next.title}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-gray-700 flex-shrink-0" />
            </Link>
          ) : <div />}
        </div>
      </div>
    </>
  );
}
