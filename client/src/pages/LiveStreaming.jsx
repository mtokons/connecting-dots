import { useState } from 'react';
import { useStreams, useSSE } from '../hooks/useApi';
import CommentSection from '../components/CommentSection';
import { Radio, Play, Calendar, Users, Wifi, WifiOff, Clock, Eye, ChevronRight } from 'lucide-react';

export default function LiveStreaming() {
  const { data: streams, loading } = useStreams();
  const { connected } = useSSE();
  const [activeStream, setActiveStream] = useState(null);

  const streamList = streams || [];
  const liveStreams = streamList.filter(s => s.status === 'live');
  const upcomingStreams = streamList.filter(s => s.status === 'upcoming');
  const endedStreams = streamList.filter(s => s.status === 'ended');

  // Auto-select first live stream
  const selectedStream = activeStream || liveStreams[0] || streamList[0];

  // Suggested YouTube channels for Bangladesh coverage
  const suggestedChannels = [
    { name: 'যমুনা টিভি লাইভ', id: 'live_stream?channel=UCN6sm8iHiPd0cnoUardDAnw', live: true },
    { name: 'সময় টিভি', id: 'somoaborton' },
    { name: 'ইন্ডিপেন্ডেন্ট টিভি', id: 'independenttv' },
    { name: 'এনটিভি', id: 'naborton' },
    { name: 'চ্যানেল ২৪', id: 'channel24bd' },
    { name: 'একাত্তর টিভি', id: 'eaborton71' },
  ];

  const [customYoutubeId, setCustomYoutubeId] = useState('');
  const [youtubeStreamId, setYoutubeStreamId] = useState(suggestedChannels[0].id);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3 font-bangla">
            <Radio className="text-red-400" />
            লাইভ স্ট্রিমিং
          </h1>
          <p className="text-sm text-slate-400 mt-1 font-bangla">
            সরাসরি সম্প্রচার, সাক্ষাৎকার ও বিশেষ আলোচনা
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
          connected ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'সংযুক্ত' : 'অফলাইন'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Player */}
        <div className="lg:col-span-2 space-y-4">
          {/* Video Player */}
          <div className="glass-card overflow-hidden">
            <div className="aspect-video bg-black/50 flex items-center justify-center">
              {youtubeStreamId ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeStreamId}?autoplay=1&rel=0`}
                  title="লাইভ স্ট্রিম"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-8">
                  <Radio size={48} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 font-bangla">একটি স্ট্রিম নির্বাচন করুন</p>
                </div>
              )}
            </div>
            {/* Stream info bar */}
            <div className="p-4 flex items-center justify-between border-t border-white/5">
              <div className="flex items-center gap-2">
                {liveStreams.length > 0 && <span className="live-dot" />}
                <span className="text-sm font-medium text-white font-bangla">
                  {selectedStream?.title || 'লাইভ স্ট্রিম'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Eye size={10} /> {selectedStream?.viewers || 0}</span>
              </div>
            </div>
          </div>

          {/* Custom YouTube URL */}
          <div className="glass-card p-4">
            <label className="text-xs text-slate-400 font-bangla mb-2 block">YouTube ভিডিও ID লিখুন</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customYoutubeId}
                onChange={e => setCustomYoutubeId(e.target.value)}
                placeholder="যেমন: dQw4w9WgXcQ"
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
              <button
                onClick={() => { if (customYoutubeId.trim()) setYoutubeStreamId(customYoutubeId.trim()); }}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors"
              >
                <Play size={14} />
              </button>
            </div>
          </div>

          {/* Comments for active stream */}
          {selectedStream && (
            <CommentSection contentType="stream" contentId={selectedStream.id || 1} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* TV Channels */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold text-white font-bangla mb-3 flex items-center gap-2">
              <Radio size={14} className="text-red-400" />
              বাংলাদেশি চ্যানেল
            </h3>
            <div className="space-y-2">
              {suggestedChannels.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => setYoutubeStreamId(ch.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                    youtubeStreamId === ch.id
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {ch.live && <span className="live-dot" />}
                    <span className="font-bangla">{ch.name}</span>
                  </div>
                  <ChevronRight size={14} className="text-slate-500" />
                </button>
              ))}
            </div>
          </div>

          {/* Platform Streams */}
          {streamList.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="text-sm font-bold text-white font-bangla mb-3">প্ল্যাটফর্ম স্ট্রিম</h3>
              <div className="space-y-2">
                {/* Live */}
                {liveStreams.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setActiveStream(s); if (s.embed_url) setYoutubeStreamId(s.embed_url.split('/embed/')[1] || ''); }}
                    className="w-full text-left p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="live-dot" />
                      <span className="text-[10px] font-bold text-red-400">লাইভ</span>
                    </div>
                    <p className="text-sm text-white font-bangla line-clamp-1">{s.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                      <Eye size={8} /> {s.viewers}
                    </p>
                  </button>
                ))}

                {/* Upcoming */}
                {upcomingStreams.map(s => (
                  <div key={s.id} className="p-3 rounded-lg bg-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={10} className="text-orange-400" />
                      <span className="text-[10px] text-orange-400">আসন্ন</span>
                    </div>
                    <p className="text-sm text-white font-bangla line-clamp-1">{s.title}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(s.scheduled_at).toLocaleDateString('bn-BD')} — {new Date(s.scheduled_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
