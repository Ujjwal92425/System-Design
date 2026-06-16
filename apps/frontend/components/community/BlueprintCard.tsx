'use client';

import { useState } from 'react';
import { MessageSquare, Eye, GitFork, Star } from 'lucide-react';
import { VoteButton } from './VoteButton';

interface BlueprintCardProps {
  id: string;
  title: string;
  description: string;
  tags: string[];
  voteCount: number;
  forkCount: number;
  viewCount: number;
  commentCount: number;
  publishedAt: string;
  author: { id: string; name: string | null; avatarUrl: string | null };
  userVote?: number | null;
  featured?: boolean;
}

export function BlueprintCard({
  id, title, description, tags, voteCount, forkCount, viewCount,
  commentCount, publishedAt, author, userVote, featured,
}: BlueprintCardProps) {
  const [currentVotes, setCurrentVotes] = useState(voteCount);

  return (
    <div className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md hover:border-orange-200 ${featured ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-200'}`}>
      <div className="flex gap-4">
        <VoteButton
          blueprintId={id}
          initialVotes={currentVotes}
          initialUserVote={userVote}
          onVoteChange={(v) => setCurrentVotes(v)}
        />

        <div className="flex-1 min-w-0">
          {featured && (
            <div className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mb-1.5 uppercase tracking-wider">
              <Star className="w-3 h-3" /> Featured
            </div>
          )}

          <a href={`/community/${id}`} className="block">
            <h3 className="text-base font-bold text-gray-900 mb-1 hover:text-orange-600 transition-colors truncate">
              {title}
            </h3>
          </a>

          <p className="text-sm text-gray-500 mb-3 line-clamp-2">
            {description}
          </p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="text-[10px] font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="text-[10px] font-mono text-gray-400">+{tags.length - 4}</span>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                {author.avatarUrl ? (
                  <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {(author.name || 'A')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <span className="text-xs text-gray-500 truncate max-w-[120px]">
                {author.name || 'Anonymous'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1" title="Views">
                <Eye className="w-3.5 h-3.5" /> {viewCount}
              </span>
              <span className="flex items-center gap-1" title="Comments">
                <MessageSquare className="w-3.5 h-3.5" /> {commentCount}
              </span>
              <span className="flex items-center gap-1" title="Forks">
                <GitFork className="w-3.5 h-3.5" /> {forkCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
