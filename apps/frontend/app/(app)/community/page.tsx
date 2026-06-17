'use client';

import { useEffect, useState, useCallback } from 'react';
import { BlueprintCard } from '@/components/community/BlueprintCard';
import { BlueprintFilter } from '@/components/community/BlueprintFilter';
import { communityService } from '@/services/community';
import { Loader2, Compass } from 'lucide-react';

interface Blueprint {
  id: string; title: string; description: string; tags: string[];
  voteCount: number; forkCount: number; viewCount: number;
  publishedAt: string; isFeatured: boolean;
  _count: { comments: number };
  author: { id: string; name: string | null; avatarUrl: string | null };
}

interface Pagination {
  page: number; limit: number; total: number; pages: number;
}

export default function CommunityBlueprints() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');

  const fetchBlueprints = useCallback(async (pageNum: number = 1) => {
    setLoading(true);
    try {
      const result = await communityService.listBlueprints({ page: pageNum, limit: 20, sort, search: search || undefined, topic: topic || undefined });
      setBlueprints(result.blueprints);
      setPagination(result.pagination);
    } catch (err) {
      console.error('Fetch failed:', err);
    }
    setLoading(false);
  }, [sort, search, topic]);

  useEffect(() => {
    fetchBlueprints();
  }, [fetchBlueprints]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Compass className="w-6 h-6 text-orange-500" />
            Community Blueprints
          </h1>
          <p className="text-sm text-gray-500 mt-1">Browse and fork architecture templates from the community</p>
        </div>
      </div>

      <BlueprintFilter
        sort={sort} onSortChange={setSort}
        search={search} onSearchChange={setSearch}
        topic={topic} onTopicChange={setTopic}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : blueprints.length === 0 ? (
        <div className="text-center py-20">
          <Compass className="w-12 h-12 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-400">No blueprints found</p>
          <p className="text-sm text-gray-300 mt-1">Be the first to publish your design!</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {blueprints.map((bp) => (
              <BlueprintCard
                key={bp.id}
                id={bp.id}
                title={bp.title}
                description={bp.description}
                tags={bp.tags}
                voteCount={bp.voteCount}
                forkCount={bp.forkCount}
                viewCount={bp.viewCount}
                commentCount={bp._count.comments}
                publishedAt={bp.publishedAt}
                author={bp.author}
                featured={bp.isFeatured}
              />
            ))}
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => fetchBlueprints(p)}
                  className={`w-8 h-8 text-xs font-bold rounded-lg transition-colors ${
                    p === pagination.page
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-gray-500 border border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
