import { useState } from 'react';
import { useSSE, useDashboard } from '../hooks/useApi';
import { Radio, Youtube, MessageSquare, Users, Wifi, WifiOff, ExternalLink, Play, Volume2 } from 'lucide-react';

export default function LiveStudio() {
  const { connected, breaking } = useSSE();
  const { data: dashboard } = useDashboard();
  const [youtubeId, setYoutubeId] = useState('');
  // Auto-play the live election results stream (Jamuna TV)
  const [activeStream, setActiveStream] = useState('live_stream?channel=UCN6sm8iHiPd0cnoUardDAnw');

  // Live & suggested YouTube channels for Bangladesh election coverage
  const suggestedChannels = [
    { name: '🔴 যমুনা টিভি লাইভ', id: 'live_stream?channel=UCN6sm8iHiPd0cnoUardDAnw', type: 'লাইভ', live: true },
    { name: 'সময় টিভি', id: 'somoaborton', type: 'সংবাদ' },
    { name: 'ইন্ডিপেন্ডেন্ট টিভি', id: 'independenttv', type: 'সংবাদ' },
    { name: 'এনটিভি বাংলাদেশ', id: 'naborton', type: 'সংবাদ' },
    { name: 'চ্যানেল ২৪', id: 'channel24bd', type: 'সংবাদ' },
    { name: 'একাত্তর টিভি', id: 'eaborton71', type: 'সংবাদ' },
    { name: 'এটিএন নিউজ', id: 'atnnewsbd', type: 'সংবাদ' },
  ];

  const handleLoadStream = (streamId) => {
    setActiveStream(streamId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3 font-bangla">
            <Radio className="text-red-400" />
            লাইভ স্টুডিও
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-bangla">
            বাংলাদেশের টিভি চ্যানেলগুলো থেকে রিয়েল-টাইম ডেটার পাশাপাশি লাইভ নির্বাচন কভারেজ দেখুন
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bangla ${
          connected ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'ডেটা ফিড সংযুক্ত' : 'পুনরায় সংযোগ হচ্ছে...'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Video Player */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card overflow-hidden">
            <div className="aspect-video bg-black/50 flex items-center justify-center relative">
              {activeStream ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${activeStream}?autoplay=1&rel=0`}
                  title="লাইভ স্ট্রিম"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0"
                />
              ) : (
                <div className="text-center p-8">
                  <Youtube size={64} className="mx-auto text-red-500/50 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-2 font-bangla">কোনো স্ট্রিম নির্বাচন করা হয়নি</h3>
                  <p className="text-sm text-slate-500 max-w-md font-bangla">
                    লাইভ নির্বাচন কভারেজ দেখতে নিচে একটি ইউটিউব ভিডিও/স্ট্রিম আইডি লিখুন অথবা প্রস্তাবিত চ্যানেল থেকে নির্বাচন করুন
                  </p>
                  <button
                    onClick={() => handleLoadStream('live_stream?channel=UCN6sm8iHiPd0cnoUardDAnw')}
                    className="mt-4 px-6 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-colors font-bangla"
                  >
                    <Play size={16} />
                    লাইভ নির্বাচন ফলাফল দেখুন
                  </button>
                </div>
              )}
            </div>

            {/* Stream Controls */}
            <div className="p-4 border-t border-white/5">
              <div className="flex gap-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={youtubeId}
                    onChange={(e) => setYoutubeId(e.target.value)}
                    placeholder="ইউটিউব ভিডিও আইডি লিখুন (যেমন: dQw4w9WgXcQ)"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 font-bangla"
                  />
                </div>
                <button
                  onClick={() => youtubeId && handleLoadStream(youtubeId)}
                  className="px-6 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors font-bangla"
                >
                  <Play size={16} />
                  লোড
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-bangla">
                💡 টিপস: লাইভ স্ট্রিমের জন্য, ইউটিউব URL থেকে ভিডিও আইডি খুঁজুন (v= বা /live/ এর পরে)
              </p>
            </div>
          </div>

          {/* Suggested Channels */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 font-bangla">
              <Youtube size={16} className="text-red-400" />
              প্রস্তাবিত বাংলাদেশ সংবাদ চ্যানেল
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {suggestedChannels.map(channel => (
                channel.live ? (
                  <button
                    key={channel.id}
                    onClick={() => handleLoadStream(channel.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl transition-colors group text-left ${
                      activeStream === channel.id
                        ? 'bg-red-500/20 border border-red-500/40 ring-1 ring-red-500/20'
                        : 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/30 flex items-center justify-center relative">
                      <Play size={14} className="text-red-400" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-red-400 truncate font-bangla">{channel.name}</div>
                      <div className="text-[10px] text-red-400/60 uppercase tracking-wider font-bangla">{channel.type}</div>
                    </div>
                  </button>
                ) : (
                  <a
                    key={channel.id}
                    href={`https://www.youtube.com/@${channel.id}/live`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                      <Youtube size={14} className="text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate font-bangla">{channel.name}</div>
                      <div className="text-xs text-slate-500 font-bangla">{channel.type}</div>
                    </div>
                    <ExternalLink size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center font-bangla">
              🔴 এখানে দেখতে লাইভ স্ট্রিমে ক্লিক করুন, অথবা অন্যান্য চ্যানেল নতুন ট্যাবে খুলুন
            </p>
          </div>
        </div>

        {/* Live Feed Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 font-bangla">
              <Radio size={14} className="text-sky-400" />
              লাইভ নির্বাচন পরিসংখ্যান
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bangla">আসন ঘোষিত</span>
                <span className="font-bold text-green-400">
                  {dashboard?.seatStatus?.find(s => s.status === 'declared')?.count || 0}/৩০০
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bangla">গণনা চলছে</span>
                <span className="font-bold text-yellow-400">
                  {dashboard?.seatStatus?.find(s => s.status === 'counting')?.count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-bangla">মোট ভোট</span>
                <span className="font-bold text-sky-400">
                  {((dashboard?.totalVotes || 0) / 10000000).toFixed(1)} কোটি
                </span>
              </div>
            </div>

            {/* Top Parties Mini */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="text-xs text-slate-400 mb-2 font-bangla">এগিয়ে থাকা দলসমূহ</div>
              {dashboard?.partySeats?.length > 0 ? dashboard.partySeats.slice(0, 4).map(party => (
                <div key={party.id} className="flex items-center gap-2 py-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: party.color }} />
                  <span className="text-xs flex-1">{party.short_name}</span>
                  <span className="text-xs font-bold" style={{ color: party.color }}>
                    {party.seats_leading}
                  </span>
                </div>
              )) : (
                <div className="text-xs text-slate-500 text-center py-3 font-bangla">ফলাফলের অপেক্ষায়...</div>
              )}
            </div>
          </div>

          {/* Breaking News Feed */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2 font-bangla">
              <MessageSquare size={14} className="text-red-400" />
              লাইভ আপডেট
              <span className="live-dot ml-2" />
            </h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {breaking.length > 0 ? (
                breaking.map((item, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-white/[0.03] text-xs">
                    <div className="text-red-300">{item.message}</div>
                    <div className="text-slate-600 text-[10px] mt-1">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs font-bangla">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                  ব্রেকিং আপডেটের অপেক্ষায়...
                </div>
              )}
            </div>
          </div>

          {/* যমুনা টিভি লাইভ নির্বাচন পোর্টাল */}
          <div className="glass-card overflow-hidden">
            <a
              href="https://www.jamuna.tv/parliament-election-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 border-b border-white/5 bg-gradient-to-r from-[#ED1C24]/10 to-transparent hover:from-[#ED1C24]/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Radio size={14} className="text-[#ED1C24]" />
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                  </div>
                  <span className="font-bold text-sm text-[#ED1C24] font-bangla">যমুনা টিভি</span>
                  <span className="text-[10px] text-slate-400 font-bangla">লাইভ</span>
                </div>
                <ExternalLink size={12} className="text-slate-500" />
              </div>
            </a>
            <div className="p-6 text-center">
              <Radio size={32} className="mx-auto text-[#ED1C24]/50 mb-3" />
              <h4 className="text-sm font-bold text-slate-300 mb-2 font-bangla">যমুনা টিভি লাইভ নির্বাচন পোর্টাল</h4>
              <p className="text-xs text-slate-500 mb-4 font-bangla">
                বাংলাদেশের শীর্ষ সংবাদ চ্যানেল থেকে নির্বাচন কভারেজ
              </p>
              <a
                href="https://www.jamuna.tv/parliament-election-2026"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#ED1C24]/20 hover:bg-[#ED1C24]/30 border border-[#ED1C24]/30 rounded-xl text-sm text-[#ED1C24] transition-colors font-bangla"
              >
                <ExternalLink size={14} />
                যমুনা টিভিতে দেখুন
              </a>
            </div>
            <a
              href="https://www.jamuna.tv/parliament-election-2026"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-2 text-center text-[10px] text-[#ED1C24] hover:bg-[#ED1C24]/10 transition-colors font-bangla"
            >
              সম্পূর্ণ নির্বাচন কভারেজ দেখুন →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
