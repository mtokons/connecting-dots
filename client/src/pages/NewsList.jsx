import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts, useCategories } from '../hooks/useApi';
import { Newspaper, Eye, Clock, MessageSquare, Filter, ChevronRight } from 'lucide-react';

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'এইমাত্র';
  if (diff < 3600) return `${Math.floor(diff / 60)} মিনিট আগে`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ঘণ্টা আগে`;
  return `${Math.floor(diff / 86400)} দিন আগে`;
}

const categoryLabels = {
  politics: 'রাজনীতি', analysis: 'বিশ্লেষণ', economy: 'অর্থনীতি',
  technology: 'প্রযুক্তি', media: 'মিডিয়া', news: 'সংবাদ', business: 'ব্যবসা'
};

const categoryColors = {
  politics: 'bg-red-500/20 text-red-400 border-red-500/30',
  analysis: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  economy: 'bg-green-500/20 text-green-400 border-green-500/30',
  technology: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  media: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  news: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  business: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

export default function NewsList() {
  const [activeCategory, setActiveCategory] = useState('');
  const params = activeCategory ? { category: activeCategory, limit: 50 } : { limit: 50 };
  const { data: posts, loading } = usePosts(params);
  const { data: categories } = useCategories();

  const postList = posts || [];
  const catList = categories || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3 font-bangla">
          <Newspaper className="text-sky-400" />
          সংবাদ ও নিবন্ধ
        </h1>
        <p className="text-sm text-slate-400 mt-1 font-bangla">
          বাংলাদেশ ও বিশ্বের সর্বশেষ সংবাদ, বিশ্লেষণ ও মতামত
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveCategory('')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
            !activeCategory 
              ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' 
              : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
          }`}
        >
          সব
        </button>
        {catList.map(cat => (
          <button
            key={cat.category}
            onClick={() => setActiveCategory(cat.category)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-colors ${
              activeCategory === cat.category
                ? (categoryColors[cat.category] || 'bg-sky-500/20 text-sky-400 border-sky-500/30')
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
            }`}
          >
            {categoryLabels[cat.category] || cat.category} ({cat.count})
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="glass-card animate-pulse">
              <div className="h-48 bg-white/5 rounded-t-xl" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/5 rounded w-1/4" />
                <div className="h-5 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : postList.length === 0 ? (
        <div className="text-center py-16">
          <Newspaper size={48} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-bangla">কোনো সংবাদ পাওয়া যায়নি</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {postList.map(post => (
            <Link to={`/news/${post.slug}`} key={post.id} className="group">
              <article className="glass-card overflow-hidden h-full flex flex-col hover:border-sky-500/30 transition-colors">
                {/* Cover Image */}
                {post.cover_image && (
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-medium ${categoryColors[post.category]?.split(' ').slice(0, 2).join(' ') || 'bg-sky-500/20 text-sky-400'}`}>
                        {categoryLabels[post.category] || post.category}
                      </span>
                    </div>
                    {post.is_featured ? (
                      <div className="absolute top-3 right-3 bg-amber-500/90 text-white px-2 py-0.5 rounded-full text-[10px] font-medium">
                        ★ ফিচার্ড
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <h2 className="text-base font-semibold text-white font-bangla group-hover:text-sky-400 transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-xs text-slate-400 mt-2 font-bangla line-clamp-2 flex-1">
                    {post.excerpt}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1"><Clock size={9} />{timeAgo(post.created_at)}</span>
                      <span className="flex items-center gap-1"><Eye size={9} />{post.views}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <MessageSquare size={9} />
                      <span>{post.comment_count || 0}</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
