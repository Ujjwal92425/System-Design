'use client';

import { useState } from 'react';
import { GitFork } from 'lucide-react';

interface ForkButtonProps {
  blueprintId: string;
  forkCount: number;
  onFork?: (designId: string) => void;
}

export function ForkButton({ blueprintId, forkCount, onFork }: ForkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleFork() {
    if (loading || done) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/community/blueprints/${blueprintId}/fork`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Fork failed');
      const data = await res.json();
      setDone(true);
      onFork?.(data.data.id);
      window.open(`/build/${data.data.id}`, '_blank');
    } catch (err) {
      console.error('Fork failed:', err);
    }
    setLoading(false);
  }

  return (
    <button
      onClick={handleFork}
      disabled={loading || done}
      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
        done
          ? 'bg-green-50 text-green-600 border-green-200'
          : 'bg-white text-gray-600 border-gray-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200'
      } disabled:opacity-50`}
    >
      <GitFork className={`w-3.5 h-3.5 ${done ? 'fill-green-500' : ''}`} />
      {done ? 'Forked!' : `Fork (${forkCount})`}
    </button>
  );
}
