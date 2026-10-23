'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, CheckCircle2, PlayCircle, Circle, Clock, Zap } from 'lucide-react';
import type { ModuleWithLessons } from '../../features/learn/useLearn';

const DIFFICULTY_STYLES: Record<string, string> = {
  beginner:     'text-emerald-600 bg-emerald-50 border-emerald-200',
  intermediate: 'text-amber-600 bg-amber-50 border-amber-200',
  advanced:     'text-rose-600 bg-rose-50 border-rose-200',
};

const STATUS_ICON = {
  COMPLETE:     <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
  IN_PROGRESS:  <PlayCircle className="w-4 h-4 text-indigo-500 flex-shrink-0" />,
  NOT_STARTED:  <Circle className="w-4 h-4 text-gray-300 flex-shrink-0" />,
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
      className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors group"
    >
      <div className="flex items-center space-x-3 min-w-0">
        {STATUS_ICON[lesson.status]}
        <span className="text-sm text-gray-600 group-hover:text-gray-900 transition truncate font-medium">
          {lesson.title}
        </span>
      </div>
      <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${diffStyle}`}>
          {lesson.difficulty}
        </span>
        <span className="flex items-center space-x-1 text-[11px] text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{lesson.estimatedMin}m</span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition" />
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
          <div key={mod.id} className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => toggle(mod.id)}
              className="w-full flex items-center justify-between p-5 bg-white hover:bg-gray-50 transition"
            >
              <div className="flex items-center space-x-4 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="text-left min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{mod.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {completedCount}/{totalCount} lessons · {mod.estimatedMin}m
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-500">{pct}%</span>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-2 pt-1 bg-white divide-y divide-gray-100">
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
