import { useParams, Link } from 'react-router-dom';
import { usePodcast } from '../hooks/useApi';
import CommentSection from '../components/CommentSection';
import { ArrowLeft, Mic, Play, Clock, Eye, Users, Calendar, Share2 } from 'lucide-react';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} ঘণ্টা ${m} মিনিট`;
  return `${m} মিনিট`;
}

export default function PodcastDetail() {
  const { slug } = useParams();
  const { data: podcast, loading, error } = usePodcast(slug);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-white/5 rounded w-1/4" />
        <div className="h-64 bg-white/5 rounded-xl" />
        <div className="space-y-3">
          <div className="h-8 bg-white/5 rounded w-3/4" />
          <div className="h-4 bg-white/5 rounded w-full" />
        </div>
      </div>
    );
  }

  if (error || !podcast) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400 font-bangla">পডকাস্ট পাওয়া যায়নি</p>
        <Link to="/podcasts" className="text-violet-400 text-sm mt-2 inline-block">← পডকাস্ট পাতায় ফিরুন</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back */}
      <Link to="/podcasts" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition-colors">
        <ArrowLeft size={16} />
        <span className="font-bangla">পডকাস্ট পাতায় ফিরুন</span>
      </Link>

      {/* Podcast Header Card */}
      <div className="glass-card overflow-hidden border-violet-500/20">
        <div className="flex flex-col md:flex-row gap-6 p-6">
          {/* Cover */}
          <div className="w-full md:w-48 h-48 rounded-xl overflow-hidden shrink-0">
            {podcast.cover_image ? (
              <img src={podcast.cover_image} alt={podcast.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                <Mic size={48} className="text-violet-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full">
                সিজন {podcast.season} • পর্ব {podcast.episode_number}
              </span>
              {podcast.is_live ? (
                <span className="text-xs text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="live-dot" /> লাইভ
                </span>
              ) : null}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white font-bangla">
              {podcast.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-400">
              <span className="flex items-center gap-1.5">
                <Mic size={14} />
                {podcast.host_name}
              </span>
              {podcast.guest_name && (
                <span className="flex items-center gap-1.5">
                  <Users size={14} />
                  অতিথি: {podcast.guest_name}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {formatDuration(podcast.duration || 0)}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(podcast.created_at).toLocaleDateString('bn-BD')}
              </span>
              <span className="flex items-center gap-1.5">
                <Eye size={14} />
                {podcast.views} ভিউ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Video / Audio Player */}
      {podcast.video_url && (
        <div className="glass-card overflow-hidden">
          <div className="aspect-video">
            <iframe
              width="100%"
              height="100%"
              src={podcast.video_url}
              title={podcast.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="rounded-xl"
            />
          </div>
        </div>
      )}

      {podcast.audio_url && !podcast.video_url && (
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <button className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center hover:opacity-90 transition-opacity">
              <Play size={24} className="text-white ml-0.5" fill="currentColor" />
            </button>
            <div className="flex-1">
              <audio controls className="w-full" src={podcast.audio_url}>
                আপনার ব্রাউজার অডিও প্লেয়ার সমর্থন করে না।
              </audio>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white font-bangla mb-3">বিবরণ</h2>
        <div className="text-sm text-slate-300 leading-relaxed font-bangla whitespace-pre-wrap">
          {podcast.description}
        </div>
      </div>

      {/* Share */}
      <div className="glass-card p-4 flex items-center justify-between">
        <span className="text-sm text-slate-400 font-bangla">এই পডকাস্ট শেয়ার করুন</span>
        <button
          onClick={() => navigator.clipboard.writeText(window.location.href)}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg text-sm text-slate-300 hover:bg-white/10 transition-colors"
        >
          <Share2 size={14} />
          লিংক কপি
        </button>
      </div>

      {/* Comments */}
      <CommentSection contentType="podcast" contentId={podcast.id} />
    </div>
  );
}
