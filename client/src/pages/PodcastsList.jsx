import { Link } from 'react-router-dom';
import { usePodcasts } from '../hooks/useApi';
import { Mic, Play, Clock, Eye, Headphones, Users } from 'lucide-react';

const categoryLabels = {
  politics: 'রাজনীতি', technology: 'প্রযুক্তি', economy: 'অর্থনীতি', business: 'ব্যবসা', interview: 'সাক্ষাৎকার'
};

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} ঘণ্টা ${m} মিনিট`;
  return `${m} মিনিট`;
}

export default function PodcastsList() {
  const { data: podcasts, loading } = usePodcasts({ limit: 50 });
  const podList = podcasts || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-8 bg-gradient-to-r from-violet-500/10 to-purple-500/10 border-violet-500/20">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0">
            <Mic size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-bangla">Connecting Dots পডকাস্ট</h1>
            <p className="text-sm text-slate-400 mt-1 font-bangla">
              বাংলাদেশের রাজনীতি, অর্থনীতি ও প্রযুক্তি নিয়ে গভীর আলোচনা ও সাক্ষাৎকার
            </p>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><Headphones size={12} /> {podList.length} পর্ব</span>
              <span className="flex items-center gap-1"><Users size={12} /> Connecting Dots</span>
            </div>
          </div>
        </div>
      </div>

      {/* Podcast Episodes */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-white/5 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-white/5 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-full" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : podList.length === 0 ? (
        <div className="text-center py-16">
          <Mic size={48} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-bangla">এখনও কোনো পডকাস্ট পর্ব নেই</p>
          <p className="text-xs text-slate-500 mt-1 font-bangla">শীঘ্রই নতুন পর্ব আসছে!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {podList.map((podcast, index) => (
            <Link to={`/podcasts/${podcast.slug}`} key={podcast.id} className="group block">
              <div className="glass-card p-5 hover:bg-white/5 transition-colors hover:border-violet-500/30">
                <div className="flex gap-4">
                  {/* Cover */}
                  <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl overflow-hidden shrink-0">
                    {podcast.cover_image ? (
                      <img
                        src={podcast.cover_image}
                        alt={podcast.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                        <Mic size={32} className="text-violet-400" />
                      </div>
                    )}
                    {/* Play overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-violet-500 flex items-center justify-center">
                        <Play size={20} className="text-white ml-0.5" fill="currentColor" />
                      </div>
                    </div>
                    {/* Episode badge */}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                      EP {podcast.episode_number || (index + 1)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full">
                        সিজন {podcast.season}
                      </span>
                      {podcast.is_live ? (
                        <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="live-dot" /> লাইভ
                        </span>
                      ) : null}
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {categoryLabels[podcast.category] || podcast.category}
                      </span>
                    </div>

                    <h2 className="text-base md:text-lg font-semibold text-white font-bangla group-hover:text-violet-400 transition-colors line-clamp-1">
                      {podcast.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-bangla line-clamp-2">
                      {podcast.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-slate-500">
                      {podcast.guest_name && (
                        <span className="flex items-center gap-1">
                          <Users size={10} /> অতিথি: {podcast.guest_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={10} /> {formatDuration(podcast.duration || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={10} /> {podcast.views} ভিউ
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
