'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { BlueprintCard } from '@/components/community/BlueprintCard';
import { CommentThread } from '@/components/community/CommentThread';
import { ForkButton } from '@/components/community/ForkButton';
import { VoteButton } from '@/components/community/VoteButton';
import { Loader2, ArrowLeft, User, Calendar, Tag } from 'lucide-react';

interface BlueprintDetail {
  id: string; title: string; description: string; tags: string[];
  voteCount: number; forkCount: number; viewCount: number;
  isPublished: boolean; publishedAt: string; isFeatured: boolean;
  author: { id: string; name: string | null; avatarUrl: string | null };
  design: { id: string; versions: { nodes: any[]; edges: any[] }[] };
  _count: { comments: number; votes: number };
}

interface Comment {
  id: string; content: string; parentId: string | null;
  createdAt: string; deletedAt: string | null;
  user: { id: string; name: string | null; avatarUrl: string | null };
}

export default function BlueprintDetail({ params }: { params: Promise<{ blueprintId: string }> }) {
  const { blueprintId } = use(params);
  const router = useRouter();
  const [blueprint, setBlueprint] = useState<BlueprintDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem('accessToken');
        const [bpRes, commentRes, userRes] = await Promise.all([
          fetch(`/api/community/blueprints/${blueprintId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/community/blueprints/${blueprintId}/comments`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/users/me', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!bpRes.ok) throw new Error('Blueprint not found');
        const bpData = await bpRes.json();
        setBlueprint(bpData.data);
        if (commentRes.ok) {
          const cData = await commentRes.json();
          setComments(cData.data);
        }
        if (userRes.ok) {
          const uData = await userRes.json();
          setCurrentUser(uData.data);
        }
      } catch (err) {
        console.error('Load failed:', err);
      }
      setLoading(false);
    }
    load();
  }, [blueprintId]);

  async function handleAddComment(content: string, parentId?: string) {
    setCommentLoading(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/community/blueprints/${blueprintId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content, parentId }),
      });
      if (!res.ok) throw new Error('Failed to add comment');
      const data = await res.json();
      // Refresh comments
      const cRes = await fetch(`/api/community/blueprints/${blueprintId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cRes.ok) {
        const cData = await cRes.json();
        setComments(cData.data);
      }
    } catch (err) {
      console.error('Comment failed:', err);
    }
    setCommentLoading(false);
  }

  async function handleDeleteComment(commentId: string) {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch(`/api/community/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, deletedAt: new Date().toISOString() } : c));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!blueprint) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <p className="text-gray-500">Blueprint not found</p>
        <a href="/community" className="text-sm text-orange-500 hover:underline mt-2 inline-block">Back to community</a>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <button
        onClick={() => router.push('/community')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to community
      </button>

      <div className="grid grid-cols-[1fr_320px] gap-8">
        {/* Main content */}
        <div>
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4 mb-4">
              <VoteButton
                blueprintId={blueprint.id}
                initialVotes={blueprint.voteCount}
              />
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900 mb-2">{blueprint.title}</h1>
                <p className="text-sm text-gray-600 leading-relaxed mb-4">{blueprint.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {blueprint.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 text-[10px] font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                      <Tag className="w-2.5 h-2.5" /> {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(blueprint.publishedAt).toLocaleDateString()}
                  </span>
                  <span>{blueprint.viewCount.toLocaleString()} views</span>
                  <span>{blueprint.forkCount.toLocaleString()} forks</span>
                </div>
              </div>
            </div>

            {/* Design Preview */}
            {blueprint.design.versions[0] && (
              <div className="border border-gray-100 rounded-lg bg-gray-50 p-4 mb-4">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Design Preview</div>
                <div className="text-xs text-gray-400 font-mono">
                  {blueprint.design.versions[0].nodes?.length || 0} nodes, {blueprint.design.versions[0].edges?.length || 0} connections
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(blueprint.design.versions[0].nodes as any[])?.slice(0, 10).map((n: any) => (
                    <span key={n.id} className="text-[9px] font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500">
                      {n.data?.label || n.type}
                    </span>
                  ))}
                  {(blueprint.design.versions[0].nodes as any[])?.length > 10 && (
                    <span className="text-[9px] text-gray-400">+{blueprint.design.versions[0].nodes.length - 10} more</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            {currentUser && (
              <CommentThread
                comments={comments}
                currentUserId={currentUser.id}
                onAddComment={handleAddComment}
                onDeleteComment={handleDeleteComment}
                loading={commentLoading}
              />
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Author */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Author</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {blueprint.author.avatarUrl ? (
                  <img src={blueprint.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{blueprint.author.name || 'Anonymous'}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Actions</h3>
            <ForkButton
              blueprintId={blueprint.id}
              forkCount={blueprint.forkCount}
            />
            <button
              onClick={() => {
                const token = localStorage.getItem('accessToken');
                fetch(`/api/community/blueprints/${blueprintId}/report`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ reason: 'Inappropriate content' }),
                });
              }}
              className="w-full text-xs text-gray-400 hover:text-red-500 text-center py-2 transition-colors"
            >
              Report this blueprint
            </button>
          </div>

          {/* Stats */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Views', value: blueprint.viewCount },
                { label: 'Votes', value: blueprint._count.votes },
                { label: 'Forks', value: blueprint.forkCount },
                { label: 'Comments', value: blueprint._count.comments },
              ].map((s) => (
                <div key={s.label}>
                  <div className="text-lg font-bold text-gray-900">{s.value.toLocaleString()}</div>
                  <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
