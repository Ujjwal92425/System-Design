'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { CommentThread } from '@/components/community/CommentThread';
import { ForkButton } from '@/components/community/ForkButton';
import { VoteButton } from '@/components/community/VoteButton';
import { communityService } from '@/api-clients/community';
import {
  Loader2, ArrowLeft, User, Calendar, Tag, Heart, Share2, Bookmark,
  Eye, GitFork, MessageSquare, Monitor, Server, Database, Zap, Globe, Shield
} from 'lucide-react';

const TYPE_ICONS: Record<string, any> = {
  LOAD_BALANCER: Shield, CDN: Globe, CACHE: Zap,
  DATABASE_SQL: Database, DATABASE_NOSQL: Database,
  WEB_SERVER: Server, CLIENT: Monitor, API_GATEWAY: Shield,
};

interface BlueprintDetail {
  id: string; title: string; description: string; tags: string[];
  mediaUrls?: string[];
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
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [bp, commentList] = await Promise.all([
          communityService.getBlueprint(blueprintId),
          communityService.listComments(blueprintId),
        ]);
        setBlueprint(bp);
        setComments(commentList);
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
      const newComment = await communityService.createComment(blueprintId, { content, parentId });
      setComments((prev) => [...prev, newComment]);
      setBlueprint((bp) => bp ? { ...bp, _count: { ...bp._count, comments: bp._count.comments + 1 } } : bp);
    } catch (err) {
      console.error('Comment failed:', err);
    }
    setCommentLoading(false);
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await communityService.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setBlueprint((bp) => bp ? { ...bp, _count: { ...bp._count, comments: Math.max(0, bp._count.comments - 1) } } : bp);
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

  const nodes = blueprint.design.versions[0]?.nodes || [];
  const edges = blueprint.design.versions[0]?.edges || [];
  const images = blueprint.mediaUrls?.length ? blueprint.mediaUrls : [];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={() => router.push('/community')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-orange-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{blueprint.viewCount.toLocaleString()} views</span>
          <span className="text-xs text-gray-300">&middot;</span>
          <span className="text-xs text-gray-400">{blueprint._count.votes} votes</span>
        </div>
      </div>

      {/* Split panes */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Canvas Preview */}
        <div className="flex-1 min-w-0 bg-gray-50 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Image gallery */}
            {images.length > 0 && (
              <div className="relative aspect-video bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
                <img
                  src={images[imgIndex]}
                  alt={blueprint.title}
                  className="w-full h-full object-contain"
                />
                {images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setImgIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === imgIndex ? 'bg-orange-500' : 'bg-gray-300'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Architecture nodes visual */}
            {nodes.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Architecture</h3>
                <div className="flex flex-wrap gap-3">
                  {nodes.slice(0, 16).map((n: any) => {
                    const type = n.data?.nodeType || n.type || 'NODE';
                    const label = n.data?.label || type;
                    const Icon = TYPE_ICONS[type] || Monitor;
                    return (
                      <div key={n.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                        <Icon className="w-3.5 h-3.5 text-gray-500" />
                        <span className="text-[11px] font-mono text-gray-700 truncate max-w-[120px]">{label}</span>
                      </div>
                    );
                  })}
                  {nodes.length > 16 && (
                    <div className="flex items-center text-[11px] text-gray-400 font-mono px-3">
                      +{nodes.length - 16} more
                    </div>
                  )}
                </div>
                <div className="mt-3 text-[11px] text-gray-400 font-mono">
                  {nodes.length} nodes &middot; {edges.length} connections
                </div>
              </div>
            )}

            {/* Title & description */}
            <div className="mt-6">
              <h1 className="text-xl font-bold text-gray-900 mb-2">{blueprint.title}</h1>
              <p className="text-sm text-gray-600 leading-relaxed">{blueprint.description}</p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mt-4">
              {blueprint.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[10px] font-mono font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                  <Tag className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Social Sidebar */}
        <div className="w-96 border-l border-gray-200 bg-white flex flex-col flex-shrink-0">
          {/* Author */}
          <div className="p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                {blueprint.author.avatarUrl ? (
                  <img src={blueprint.author.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{blueprint.author.name || 'Anonymous'}</p>
                <p className="text-[11px] text-gray-400">
                  {new Date(blueprint.publishedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Engagement bar */}
          <div className="flex items-center gap-1 px-5 py-3 border-b border-gray-100">
            <VoteButton blueprintId={blueprint.id} initialVotes={blueprint.voteCount} />
            <div className="flex items-center gap-1 ml-4">
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 px-2 py-1.5 rounded-lg hover:bg-orange-50 transition-colors"
                title="Share"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
            <div className="flex items-center gap-1">
              <ForkButton blueprintId={blueprint.id} forkCount={blueprint.forkCount} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-0 border-b border-gray-100">
            {[
              { icon: Eye, label: 'Views', value: blueprint.viewCount },
              { icon: Heart, label: 'Votes', value: blueprint._count.votes },
              { icon: GitFork, label: 'Forks', value: blueprint.forkCount },
              { icon: MessageSquare, label: 'Comments', value: blueprint._count.comments },
            ].map((s) => (
              <div key={s.label} className="text-center py-3 border-r border-gray-100 last:border-r-0">
                <s.icon className="w-3.5 h-3.5 text-gray-400 mx-auto mb-0.5" />
                <div className="text-sm font-bold text-gray-900">{s.value.toLocaleString()}</div>
                <div className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Comments */}
          <div className="flex-1 overflow-y-auto p-5">
            <CommentThread
              comments={comments}
              currentUserId=""
              onAddComment={handleAddComment}
              onDeleteComment={handleDeleteComment}
              loading={commentLoading}
            />
          </div>

          {/* Report */}
          <div className="p-3 border-t border-gray-100 text-center flex-shrink-0">
            <button
              onClick={() => {
                const reason = prompt('Reason for reporting:');
                if (reason) communityService.reportBlueprint(blueprintId, reason);
              }}
              className="text-[10px] text-gray-400 hover:text-red-500 transition-colors"
            >
              Report this blueprint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
