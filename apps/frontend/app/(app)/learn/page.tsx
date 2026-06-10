'use client';

import { BookOpen, Search, Loader2, AlertCircle } from 'lucide-react';
import { TrackCard } from '../../../components/learn/TrackCard';
import { useTracks } from '../../../features/learn/useLearn';
import { useState } from 'react';

export default function LearnCurriculumPage() {
  const { tracks, loading, error } = useTracks();
  const [search, setSearch] = useState('');

  const filtered = tracks.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto px-8 py-12 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border border-indigo-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-zinc-100">Learn Curriculum</h1>
            <p className="text-sm text-zinc-400">Five levels from DNS fundamentals to horizontal database partitioning.</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search tracks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
        />
      </div>

      {/* States */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {error && (
        <div className="flex items-center space-x-3 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {filtered.length === 0 ? (
            <div className="text-center py-24 text-zinc-500 text-sm">
              No tracks match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(track => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
