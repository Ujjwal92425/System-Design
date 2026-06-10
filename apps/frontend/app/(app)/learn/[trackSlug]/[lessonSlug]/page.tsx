'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck,
  CheckCircle2, Clock, Building2, Tag, Loader2, AlertCircle
} from 'lucide-react';
import { LessonRenderer } from '../../../../../components/learn/LessonRenderer';
import { useLesson } from '../../../../../features/learn/useLearn';

export default function LessonPage({ params }: { params: Promise<{ trackSlug: string; lessonSlug: string }> }) {
  const { trackSlug, lessonSlug } = use(params);
  const { lesson, loading, error, markComplete, toggleBookmark } = useLesson(lessonSlug);
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
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

  const DIFFICULTY_COLORS: Record<string, string> = {
    beginner:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    advanced:     'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-8">
      {/* Breadcrumb nav */}
      <nav className="flex items-center space-x-2 text-xs text-zinc-500">
        <Link href="/learn" className="hover:text-zinc-300 transition">Curriculum</Link>
        <span>/</span>
        <Link href={`/learn/${trackSlug}`} className="hover:text-zinc-300 transition">
          {lesson.module.track.name}
        </Link>
        <span>/</span>
        <span className="text-zinc-300">{lesson.title}</span>
      </nav>

      {/* Lesson header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-black tracking-tight text-zinc-100 leading-tight">{lesson.title}</h1>
          <button
            onClick={toggleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark lesson'}
            className="p-2 rounded-xl border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-yellow-400 transition-colors flex-shrink-0"
          >
            {isBookmarked ? <BookmarkCheck className="w-5 h-5 text-yellow-400" /> : <Bookmark className="w-5 h-5" />}
          </button>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${DIFFICULTY_COLORS[lesson.difficulty] || DIFFICULTY_COLORS.beginner}`}>
            {lesson.difficulty}
          </span>
          <span className="flex items-center space-x-1 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>{lesson.estimatedMin} min read</span>
          </span>
          {isComplete && (
            <span className="flex items-center space-x-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" />
              <span>Completed</span>
            </span>
          )}
        </div>

        {/* Companies + tags */}
        {lesson.companies.length > 0 && (
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <Building2 className="w-3.5 h-3.5 text-zinc-500" />
            {lesson.companies.map(c => (
              <span key={c} className="text-xs text-zinc-400 bg-zinc-800/60 border border-zinc-700/50 px-2 py-0.5 rounded-full capitalize">
                {c}
              </span>
            ))}
          </div>
        )}
        {lesson.tags.length > 0 && (
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <Tag className="w-3.5 h-3.5 text-zinc-500" />
            {lesson.tags.map(t => (
              <span key={t} className="text-xs text-indigo-400/80 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded-full">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-zinc-800" />

      {/* Lesson Content */}
      <div className="min-h-[400px]">
        <LessonRenderer mdxSource={lesson.content} />
      </div>

      {/* Complete CTA */}
      {!isComplete && (
        <div className="border border-indigo-500/20 bg-indigo-500/5 rounded-2xl p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-200">Done reading?</p>
            <p className="text-xs text-zinc-400 mt-0.5">Mark this lesson as complete to update your track progress.</p>
          </div>
          <button
            onClick={handleComplete}
            disabled={completing}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-xl text-sm font-semibold transition flex items-center space-x-2"
          >
            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Mark Complete</span>
          </button>
        </div>
      )}

      {/* Prev / Next navigation */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
        {lesson.navigation.prev ? (
          <Link
            href={`/learn/${trackSlug}/${lesson.navigation.prev.slug}`}
            className="flex items-center space-x-3 p-4 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 rounded-xl transition group"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Previous</p>
              <p className="text-sm font-semibold text-zinc-300 truncate">{lesson.navigation.prev.title}</p>
            </div>
          </Link>
        ) : <div />}

        {lesson.navigation.next ? (
          <Link
            href={`/learn/${trackSlug}/${lesson.navigation.next.slug}`}
            className="flex items-center justify-end space-x-3 p-4 bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 rounded-xl transition group text-right"
          >
            <div className="min-w-0">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Next</p>
              <p className="text-sm font-semibold text-zinc-300 truncate">{lesson.navigation.next.title}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 flex-shrink-0" />
          </Link>
        ) : <div />}
      </div>
    </div>
  );
}
