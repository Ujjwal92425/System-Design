import Link from 'next/link';
import { BookOpen, Clock, ChevronRight, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import type { TrackSummary } from '../../features/learn/useLearn';

const LEVEL_COLORS: Record<number, { badge: string; bar: string }> = {
  1: { badge: 'bg-emerald-50 text-emerald-600 border-emerald-200', bar: 'bg-emerald-500' },
  2: { badge: 'bg-sky-50 text-sky-600 border-sky-200',           bar: 'bg-sky-500' },
  3: { badge: 'bg-indigo-50 text-indigo-600 border-indigo-200',  bar: 'bg-indigo-500' },
  4: { badge: 'bg-violet-50 text-violet-600 border-violet-200',  bar: 'bg-violet-500' },
  5: { badge: 'bg-rose-50 text-rose-600 border-rose-200',        bar: 'bg-rose-500' },
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
      className="group block bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {track.iconUrl ? (
            <img src={track.iconUrl} alt="" className="w-10 h-10 rounded-xl object-cover" />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-indigo-600" />
            </div>
          )}
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${colors.badge}`}>
            Level {track.level}
          </span>
        </div>
        {isComplete ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-700 transition" />
        )}
      </div>

      <h3 className="text-base font-bold text-gray-900 mb-1 group-hover:text-gray-900 transition">{track.name}</h3>
      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">{track.description}</p>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Progress</span>
          <span className="text-[10px] text-gray-500 font-bold">{pct}%</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${colors.bar}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Footer meta */}
      <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-200">
        {track.estimatedHours && (
          <span className="flex items-center space-x-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{track.estimatedHours}h</span>
          </span>
        )}
        <span className="flex items-center space-x-1 text-xs text-gray-500">
          <Circle className="w-3 h-3" />
          <span>{track.learningGoals.length} goals</span>
        </span>
      </div>
    </Link>
  );
}
