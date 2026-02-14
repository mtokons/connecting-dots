import { useParams, Link } from 'react-router-dom';
import { usePost } from '../hooks/useApi';
import CommentSection from '../components/CommentSection';
import { ArrowLeft, Clock, Eye, User, Tag, Share2 } from 'lucide-react';

const categoryLabels = {
  politics: 'রাজনীতি', analysis: 'বিশ্লেষণ', economy: 'অর্থনীতি',
  technology: 'প্রযুক্তি', media: 'মিডিয়া', news: 'সংবাদ', business: 'ব্যবসা'
};

const categoryColors = {
  politics: 'bg-red-500/20 text-red-400',
  analysis: 'bg-blue-500/20 text-blue-400',
  economy: 'bg-green-500/20 text-green-400',
  technology: 'bg-violet-500/20 text-violet-400',
  media: 'bg-orange-500/20 text-orange-400',
  news: 'bg-sky-500/20 text-sky-400',
  business: 'bg-amber-500/20 text-amber-400',
};

export default function PostDetail() {
  const { slug } = useParams();
  const { data: post, loading, error } = usePost(slug);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded w-1/4" />
        <div className="h-64 bg-white/5 rounded-xl" />
        <div className="space-y-3">
          <div className="h-8 bg-white/5 rounded w-3/4" />
          <div className="h-4 bg-white/5 rounded w-full" />
          <div className="h-4 bg-white/5 rounded w-full" />
          <div className="h-4 bg-white/5 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 font-bangla">পোস্ট পাওয়া যায়নি</p>
        <Link to="/news" className="text-sky-400 text-sm mt-2 inline-block">← সংবাদ পাতায় ফিরুন</Link>
      </div>
    );
  }

  let tags = [];
  try { tags = JSON.parse(post.tags || '[]'); } catch (e) { /* ignore */ }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link to="/news" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-sky-400 transition-colors">
        <ArrowLeft size={16} />
        <span className="font-bangla">সংবাদ পাতায় ফিরুন</span>
      </Link>

      {/* Cover Image */}
      {post.cover_image && (
        <div className="relative rounded-xl overflow-hidden">
          <img
            src={post.cover_image}
            alt={post.title}
            className="w-full h-64 md:h-80 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>
      )}

      {/* Article Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${categoryColors[post.category] || 'bg-sky-500/20 text-sky-400'}`}>
            {categoryLabels[post.category] || post.category}
          </span>
          {post.is_featured ? (
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-medium">
              ★ ফিচার্ড
            </span>
          ) : null}
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white font-bangla leading-tight">
          {post.title}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1.5">
            <User size={14} />
            {post.author_name || 'Connecting Dots'}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock size={14} />
            {new Date(post.created_at).toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye size={14} />
            {post.views} ভিউ
          </span>
        </div>
      </div>

      {/* Article Content */}
      <article className="glass-card p-6 md:p-8">
        <div className="prose prose-invert prose-sm max-w-none">
          {post.content.split('\n').map((paragraph, i) => (
            paragraph.trim() ? (
              <p key={i} className="text-slate-300 leading-relaxed font-bangla mb-4">
                {paragraph}
              </p>
            ) : null
          ))}
        </div>
      </article>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag size={14} className="text-slate-500" />
          {tags.map((tag, i) => (
            <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-slate-400">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Share */}
      <div className="glass-card p-4 flex items-center justify-between">
        <span className="text-sm text-slate-400 font-bangla">এই পোস্টটি শেয়ার করুন</span>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg text-sm text-slate-300 hover:bg-white/10 transition-colors"
        >
          <Share2 size={14} />
          লিংক কপি
        </button>
      </div>

      {/* Comments */}
      <CommentSection contentType="post" contentId={post.id} />
    </div>
  );
}
