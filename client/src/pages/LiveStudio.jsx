import { useState } from 'react';
import { useSSE, useDashboard } from '../hooks/useApi';
import { Radio, Youtube, MessageSquare, Users, Wifi, WifiOff, ExternalLink, Play, Volume2 } from 'lucide-react';

export default function LiveStudio() {
  const { connected, breaking } = useSSE();
  const { data: dashboard } = useDashboard();
  const [youtubeId, setYoutubeId] = useState('');
  // Auto-play the live election results stream
  const [activeStream, setActiveStream] = useState('HtNr_rp1juA');

  // Live & suggested YouTube channels for Bangladesh election coverage
  const suggestedChannels = [
    { name: '🔴 LIVE Election Results', id: 'HtNr_rp1juA', type: 'Live Now', live: true },
    { name: 'Somoy TV', id: 'somoaborton', type: 'News' },
    { name: 'Independent TV', id: 'independenttv', type: 'News' },
    { name: 'NTV Bangladesh', id: 'naborton', type: 'News' },
    { name: 'Channel 24', id: 'channel24bd', type: 'News' },
    { name: 'Ekattor TV', id: 'eaborton71', type: 'News' },
    { name: 'ATN News', id: 'atnnewsbd', type: 'News' },
  ];

  const handleLoadStream = (streamId) => {
    setActiveStream(streamId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-3">
            <Radio className="text-red-400" />
            Live Studio
            <span className="text-sm font-normal text-slate-400 font-bangla">লাইভ স্টুডিও</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Watch live election coverage from Bangladesh TV channels alongside real-time data
          </p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
          connected ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
        }`}>
          {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
          {connected ? 'Data Feed Connected' : 'Reconnecting...'}
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
                  title="Live Stream"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0"
                />
              ) : (
                <div className="text-center p-8">
                  <Youtube size={64} className="mx-auto text-red-500/50 mb-4" />
                  <h3 className="text-lg font-bold text-slate-300 mb-2">No Stream Selected</h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    Enter a YouTube video/stream ID below or select from suggested channels to watch live election coverage
                  </p>
                  <button
                    onClick={() => handleLoadStream('HtNr_rp1juA')}
                    className="mt-4 px-6 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-sm flex items-center gap-2 mx-auto transition-colors"
                  >
                    <Play size={16} />
                    Watch Live Election Results
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
                    placeholder="Enter YouTube Video ID (e.g., dQw4w9WgXcQ)"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                  />
                </div>
                <button
                  onClick={() => youtubeId && handleLoadStream(youtubeId)}
                  className="px-6 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                >
                  <Play size={16} />
                  Load
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                💡 Tip: For live streams, find the video ID from the YouTube URL (after v= or /live/)
              </p>
            </div>
          </div>

          {/* Suggested Channels */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Youtube size={16} className="text-red-400" />
              Suggested Bangladesh News Channels
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
                      <div className="text-sm font-bold text-red-400 truncate">{channel.name}</div>
                      <div className="text-[10px] text-red-400/60 uppercase tracking-wider">{channel.type}</div>
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
                      <div className="text-sm font-medium truncate">{channel.name}</div>
                      <div className="text-xs text-slate-500">{channel.type}</div>
                    </div>
                    <ExternalLink size={12} className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                )
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 text-center">
              🔴 Click the LIVE stream to watch here, or open other channels in a new tab
            </p>
          </div>
        </div>

        {/* Live Feed Sidebar */}
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Radio size={14} className="text-sky-400" />
              Live Election Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Seats Declared</span>
                <span className="font-bold text-green-400">
                  {dashboard?.seatStatus?.find(s => s.status === 'declared')?.count || 0}/300
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Counting</span>
                <span className="font-bold text-yellow-400">
                  {dashboard?.seatStatus?.find(s => s.status === 'counting')?.count || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400">Total Votes</span>
                <span className="font-bold text-sky-400">
                  {((dashboard?.totalVotes || 0) / 10000000).toFixed(1)} Cr
                </span>
              </div>
            </div>

            {/* Top Parties Mini */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="text-xs text-slate-400 mb-2">Leading Parties</div>
              {dashboard?.partySeats?.length > 0 ? dashboard.partySeats.slice(0, 4).map(party => (
                <div key={party.id} className="flex items-center gap-2 py-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: party.color }} />
                  <span className="text-xs flex-1">{party.short_name}</span>
                  <span className="text-xs font-bold" style={{ color: party.color }}>
                    {party.seats_leading}
                  </span>
                </div>
              )) : (
                <div className="text-xs text-slate-500 text-center py-3">Awaiting results...</div>
              )}
            </div>
          </div>

          {/* Breaking News Feed */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <MessageSquare size={14} className="text-red-400" />
              Live Updates
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
                <div className="text-center py-8 text-slate-500 text-xs">
                  <MessageSquare size={24} className="mx-auto mb-2 opacity-30" />
                  Waiting for breaking updates...
                </div>
              )}
            </div>
          </div>

          {/* How to Use */}
          <div className="glass-card p-4">
            <h3 className="text-sm font-bold mb-3">📺 How to Watch Live</h3>
            <ol className="text-xs text-slate-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-sky-400 font-bold">1.</span>
                Click any suggested channel above
              </li>
              <li className="flex gap-2">
                <span className="text-sky-400 font-bold">2.</span>
                Copy the video ID from the URL
              </li>
              <li className="flex gap-2">
                <span className="text-sky-400 font-bold">3.</span>
                Paste it in the input field and click Load
              </li>
              <li className="flex gap-2">
                <span className="text-sky-400 font-bold">4.</span>
                Watch live coverage with real-time data!
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
