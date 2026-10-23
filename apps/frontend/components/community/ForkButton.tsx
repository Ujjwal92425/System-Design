'use client';

import { useState } from 'react';
import { GitFork } from 'lucide-react';
import { communityService } from '@/api-clients/community';

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
      const design = await communityService.forkBlueprint(blueprintId);
      setDone(true);
      onFork?.(design.id);
      window.open(`/build/${design.id}`, '_blank');
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
