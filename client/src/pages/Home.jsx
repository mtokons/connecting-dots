import { useState, useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { useDashboard, usePartyTree, usePredictions, useSSE } from '../hooks/useApi';
import { 
  Shield, Newspaper, Brain, Clock, RefreshCw, CheckCircle2, 
  TrendingUp, Zap, AlertCircle, Radio, Eye, Sparkles, Calendar, Users
} from 'lucide-react';

const ELECTION_DATE = new Date('2026-02-12T01:30:00.000Z');

// Tab configuration
const TABS = [
  { 
    id: 'official', 
    label: 'Official EC', 
    labelBn: 'ইসি অফিসিয়াল',
    icon: Shield, 
    color: '#22c55e',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-400',
    description: 'Verified EC Declared Results',
    source: 'Bangladesh Election Commission (ecs.gov.bd)'
  },
  { 
    id: 'unofficial', 
    label: 'News Portals', 
    labelBn: 'নিউজ পোর্টাল',
    icon: Newspaper, 
    color: '#f97316',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    textColor: 'text-orange-400',
    description: 'Aggregated from 8 Sources',
    source: 'election.results.com.bd • election.unb.com.bd • electionresult2026bd.com • votebd.org • Daily Star • Prothom Alo • bdnews24'
  },
  { 
    id: 'prediction', 
    label: 'AI Prediction', 
    labelBn: 'এআই পূর্বাভাস',
    icon: Brain, 
    color: '#3b82f6',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-400',
    description: 'Bayesian + FPTP Simulation',
    source: 'IRI Polls • Innovision Surveys • Historical Data'
  },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('official');
  const { data: dashboard, loading: dashLoading } = useDashboard();
  const { data: parties, loading: partiesLoading } = usePartyTree();
  const { data: predictions, scenarios, seatRanges } = usePredictions();
  const { connected, breaking, lastUpdate } = useSSE();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (lastUpdate) setLastRefresh(new Date());
  }, [lastUpdate]);

  // Transform data for each view — use REAL party colors
  const getViewData = (viewId) => {
    if (!parties) return [];
    
    switch (viewId) {
      case 'official':
        return parties.map(party => ({
          ...party,
          displaySeats: party.seats?.filter(s => s.status === 'declared').length || 0,
          totalSeats: party.totalSeats,
          isVerified: true,
        })).filter(p => p.displaySeats > 0).sort((a, b) => b.displaySeats - a.displaySeats);
      
      case 'unofficial':
        return parties.map(party => ({
          ...party,
          displaySeats: party.totalSeats,
          votePercentage: party.seats?.reduce((sum, s) => sum + (s.vote_percentage || 0), 0) / (party.seats?.length || 1),
          isVerified: false,
        })).filter(p => p.displaySeats > 0).sort((a, b) => b.displaySeats - a.displaySeats);
      
      case 'prediction':
        if (!predictions) return [];
        return predictions.map(pred => ({
          id: pred.party_id || pred.id,
          name: pred.party_name,
          short_name: pred.short_name,
          color: pred.color,
          displaySeats: pred.predicted_seats,
          confidence: pred.confidence,
          winProbability: pred.win_probability,
          seatRange: seatRanges[pred.short_name],
          isPrediction: true,
        })).filter(p => p.displaySeats > 0).sort((a, b) => b.displaySeats - a.displaySeats);
      
      default:
        return parties;
    }
  };

  const activeTabConfig = TABS.find(t => t.id === activeTab);

  if (dashLoading || partiesLoading) return <HomeSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Countdown Banner */}
      <MiniCountdown time={time} />

      {/* Header with Live Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <div className="relative">
              <Radio className="text-red-400" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
            </div>
            Connecting Dots — Live
            <span className="text-sm font-normal text-slate-400 font-bangla">লাইভ নির্বাচনী ফলাফল</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            13th Jatiya Sangsad • 300 seats • {dashboard?.partySeats?.length || 0} parties contesting
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs ${
            connected ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {connected ? 'LIVE' : 'OFFLINE'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Users size={12} />
            12.76 Cr voters
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} />
            Updated {getTimeSince(lastRefresh)}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                isActive
                  ? `${tab.bgColor} ${tab.textColor} ${tab.borderColor} border shadow-lg`
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-xs">{tab.label.split(' ')[0]}</span>
              {tab.id === 'official' && <CheckCircle2 size={14} className="text-green-400" />}
              {tab.id === 'prediction' && <Sparkles size={14} className="text-blue-400" />}
            </button>
          );
        })}
      </div>

      {/* Active Tab Info Bar */}
      <div className={`flex items-center justify-between p-4 rounded-xl ${activeTabConfig.bgColor} border ${activeTabConfig.borderColor}`}>
        <div className="flex items-center gap-3">
          <activeTabConfig.icon size={20} className={activeTabConfig.textColor} />
          <div>
            <div className="font-bold flex items-center gap-2">
              {activeTabConfig.label} View
              <span className="text-xs font-normal text-slate-400 font-bangla">{activeTabConfig.labelBn}</span>
            </div>
            <div className="text-xs text-slate-400">{activeTabConfig.description} • {activeTabConfig.source}</div>
          </div>
        </div>
        <FreshnessBadge lastUpdate={lastRefresh} viewType={activeTab} />
      </div>

      {/* Summary Stats Row */}
      <SummaryStats 
        data={getViewData(activeTab)} 
        viewType={activeTab} 
        dashboard={dashboard}
        tabConfig={activeTabConfig}
      />

      {/* Main D3 Tree Visualization — uses REAL party colors */}
      <div className="glass-card overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-bold flex items-center gap-2">
            <Eye size={16} className={activeTabConfig.textColor} />
            {activeTabConfig.label} Seat Distribution
          </h2>
          <div className="text-xs text-slate-500">
            Majority: 151 seats | AL: Suspended
          </div>
        </div>
        <D3TreeView 
          data={getViewData(activeTab)} 
          viewType={activeTab}
          accentColor={activeTabConfig.color}
        />
      </div>

      {/* Party Cards Grid */}
      <PartyCardsGrid 
        data={getViewData(activeTab)} 
        viewType={activeTab}
        tabConfig={activeTabConfig}
        seatRanges={seatRanges}
      />

      {/* Breaking News Ticker */}
      {breaking.length > 0 && (
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 text-xs text-red-400 mb-2">
            <AlertCircle size={14} />
            Breaking Updates
          </div>
          <div className="space-y-1">
            {breaking.slice(0, 3).map((b, i) => (
              <div key={i} className="text-sm text-slate-300 bg-white/[0.02] rounded-lg p-2">
                {b.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MINI COUNTDOWN ─────────────────────────────────────
function MiniCountdown({ time }) {
  const diff = ELECTION_DATE - time;
  if (diff <= 0) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
        <span className="text-green-400 font-bold text-sm">🗳️ VOTING IN PROGRESS — 12 Feb 2026</span>
        <span className="text-xs text-slate-400 ml-2 font-bangla">ভোট চলছে</span>
      </div>
    );
  }
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  return (
    <div className="bg-sky-500/5 border border-sky-500/20 rounded-xl p-3 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm">
        <Calendar size={16} className="text-sky-400" />
        <span className="text-slate-300 font-medium">⏱️ Election in</span>
        <span className="font-black text-sky-400">{days}d {hours}h {minutes}m {seconds}s</span>
      </div>
      <div className="text-xs text-slate-500">12 Feb 2026 • 8:00 AM BDT</div>
    </div>
  );
}

// ─── SUMMARY STATS COMPONENT ────────────────────────────
function SummaryStats({ data, viewType, dashboard, tabConfig }) {
  const totalSeats = data.reduce((sum, p) => sum + (p.displaySeats || 0), 0);
  const leader = data[0];
  
  const stats = viewType === 'prediction' 
    ? [
        { label: 'Predicted Leader', value: leader?.short_name || '-', color: leader?.color },
        { label: 'Predicted Seats', value: leader?.displaySeats || 0 },
        { label: 'Win Probability', value: `${((leader?.winProbability || 0) * 100).toFixed(0)}%` },
        { label: 'Model Confidence', value: `${((leader?.confidence || 0) * 100).toFixed(0)}%` },
      ]
    : [
        { label: viewType === 'official' ? 'EC Declared' : 'Total Reporting', value: totalSeats, color: leader?.color },
        { label: 'Leading Party', value: leader?.short_name || '-' },
        { label: 'Leader Seats', value: leader?.displaySeats || 0 },
        { label: 'Total Votes', value: formatNumber(dashboard?.totalVotes || 0) },
      ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat, i) => (
        <div key={i} className="glass-card p-4">
          <div className="text-xs text-slate-400 mb-1">{stat.label}</div>
          <div className="text-2xl font-black" style={{ color: stat.color || '#fff' }}>
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── D3 TREE VIEW COMPONENT ─────────────────────────────
function D3TreeView({ data, viewType, accentColor }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = containerRef.current.clientWidth;
    const height = 400;
    const margin = { top: 40, right: 20, bottom: 40, left: 20 };

    // Build hierarchy — use real party colors
    const treeData = {
      name: viewType === 'prediction' ? 'AI Prediction' : viewType === 'official' ? 'EC Official' : 'News Sources',
      children: data.slice(0, 8).map(party => ({
        name: party.short_name,
        value: party.displaySeats,
        color: party.color, // REAL party color
        party: party,
      })),
    };

    const root = d3.hierarchy(treeData);
    const treeLayout = d3.tree()
      .size([width - margin.left - margin.right, height - margin.top - margin.bottom]);
    treeLayout(root);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Glow filter for predictions
    if (viewType === 'prediction') {
      const defs = svg.append('defs');
      const filter = defs.append('filter').attr('id', 'glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%');
      filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
      const feMerge = filter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');
    }

    // Links — each with its party color
    g.selectAll('.link')
      .data(root.links())
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
      .attr('fill', 'none')
      .attr('stroke', d => d.target.data.color || accentColor)
      .attr('stroke-width', d => d.target.depth === 1 ? Math.max(2, (d.target.data.value || 0) / 20) : 2)
      .attr('stroke-opacity', 0.4)
      .attr('filter', viewType === 'prediction' ? 'url(#glow)' : 'none');

    // Root node
    const rootNode = g.selectAll('.root-node')
      .data([root])
      .join('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    rootNode.append('rect')
      .attr('x', -80).attr('y', -15).attr('width', 160).attr('height', 30)
      .attr('rx', 8).attr('fill', accentColor + '30').attr('stroke', accentColor).attr('stroke-width', 2);

    rootNode.append('text')
      .attr('text-anchor', 'middle').attr('dy', 5).attr('fill', 'white')
      .attr('font-weight', 'bold').attr('font-size', '12px')
      .text(d => d.data.name);

    // Party nodes — each with ITS OWN color
    const nodes = g.selectAll('.party-node')
      .data(root.children || [])
      .join('g')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    nodes.append('circle')
      .attr('r', d => Math.max(18, Math.min(45, (d.data.value || 0) / 3)))
      .attr('fill', d => (d.data.color || accentColor) + '25')
      .attr('stroke', d => d.data.color || accentColor)
      .attr('stroke-width', 2.5)
      .attr('filter', viewType === 'prediction' ? 'url(#glow)' : 'none');

    // Party short name
    nodes.append('text')
      .attr('text-anchor', 'middle').attr('dy', 4)
      .attr('fill', 'white').attr('font-weight', 'bold').attr('font-size', '11px')
      .text(d => d.data.name);

    // Seat count below node
    nodes.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', d => Math.max(23, Math.min(50, (d.data.value || 0) / 3)) + 14)
      .attr('fill', d => d.data.color || accentColor)
      .attr('font-weight', 'bold').attr('font-size', '14px')
      .text(d => d.data.value || 0);

    // Animate
    svg.selectAll('.party-node, .root-node')
      .attr('opacity', 0)
      .transition().duration(800).delay((d, i) => i * 100)
      .attr('opacity', 1);

    svg.selectAll('.link')
      .attr('stroke-dasharray', function() { return this.getTotalLength(); })
      .attr('stroke-dashoffset', function() { return this.getTotalLength(); })
      .transition().duration(1000).attr('stroke-dashoffset', 0);

  }, [data, viewType, accentColor]);

  return (
    <div ref={containerRef} className="w-full" style={{ minHeight: 400 }}>
      <svg ref={svgRef} width="100%" height="400" />
    </div>
  );
}

// ─── PARTY CARDS GRID ───────────────────────────────────
function PartyCardsGrid({ data, viewType, tabConfig, seatRanges }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {data.slice(0, 10).map((party, i) => (
        <div 
          key={party.id} 
          className="glass-card-hover p-4 border border-white/10"
          style={{ borderColor: party.color + '30', backgroundColor: party.color + '08' }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg font-black text-slate-600">
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: party.color }} />
            <span className="font-bold">{party.short_name}</span>
          </div>
          <div className="text-3xl font-black" style={{ color: party.color }}>
            {party.displaySeats}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {viewType === 'prediction' ? 'predicted' : viewType === 'official' ? 'declared' : 'leading'}
          </div>
          {viewType === 'prediction' && party.seatRange && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              Range: {party.seatRange.min}–{party.seatRange.max}
            </div>
          )}
          {viewType === 'prediction' && party.winProbability != null && (
            <div className="mt-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Win prob</span>
                <span>{(party.winProbability * 100).toFixed(0)}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${party.winProbability * 100}%`, backgroundColor: party.color }}
                />
              </div>
            </div>
          )}
          {viewType === 'unofficial' && party.votePercentage > 0 && (
            <div className="text-xs text-slate-400 mt-1">
              {party.votePercentage.toFixed(1)}% avg vote
            </div>
          )}
          {viewType === 'official' && party.isVerified && (
            <div className="flex items-center gap-1 text-xs text-green-400 mt-1">
              <CheckCircle2 size={10} /> EC Verified
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── FRESHNESS BADGE ────────────────────────────────────
function FreshnessBadge({ lastUpdate, viewType }) {
  const minutes = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);
  const isFresh = minutes < 5;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
      isFresh ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
    }`}>
      {isFresh ? <CheckCircle2 size={12} /> : <Clock size={12} />}
      {isFresh ? 'Fresh (<5min)' : `${minutes}m ago`}
    </div>
  );
}

// ─── HELPERS ────────────────────────────────────────────
function getTimeSince(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function formatNumber(num) {
  if (num >= 10000000) return (num / 10000000).toFixed(1) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(1) + ' L';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass-card h-12 shimmer rounded-xl" />
      <div className="h-10 w-64 bg-white/5 rounded-lg shimmer" />
      <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
        {[1, 2, 3].map(i => <div key={i} className="flex-1 h-12 bg-white/5 rounded-xl shimmer" />)}
      </div>
      <div className="glass-card h-96 shimmer" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="glass-card h-32 shimmer" />)}
      </div>
    </div>
  );
}
