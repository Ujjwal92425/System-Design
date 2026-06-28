'use client';

import { Search } from 'lucide-react';

interface BlueprintFilterProps {
  sort: string;
  onSortChange: (val: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  topic: string;
  onTopicChange: (val: string) => void;
}

const TOPICS = ['All', 'social-media', 'streaming', 'messaging', 'e-commerce', 'ride-sharing', 'url-shortener', 'rate-limiter', 'notification', 'file-storage'];

export function BlueprintFilter({ sort, onSortChange, search, onSearchChange, topic, onTopicChange }: BlueprintFilterProps) {
  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search blueprints..."
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => onTopicChange(t === 'All' ? '' : t)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                (topic === '' && t === 'All') || topic === t
                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-orange-200 hover:text-orange-500'
              }`}
            >
              {t === 'All' ? 'All' : t.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="text-xs font-mono bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 focus:outline-none focus:border-orange-300"
        >
          <option value="newest">Newest</option>
          <option value="top">Top Voted</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>
    </div>
  );
}
