import Link from 'next/link';
import { BookOpen, Clock, ChevronRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { TrackSummary } from '../../features/learn/useLearn';

const LEVEL_COLORS: Record<number, { badge: string; bar: string }> = {
  1: { badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', bar: 'bg-emerald-500' },
  2: { badge: 'bg-sky-500/10 text-sky-400 border-sky-500/20',           bar: 'bg-sky-500' },
  3: { badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',  bar: 'bg-indigo-500' },
  4: { badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20',  bar: 'bg-violet-500' },
  5: { badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',        bar: 'bg-rose-500' },
};

interface TrackCardProps {
  track: TrackSummary;
}

export function TrackCard({ track }: TrackCardProps) {
  const colors = LEVEL_COLORS[track.level] || LEVEL_COLORS[1];
  const pct = Math.round((track.completedPct || 0) * 100);
  const isComplete = pct >= 100;

  return (
    <Link
      href={`/learn/${track.slug}`}
      className="group block bg-zinc-900/30 hover:bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {track.iconUrl ? (
            <img src={track.iconUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </div>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${colors.badge}`}>
            Level {track.level}
          </span>
        </div>
        {isComplete ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300 transition" />
        )}
      </div>

      <h3 className="text-base font-bold text-zinc-100 mb-1 group-hover:text-white transition">{track.name}</h3>
      <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4">{track.description}</p>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Progress</span>
          <span className="text-[10px] text-zinc-400 font-bold">{pct}%</span>
        </div>
        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-zinc-800/50">
        {track.estimatedHours && (
          <span className="flex items-center space-x-1 text-xs text-zinc-500">
            <Clock className="w-3 h-3" />
            <span>{track.estimatedHours}h</span>
          </span>
        )}
        <span className="flex items-center space-x-1 text-xs text-zinc-500">
          <Circle className="w-3 h-3" />
          <span>{track.learningGoals.length} goals</span>
        </span>
      </div>
    </Link>
  );
}
