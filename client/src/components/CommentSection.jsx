import { useState, useCallback } from 'react';
import { useComments, usePostComment } from '../hooks/useApi';
import { MessageSquare, Heart, Reply, Send, User, Clock } from 'lucide-react';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'এইমাত্র';
  if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} দিন আগে`;
  return date.toLocaleDateString('bn-BD');
}

function CommentItem({ comment, onReply, onLike }) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyName, setReplyName] = useState('');

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText, replyName || 'Anonymous');
    setReplyText('');
    setReplyName('');
    setShowReplyForm(false);
  };

  return (
    <div className="group">
      <div className="flex gap-3">
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ backgroundColor: comment.avatar_color || '#6366f1' }}
        >
          {(comment.display_name || 'A').charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {comment.display_name || 'Anonymous'}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock size={10} />
              {timeAgo(comment.created_at)}
            </span>
          </div>

          {/* Body */}
          <p className="text-sm text-slate-300 mt-1 whitespace-pre-wrap">{comment.body}</p>

          {/* Actions */}
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={() => onLike(comment.id)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-pink-400 transition-colors"
            >
              <Heart size={12} />
              <span>{comment.likes || 0}</span>
            </button>
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-sky-400 transition-colors"
            >
              <Reply size={12} />
              <span>উত্তর দিন</span>
            </button>
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={replyName}
                onChange={e => setReplyName(e.target.value)}
                placeholder="নাম (ঐচ্ছিক — Anonymous)"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  placeholder="উত্তর লিখুন..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  onKeyDown={e => e.key === 'Enter' && handleReply()}
                />
                <button
                  onClick={handleReply}
                  className="px-3 py-1.5 bg-sky-500/20 text-sky-400 rounded-lg text-sm hover:bg-sky-500/30 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-3 ml-2 pl-4 border-l border-white/10 space-y-3">
              {comment.replies.map(reply => (
                <CommentItem key={reply.id} comment={reply} onReply={onReply} onLike={onLike} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CommentSection({ contentType, contentId }) {
  const { data: comments, loading, refetch } = useComments(contentType, contentId);
  const { postComment, likeComment } = usePostComment();
  const [newComment, setNewComment] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) return;
    await postComment({
      content_type: contentType,
      content_id: contentId,
      body: newComment,
      display_name: displayName || 'Anonymous'
    });
    setNewComment('');
    refetch();
  }, [newComment, displayName, contentType, contentId, postComment, refetch]);

  const handleReply = useCallback(async (parentId, body, name) => {
    await postComment({
      content_type: contentType,
      content_id: contentId,
      parent_id: parentId,
      body,
      display_name: name
    });
    refetch();
  }, [contentType, contentId, postComment, refetch]);

  const handleLike = useCallback(async (commentId) => {
    await likeComment(commentId);
    refetch();
  }, [likeComment, refetch]);

  const commentList = comments || [];

  return (
    <div className="glass-card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="text-sky-400" size={20} />
        <h3 className="text-lg font-bold font-bangla">মন্তব্য</h3>
        <span className="text-xs text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
          {commentList.length}টি
        </span>
      </div>

      {/* New Comment Form */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <User size={12} />
          <span>বেনামে মন্তব্য করুন — নাম দেওয়া ঐচ্ছিক</span>
        </div>
        <input
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="আপনার নাম (ঐচ্ছিক — Anonymous)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors"
        />
        <div className="flex gap-2">
          <textarea
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            placeholder="আপনার মন্তব্য লিখুন..."
            rows={3}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 transition-colors resize-none"
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={!newComment.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-sky-500 to-violet-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send size={14} />
          মন্তব্য পাঠান
        </button>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-slate-500 text-sm">মন্তব্য লোড হচ্ছে...</div>
      ) : commentList.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare size={32} className="text-slate-600 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">এখনও কোনো মন্তব্য নেই। প্রথম মন্তব্য করুন!</p>
        </div>
      ) : (
        <div className="space-y-5">
          {commentList.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onReply={handleReply}
              onLike={handleLike}
            />
          ))}
        </div>
      )}
    </div>
  );
}
