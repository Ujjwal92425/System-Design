'use client';

import { useState } from 'react';
import { Trash2, Reply, User } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  parentId: string | null;
  createdAt: string;
  deletedAt: string | null;
  user: { id: string; name: string | null; avatarUrl: string | null };
  replies?: Comment[];
}

interface CommentThreadProps {
  comments: Comment[];
  currentUserId: string;
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  loading?: boolean;
}

function CommentItem({ comment, currentUserId, onDelete, onReply, depth }: {
  comment: Comment;
  currentUserId: string;
  onDelete: (id: string) => void;
  onReply: (parentId: string) => void;
  depth: number;
}) {
  const [showReplies, setShowReplies] = useState(depth < 2);

  if (comment.deletedAt) {
    return (
      <div className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-100' : ''} py-2`}>
        <p className="text-xs text-gray-400 italic">[deleted]</p>
      </div>
    );
  }

  return (
    <div className={`${depth > 0 ? 'ml-8 pl-4 border-l-2 border-gray-100' : ''} py-3`}>
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
          {comment.user.avatarUrl ? (
            <img src={comment.user.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-gray-700">{comment.user.name || 'Anonymous'}</span>
            <span className="text-[10px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={() => onReply(comment.id)}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-orange-500 transition-colors"
            >
              <Reply className="w-3 h-3" /> Reply
            </button>
            {comment.user.id === currentUserId && (
              <button
                onClick={() => onDelete(comment.id)}
                className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div>
          {showReplies ? (
            comment.replies.map((reply: Comment) => (
              <CommentItem key={reply.id} comment={reply} currentUserId={currentUserId} onDelete={onDelete} onReply={onReply} depth={depth + 1} />
            ))
          ) : (
            <button
              onClick={() => setShowReplies(true)}
              className="ml-8 text-xs text-orange-500 hover:text-orange-600 mt-1"
            >
              Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CommentThread({ comments, currentUserId, onAddComment, onDeleteComment, loading }: CommentThreadProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Build threaded structure
  const topLevel = comments.filter((c) => !c.parentId);
  const replies = comments.filter((c) => c.parentId);
  const commentsWithReplies = topLevel.map((c) => ({
    ...c,
    replies: replies.filter((r) => r.parentId === c.id),
  }));

  async function handleSubmit() {
    if (!newComment.trim()) return;
    await onAddComment(newComment.trim());
    setNewComment('');
  }

  async function handleReplySubmit() {
    if (!replyText.trim() || !replyTo) return;
    await onAddComment(replyText.trim(), replyTo);
    setReplyText('');
    setReplyTo(null);
  }

  return (
    <div>
      <h3 className="text-sm font-bold text-gray-800 mb-4">Comments ({comments.length})</h3>

      {/* New comment */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows={3}
          className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300"
        />
        <div className="flex justify-end mt-2">
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || loading}
            className="text-xs font-semibold bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Posting...' : 'Post Comment'}
          </button>
        </div>
      </div>

      {/* Reply input */}
      {replyTo && (
        <div className="mb-4 ml-8 pl-4 border-l-2 border-orange-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-orange-500 uppercase tracking-wider">Replying</span>
            <button onClick={() => { setReplyTo(null); setReplyText(''); }} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          <div className="flex justify-end mt-1.5">
            <button
              onClick={handleReplySubmit}
              disabled={!replyText.trim() || loading}
              className="text-[10px] font-semibold bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              Reply
            </button>
          </div>
        </div>
      )}

      {/* Comments */}
      {commentsWithReplies.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No comments yet. Be the first to share your thoughts!</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {commentsWithReplies.map((c) => (
            <CommentItem key={c.id} comment={c} currentUserId={currentUserId} onDelete={onDeleteComment} onReply={(parentId) => setReplyTo(parentId)} depth={0} />
          ))}
        </div>
      )}
    </div>
  );
}
