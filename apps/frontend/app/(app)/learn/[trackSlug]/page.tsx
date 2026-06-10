'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Target, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ModuleList } from '../../../../components/learn/ModuleList';
import { useTrack } from '../../../../features/learn/useLearn';

export default function TrackOverviewPage({ params }: { params: Promise<{ trackSlug: string }> }) {
  const { trackSlug } = use(params);
  const { track, loading, error } = useTrack(trackSlug);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="max-w-3xl mx-auto px-8 py-16">
        <div className="flex items-center space-x-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error || 'Track not found'}</p>
        </div>
      </div>
    );
  }

  const pct = Math.round((track.completedPct || 0) * 100);
  const totalLessons = track.modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const completedLessons = track.modules.reduce(
    (sum, m) => sum + m.lessons.filter(l => l.status === 'COMPLETE').length, 0
  );

  return (
    <div className="max-w-5xl mx-auto px-8 py-12 space-y-10">
      {/* Back */}
      <Link href="/learn" className="inline-flex items-center space-x-2 text-sm text-zinc-400 hover:text-zinc-200 transition">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Curriculum</span>
      </Link>

      {/* Hero */}
      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-8 space-y-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Level {track.level}
            </span>
            <h1 className="text-3xl font-black tracking-tight text-zinc-100">{track.name}</h1>
            <p className="text-sm text-zinc-400 max-w-xl leading-relaxed">{track.description}</p>
          </div>
          {pct >= 100 && (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center space-x-6 text-sm text-zinc-400">
          <span className="flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-zinc-500" />
            <span>{track.estimatedHours}h estimated</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <Target className="w-4 h-4 text-zinc-500" />
            <span>{completedLessons}/{totalLessons} lessons complete</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Track Progress</span>
            <span className="text-xs text-indigo-400 font-bold">{pct}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Goals */}
        {track.learningGoals.length > 0 && (
          <div className="pt-4 border-t border-zinc-800">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Learning Goals</p>
            <ul className="space-y-1.5">
              {track.learningGoals.map((goal, i) => (
                <li key={i} className="flex items-start space-x-2 text-sm text-zinc-300">
                  <span className="text-indigo-500 mt-0.5">→</span>
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-zinc-200">Modules</h2>
        <ModuleList modules={track.modules} trackSlug={trackSlug} />
      </div>
    </div>
  );
}
