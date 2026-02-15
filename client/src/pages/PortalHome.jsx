import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePosts, usePodcasts, useStreams, useNewsTicker } from '../hooks/useApi';
import {
  Newspaper, Mic, Radio, TrendingUp, Eye, Clock, ChevronRight,
  Sparkles, ArrowRight, Play, Calendar, Users, Flame, Vote, Zap
} from 'lucide-react';

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
  politics: 'রাজনীতি',
  analysis: 'বিশ্লেষণ',
  economy: 'অর্থনীতি',
  technology: 'প্রযুক্তি',
  media: 'মিডিয়া',
  news: 'সংবাদ',
  business: 'ব্যবসা',
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

export default function PortalHome() {
  const { data: postsData, loading: postsLoading } = usePosts({ limit: 10 });
  const { data: podcastsData } = usePodcasts({ limit: 4 });
  const { data: streamsData } = useStreams();
  const { data: newsData } = useNewsTicker();

  const posts = postsData || [];
  const podcasts = podcastsData || [];
  const streams = streamsData || [];
  const news = newsData || [];

  const featuredPosts = posts.filter(p => p.is_featured);
  const regularPosts = posts.filter(p => !p.is_featured);
  const liveStreams = streams.filter(s => s.status === 'live');
  const upcomingStreams = streams.filter(s => s.status === 'upcoming');

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ─── BRAND HERO ──────────────────────────────── */}
      <section className="glass-card p-6 md:p-8 bg-gradient-to-r from-sky-500/10 via-violet-500/5 to-emerald-500/10 border-sky-500/20">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center shrink-0">
            <svg className="w-9 h-9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="8" cy="8" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="12" cy="16" r="2"/>
              <line x1="8" y1="8" x2="16" y2="6" strokeOpacity="0.5"/>
              <line x1="8" y1="8" x2="12" y2="16" strokeOpacity="0.5"/>
              <line x1="16" y1="6" x2="12" y2="16" strokeOpacity="0.5"/>
            </svg>
          </div>
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              Connecting Dots
            </h1>
            <p className="text-sm text-slate-300 mt-1 font-bangla">
              🇧🇩 বাংলাদেশি সংবাদ, পডকাস্ট ও লাইভ স্ট্রিমিং পোর্টাল — 🇩🇪 জার্মানি থেকে পরিচালিত
            </p>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3 text-xs text-slate-500">
              <span className="bg-white/5 px-2.5 py-1 rounded-full border border-white/10">📰 সংবাদ ও বিশ্লেষণ</span>
              <span className="bg-white/5 px-2.5 py-1 rounded-full border border-white/10">🎙️ পডকাস্ট ও সাক্ষাৎকার</span>
              <span className="bg-white/5 px-2.5 py-1 rounded-full border border-white/10">📺 লাইভ স্ট্রিমিং</span>
              <span className="bg-white/5 px-2.5 py-1 rounded-full border border-white/10">🤖 এআই-চালিত বিশ্লেষণ</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── NEWS TICKER ─────────────────────────────── */}
      {news.length > 0 && (
        <div className="glass-card overflow-hidden">
          <div className="flex items-center">
            <div className="bg-red-500 px-3 py-2 flex items-center gap-1.5 shrink-0">
              <Zap size={14} className="text-white" />
              <span className="text-xs font-bold text-white whitespace-nowrap">ব্রেকিং</span>
            </div>
            <div className="overflow-hidden flex-1">
              <div className="ticker-wrap py-2">
                <div className="animate-ticker inline-flex gap-12 text-sm px-4">
                  {news.slice(0, 12).map((n, i) => (
                    <span key={i} className="text-slate-300 whitespace-nowrap">
                      🔴 {n.title}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── HERO / FEATURED SECTION ─────────────────── */}
      <section>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Featured Post */}
          {featuredPosts[0] && (
            <Link to={`/news/${featuredPosts[0].slug}`} className="lg:col-span-2 group">
              <div className="glass-card overflow-hidden h-full">
                <div className="relative h-64 lg:h-80 overflow-hidden">
                  <img
                    src={featuredPosts[0].cover_image || 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800'}
                    alt={featuredPosts[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium mb-3 ${categoryColors[featuredPosts[0].category] || 'bg-sky-500/20 text-sky-400'}`}>
                      {categoryLabels[featuredPosts[0].category] || featuredPosts[0].category}
                    </span>
                    <h2 className="text-xl lg:text-2xl font-bold text-white mb-2 font-bangla group-hover:text-sky-400 transition-colors">
                      {featuredPosts[0].title}
                    </h2>
                    <p className="text-sm text-slate-300 line-clamp-2 font-bangla">{featuredPosts[0].excerpt}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={10} /> {timeAgo(featuredPosts[0].created_at)}</span>
                      <span className="flex items-center gap-1"><Eye size={10} /> {featuredPosts[0].views}</span>
                      <span className="flex items-center gap-1"><Newspaper size={10} /> {featuredPosts[0].comment_count || 0} মন্তব্য</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Side Featured Posts */}
          <div className="space-y-4">
            {featuredPosts.slice(1, 4).map(post => (
              <Link to={`/news/${post.slug}`} key={post.id} className="group block">
                <div className="glass-card p-4 hover:bg-white/5 transition-colors">
                  <div className="flex gap-3">
                    {post.cover_image && (
                      <img
                        src={post.cover_image}
                        alt={post.title}
                        className="w-20 h-20 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mb-1 ${categoryColors[post.category] || 'bg-sky-500/20 text-sky-400'}`}>
                        {categoryLabels[post.category] || post.category}
                      </span>
                      <h3 className="text-sm font-semibold text-white line-clamp-2 font-bangla group-hover:text-sky-400 transition-colors">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><Clock size={8} /> {timeAgo(post.created_at)}</span>
                        <span className="flex items-center gap-1"><Eye size={8} /> {post.views}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* Live Stream CTA */}
            {liveStreams.length > 0 && (
              <Link to="/live" className="block">
                <div className="glass-card p-4 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <Radio size={20} className="text-red-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="live-dot" />
                        <span className="text-xs font-bold text-red-400">লাইভ এখন</span>
                      </div>
                      <p className="text-sm text-white font-bangla">{liveStreams[0].title}</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-500 ml-auto" />
                  </div>
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ─── QUICK NAV CARDS ─────────────────────────── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/news" className="glass-card p-4 hover:bg-white/5 group transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center">
              <Newspaper size={20} className="text-sky-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white group-hover:text-sky-400">সংবাদ</h3>
              <p className="text-[10px] text-slate-500">{posts.length}+ আর্টিকেল</p>
            </div>
          </div>
        </Link>
        <Link to="/podcasts" className="glass-card p-4 hover:bg-white/5 group transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <Mic size={20} className="text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white group-hover:text-violet-400">পডকাস্ট</h3>
              <p className="text-[10px] text-slate-500">{podcasts.length}+ পর্ব</p>
            </div>
          </div>
        </Link>
        <Link to="/live" className="glass-card p-4 hover:bg-white/5 group transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
              <Radio size={20} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white group-hover:text-red-400">লাইভ</h3>
              <p className="text-[10px] text-slate-500">{liveStreams.length} সরাসরি</p>
            </div>
          </div>
        </Link>
        <Link to="/election" className="glass-card p-4 hover:bg-white/5 group transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Vote size={20} className="text-green-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white group-hover:text-green-400">নির্বাচন</h3>
              <p className="text-[10px] text-slate-500">৩০০ আসন</p>
            </div>
          </div>
        </Link>
      </section>

      {/* ─── LATEST NEWS + SIDEBAR ───────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Latest News */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 font-bangla">
              <TrendingUp size={18} className="text-sky-400" />
              সর্বশেষ সংবাদ
            </h2>
            <Link to="/news" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1">
              সব দেখুন <ArrowRight size={12} />
            </Link>
          </div>

          {postsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-4 animate-pulse">
                  <div className="flex gap-4">
                    <div className="w-32 h-24 bg-white/5 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-white/5 rounded w-1/4" />
                      <div className="h-5 bg-white/5 rounded w-3/4" />
                      <div className="h-3 bg-white/5 rounded w-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {regularPosts.slice(0, 5).map(post => (
                <Link to={`/news/${post.slug}`} key={post.id} className="group block">
                  <div className="glass-card p-4 hover:bg-white/5 transition-colors">
                    <div className="flex gap-4">
                      {post.cover_image && (
                        <img
                          src={post.cover_image}
                          alt={post.title}
                          className="w-32 h-24 rounded-lg object-cover shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium mb-1.5 ${categoryColors[post.category] || 'bg-sky-500/20 text-sky-400'}`}>
                          {categoryLabels[post.category] || post.category}
                        </span>
                        <h3 className="text-sm font-semibold text-white font-bangla group-hover:text-sky-400 transition-colors line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 font-bangla">{post.excerpt}</p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                          <span className="flex items-center gap-1"><Clock size={8} /> {timeAgo(post.created_at)}</span>
                          <span className="flex items-center gap-1"><Eye size={8} /> {post.views}</span>
                          <span>{post.author_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Podcasts Widget */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 font-bangla">
                <Mic size={16} className="text-violet-400" />
                সর্বশেষ পডকাস্ট
              </h3>
              <Link to="/podcasts" className="text-[10px] text-sky-400 hover:text-sky-300">
                সব দেখুন →
              </Link>
            </div>
            <div className="space-y-3">
              {podcasts.slice(0, 3).map(p => (
                <Link to={`/podcasts/${p.slug}`} key={p.id} className="group block">
                  <div className="flex gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                      <Play size={16} className="text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-medium text-white line-clamp-1 group-hover:text-violet-400 font-bangla">
                        {p.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        পর্ব {p.episode_number} • {Math.floor((p.duration || 0) / 60)} মিনিট
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Upcoming Streams Widget */}
          {upcomingStreams.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-bold flex items-center gap-2 font-bangla mb-4">
                <Calendar size={16} className="text-orange-400" />
                আসন্ন লাইভ
              </h3>
              <div className="space-y-3">
                {upcomingStreams.slice(0, 3).map(s => (
                  <div key={s.id} className="flex gap-3 p-2 rounded-lg bg-white/5">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                      <Radio size={14} className="text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-medium text-white line-clamp-1 font-bangla">{s.title}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(s.scheduled_at).toLocaleDateString('bn-BD')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Election Quick Link */}
          <Link to="/election" className="block">
            <div className="glass-card p-5 border border-green-500/20 hover:bg-green-500/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Vote size={24} className="text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-green-400 font-bangla">
                    নির্বাচন ২০২৬
                  </h3>
                  <p className="text-[10px] text-slate-500">ড্যাশবোর্ড, ফলাফল, পূর্বাভাস</p>
                </div>
                <ArrowRight size={16} className="text-slate-500 ml-auto" />
              </div>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
