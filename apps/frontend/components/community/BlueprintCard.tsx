'use client';

import { useState } from 'react';
import { MessageSquare, Eye, GitFork, Star, Heart } from 'lucide-react';
import { VoteButton } from './VoteButton';

interface BlueprintCardProps {
  id: string;
  title: string;
  description: string;
  tags: string[];
  mediaUrls?: string[];
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
  id, title, description, tags, mediaUrls, voteCount, forkCount, viewCount,
  commentCount, publishedAt, author, userVote, featured,
}: BlueprintCardProps) {
  const [currentVotes, setCurrentVotes] = useState(voteCount);
  const [imgIndex, setImgIndex] = useState(0);
  const images = mediaUrls?.length ? mediaUrls : [];

  return (
    <a
      href={`/community/${id}`}
      className={`block bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md hover:border-orange-200 group ${featured ? 'border-orange-300 ring-1 ring-orange-200' : 'border-gray-200'}`}
    >
      {images.length > 0 && (
        <div className="relative aspect-video bg-gray-100 overflow-hidden">
          <img
            src={images[imgIndex]}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.preventDefault(); setImgIndex(i); }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {featured && (
            <div className="absolute top-2 left-2 inline-flex items-center gap-1 text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              <Star className="w-2.5 h-2.5" /> Featured
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex gap-3">
          <VoteButton
            blueprintId={id}
            initialVotes={currentVotes}
            initialUserVote={userVote}
            onVoteChange={(v) => setCurrentVotes(v)}
          />

          <div className="flex-1 min-w-0">
            {!images.length && featured && (
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mb-1.5 uppercase tracking-wider">
                <Star className="w-3 h-3" /> Featured
              </div>
            )}

            <h3 className="text-sm font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors truncate">
              {title}
            </h3>

            <p className="text-xs text-gray-500 mb-2.5 line-clamp-2">
              {description}
            </p>

            <div className="flex flex-wrap gap-1 mb-2.5">
              {tags.slice(0, 4).map((tag) => (
                <span key={tag} className="text-[9px] font-mono font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                  {tag}
                </span>
              ))}
              {tags.length > 4 && (
                <span className="text-[9px] font-mono text-gray-400">+{tags.length - 4}</span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {author.avatarUrl ? (
                    <img src={author.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-gray-500">
                      {(author.name || 'A')[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-gray-500 truncate max-w-[100px]">
                  {author.name || 'Anonymous'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span className="flex items-center gap-0.5" title="Views">
                  <Eye className="w-3 h-3" /> {viewCount}
                </span>
                <span className="flex items-center gap-0.5" title="Comments">
                  <MessageSquare className="w-3 h-3" /> {commentCount}
                </span>
                <span className="flex items-center gap-0.5" title="Forks">
                  <GitFork className="w-3 h-3" /> {forkCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}
