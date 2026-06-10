'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, CheckCircle2, PlayCircle, Circle, Clock, Zap } from 'lucide-react';
import type { ModuleWithLessons } from '../../features/learn/useLearn';

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner:     'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  advanced:     'text-rose-400 bg-rose-500/10 border-rose-500/20',
};

const STATUS_ICON = {
  COMPLETE:     <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
  IN_PROGRESS:  <PlayCircle className="w-4 h-4 text-indigo-400 flex-shrink-0" />,
  NOT_STARTED:  <Circle className="w-4 h-4 text-zinc-600 flex-shrink-0" />,
};

interface LessonListItemProps {
  lesson: ModuleWithLessons['lessons'][number];
  trackSlug: string;
}

function LessonListItemRow({ lesson, trackSlug }: LessonListItemProps) {
  const diffStyle = DIFFICULTY_STYLES[lesson.difficulty] || DIFFICULTY_STYLES.beginner;

  return (
    <Link
      href={`/learn/${trackSlug}/${lesson.slug}`}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-zinc-800/40 transition-colors group"
    >
      <div className="flex items-center space-x-3 min-w-0">
        {STATUS_ICON[lesson.status]}
        <span className="text-sm text-zinc-300 group-hover:text-white transition truncate font-medium">
          {lesson.title}
        </span>
      </div>
      <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${diffStyle}`}>
          {lesson.difficulty}
        </span>
        <span className="flex items-center space-x-1 text-[11px] text-zinc-500">
          <Clock className="w-3 h-3" />
          <span>{lesson.estimatedMin}m</span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400 transition" />
      </div>
    </Link>
  );
}

interface ModuleListProps {
  modules: ModuleWithLessons[];
  trackSlug: string;
}

export function ModuleList({ modules, trackSlug }: ModuleListProps) {
  const [openModules, setOpenModules] = useState<Set<string>>(
    new Set(modules.slice(0, 1).map(m => m.id))
  );

  const toggle = (id: string) => {
    setOpenModules(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {modules.map((mod, idx) => {
        const isOpen = openModules.has(mod.id);
        const completedCount = mod.lessons.filter(l => l.status === 'COMPLETE').length;
        const totalCount = mod.lessons.length;
        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return (
          <div key={mod.id} className="border border-zinc-800/60 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(mod.id)}
              className="w-full flex items-center justify-between p-5 bg-zinc-900/20 hover:bg-zinc-900/50 transition"
            >
              <div className="flex items-center space-x-4 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-zinc-100">{mod.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {completedCount}/{totalCount} lessons · {mod.estimatedMin}m
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-zinc-500">{pct}%</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-2 pt-1 bg-zinc-950/20 divide-y divide-zinc-800/30">
                {mod.lessons.map(lesson => (
                  <LessonListItemRow key={lesson.id} lesson={lesson} trackSlug={trackSlug} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
