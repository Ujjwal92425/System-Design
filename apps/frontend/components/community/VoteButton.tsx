'use client';

import { useState } from 'react';
import { ArrowBigUp, ArrowBigDown } from 'lucide-react';

interface VoteButtonProps {
  blueprintId: string;
  initialVotes: number;
  initialUserVote?: number | null;
  onVoteChange?: (netVotes: number) => void;
}

export function VoteButton({ blueprintId, initialVotes, initialUserVote, onVoteChange }: VoteButtonProps) {
  const [userVote, setUserVote] = useState(initialUserVote || 0);
  const [netVotes, setNetVotes] = useState(initialVotes);
  const [loading, setLoading] = useState(false);

  async function handleVote(value: number) {
    if (loading) return;
    setLoading(true);

    const oldVote = userVote;
    const oldNet = netVotes;

    // Optimistic update
    if (userVote === value) {
      setUserVote(0);
      setNetVotes((v) => v - value);
    } else {
      setNetVotes((v) => v - oldVote + value);
      setUserVote(value);
    }

    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/community/blueprints/${blueprintId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ value }),
      });
      if (!res.ok) throw new Error('Vote failed');
      const data = await res.json();
      setNetVotes(data.data.netVotes);
      onVoteChange?.(data.data.netVotes);
    } catch {
      setUserVote(oldVote);
      setNetVotes(oldNet);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        onClick={() => handleVote(1)}
        disabled={loading}
        className={`p-1 rounded transition-colors ${userVote === 1 ? 'text-orange-500 bg-orange-50' : 'text-gray-400 hover:text-orange-400 hover:bg-gray-50'}`}
      >
        <ArrowBigUp className={`w-5 h-5 ${userVote === 1 ? 'fill-orange-500' : ''}`} />
      </button>
      <span className={`text-sm font-bold font-mono ${netVotes > 0 ? 'text-orange-500' : netVotes < 0 ? 'text-red-500' : 'text-gray-500'}`}>
        {netVotes}
      </span>
      <button
        onClick={() => handleVote(-1)}
        disabled={loading}
        className={`p-1 rounded transition-colors ${userVote === -1 ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-400 hover:bg-gray-50'}`}
      >
        <ArrowBigDown className={`w-5 h-5 ${userVote === -1 ? 'fill-red-500' : ''}`} />
      </button>
    </div>
  );
}
