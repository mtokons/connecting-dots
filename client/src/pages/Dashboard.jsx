import { useState, useEffect } from 'react';
import { useDashboard, usePartyTree, usePredictions, useDivisions } from '../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  Vote, Users, TrendingUp, MapPin, Clock, CheckCircle2, 
  Loader2, BarChart3, Zap, Target, Sparkles, Calendar, Flag, UserCheck
} from 'lucide-react';

// Election Day: 12 Feb 2026, 7:30 AM BDT (UTC+6 = 1:30 AM UTC)
const ELECTION_DATE = new Date('2026-02-12T01:30:00.000Z');

export default function Dashboard() {
  const { data: dashboard, loading: dashLoading } = useDashboard();
  const { data: parties } = usePartyTree();
  const { data: predictions, scenarios, seatRanges, electionInfo } = usePredictions();
  const { data: divisions } = useDivisions();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (dashLoading) return <DashboardSkeleton />;

  const partySeats = dashboard?.partySeats || [];
  const totalDeclared = dashboard?.seatStatus?.find(s => s.status === 'declared')?.count || 0;
  const totalCounting = dashboard?.seatStatus?.find(s => s.status === 'counting')?.count || 0;
  const totalPostponed = dashboard?.seatStatus?.find(s => s.status === 'postponed')?.count || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ─── ELECTION COUNTDOWN / HEADER ─────────────── */}
      <CountdownBanner time={time} electionInfo={electionInfo} />

      {/* ─── HERO STATS ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<CheckCircle2 className="text-green-400" />}
          label="Declared"
          labelBn="ঘোষিত"
          value={totalDeclared}
          total={300}
          color="green"
        />
        <StatCard
          icon={<Loader2 className="text-yellow-400 animate-spin" />}
          label="Counting"
          labelBn="গণনা চলছে"
          value={totalCounting}
          total={300}
          color="yellow"
        />
        <StatCard
          icon={<Flag className="text-red-400" />}
          label="Postponed"
          labelBn="স্থগিত"
          value={totalPostponed}
          total={300}
          color="red"
          subtitle="Sherpur-3"
        />
        <StatCard
          icon={<Vote className="text-sky-400" />}
          label="Total Votes"
          labelBn="মোট ভোট"
          value={formatNumber(dashboard?.totalVotes || 0)}
          color="sky"
        />
        <StatCard
          icon={<Users className="text-violet-400" />}
          label="Total Voters"
          labelBn="মোট ভোটার"
          value="12.76 Cr"
          color="violet"
          subtitle="M: 6.48Cr F: 6.28Cr"
        />
      </div>

      {/* ─── SEAT SCOREBOARD ────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-sky-400" />
            Seat Scoreboard
            <span className="text-xs font-normal text-slate-400 font-bangla">আসন স্কোরবোর্ড</span>
          </h2>
          <div className="text-xs text-slate-500">
            Majority needed: <span className="text-white font-bold">151</span> | Total: <span className="text-white font-bold">300</span> (299 voting + 1 postponed)
          </div>
        </div>

        {/* Horizontal stacked bar showing all parties */}
        <div className="mb-4">
          <div className="flex rounded-xl overflow-hidden h-12 bg-black/30">
            {partySeats.map(party => {
              const width = (party.seats_leading / 300) * 100;
              if (width < 0.3) return null;
              return (
                <div
                  key={party.id}
                  className="relative flex items-center justify-center transition-all duration-500 group"
                  style={{ 
                    width: `${width}%`, 
                    backgroundColor: party.color,
                    minWidth: width > 2 ? '30px' : '0'
                  }}
                  title={`${party.short_name}: ${party.seats_leading} seats`}
                >
                  {width > 5 && (
                    <span className="text-xs font-bold text-white drop-shadow-lg">
                      {party.short_name} {party.seats_leading}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {/* Majority marker */}
          <div className="relative h-6">
            <div 
              className="absolute top-0 w-0.5 h-4 bg-white/50"
              style={{ left: `${(151 / 300) * 100}%` }}
            />
            <div 
              className="absolute top-4 text-[10px] text-slate-400 -translate-x-1/2"
              style={{ left: `${(151 / 300) * 100}%` }}
            >
              151 majority
            </div>
          </div>
        </div>

        {/* Party breakdown table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {partySeats.map((party, i) => (
            <div key={party.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
              <div className="text-lg font-black text-slate-600 w-6">
                {i + 1}
              </div>
              <div 
                className="w-3 h-8 rounded-full"
                style={{ backgroundColor: party.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{party.short_name}</span>
                  <span className="text-xs text-slate-500 truncate">{party.name}</span>
                  {party.name_bn && <span className="text-xs text-slate-600 font-bangla hidden md:inline">{party.name_bn}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${(party.seats_leading / 300) * 100}%`,
                        backgroundColor: party.color,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black" style={{ color: party.color }}>
                  {party.seats_leading}
                </div>
                <div className="text-[10px] text-slate-500">
                  {party.seats_won} declared
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── KEY FACTS BANNER ────────────────────────── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2">
          <Zap size={14} className="text-amber-400" />
          2026 Election Key Facts
          <span className="text-xs font-normal text-slate-500 font-bangla">মূল তথ্য</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Voting Date', value: '12 Feb 2026', icon: '🗓️' },
            { label: 'Constituencies', value: '300 (299+1)', icon: '🗳️' },
            { label: 'Parties', value: '51 registered', icon: '🏛️' },
            { label: 'Candidates', value: '2,027', icon: '👤' },
            { label: 'Independents', value: '256', icon: '⭐' },
            { label: 'AL Status', value: 'SUSPENDED', icon: '🚫' },
          ].map((fact, i) => (
            <div key={i} className="bg-white/[0.03] rounded-lg p-3 text-center">
              <div className="text-xl mb-1">{fact.icon}</div>
              <div className="text-xs text-slate-400">{fact.label}</div>
              <div className="font-bold text-sm">{fact.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['First postal voting', 'No Vote option', 'July Charter Referendum', 'Gen-Z influenced election'].map(tag => (
            <span key={tag} className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-1 rounded-full">
              ✨ {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ─── CHARTS ROW ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-sky-400" />
            Seats by Party
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={partySeats.slice(0, 8)} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" stroke="#334155" domain={[0, 300]} />
              <YAxis type="category" dataKey="short_name" stroke="#94a3b8" width={40} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
                formatter={(value, name) => [value, name === 'seats_leading' ? 'Leading' : 'Won']}
              />
              <Bar dataKey="seats_leading" radius={[0, 6, 6, 0]} name="Leading">
                {partySeats.slice(0, 8).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Target size={18} className="text-violet-400" />
            Vote Share Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={partySeats.filter(p => p.total_votes > 0)}
                dataKey="total_votes"
                nameKey="short_name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={2}
                label={({ short_name, percent }) => 
                  percent > 0.03 ? `${short_name} ${(percent * 100).toFixed(0)}%` : ''
                }
                labelLine={false}
              >
                {partySeats.filter(p => p.total_votes > 0).map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
                formatter={(value) => [formatNumber(value), 'Votes']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── SEAT MAP (300 dots) ─────────────────────── */}
      <SeatMap parties={parties} />

      {/* ─── AI PREDICTION MINI ─────────────────────── */}
      {predictions && predictions.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            AI Prediction Snapshot
            <span className="text-xs font-normal text-slate-400 font-bangla">এআই পূর্বাভাস</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {predictions.slice(0, 4).map(pred => (
              <div key={pred.id} className="bg-white/[0.03] rounded-xl p-4 text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: pred.color }} />
                <div className="font-bold">{pred.short_name}</div>
                <div className="text-xs text-slate-500 mb-1">{pred.party_name}</div>
                <div className="text-3xl font-black mt-1" style={{ color: pred.color }}>
                  {pred.predicted_seats}
                </div>
                {seatRanges[pred.short_name] && (
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Range: {seatRanges[pred.short_name].min}–{seatRanges[pred.short_name].max}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1">
                  {(pred.win_probability * 100).toFixed(0)}% win prob
                </div>
                <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: `${pred.confidence * 100}%`,
                      backgroundColor: pred.color 
                    }}
                  />
                </div>
                <div className="text-[10px] text-slate-600 mt-1">
                  {(pred.confidence * 100).toFixed(0)}% confidence
                </div>
              </div>
            ))}
          </div>

          {/* Scenarios */}
          {scenarios && scenarios.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <h4 className="text-sm font-bold text-slate-400 mb-3">Election Scenarios</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scenarios.map((s, i) => (
                  <div key={i} className="bg-white/[0.02] rounded-xl p-3 flex items-start gap-3">
                    <div className="text-lg font-black text-sky-400 w-12 text-center">
                      {(s.probability * 100).toFixed(0)}%
                    </div>
                    <div>
                      <div className="font-bold text-sm">{s.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{s.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── DIVISION BREAKDOWN ─────────────────────── */}
      {divisions && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-400" />
            Division Breakdown
            <span className="text-xs font-normal text-slate-400 font-bangla">বিভাগ অনুযায়ী</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {divisions.map(div => (
              <div key={div.division} className="bg-white/[0.03] rounded-xl p-4">
                <div className="font-bold text-sm mb-2">{div.division}</div>
                <div className="text-xs text-slate-400 mb-3">{div.total_seats} seats</div>
                <div className="flex gap-0.5 h-2 rounded-full overflow-hidden">
                  {div.parties?.map((p, i) => (
                    <div
                      key={i}
                      className="h-full"
                      style={{
                        width: `${(p.seats / div.total_seats) * 100}%`,
                        backgroundColor: p.color,
                      }}
                      title={`${p.short_name}: ${p.seats}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {div.parties?.slice(0, 4).map((p, i) => (
                    <span key={i} className="text-[10px]" style={{ color: p.color }}>
                      {p.short_name}:{p.seats}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── DATA SOURCES ────────────────────────────── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-bold text-slate-400 mb-3">Data Sources & Attribution</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { name: 'election.results.com.bd', type: 'Primary' },
            { name: 'election.unb.com.bd', type: 'Primary' },
            { name: 'electionresult2026bd.com', type: 'Primary' },
            { name: 'ecs.gov.bd (EC)', type: 'Official' },
            { name: 'votebd.org (SHUJAN)', type: 'Primary' },
            { name: 'onefiftyonebd.com', type: 'Aggregator' },
            { name: 'The Daily Star', type: 'News' },
            { name: 'Prothom Alo', type: 'News' },
            { name: 'bdnews24', type: 'News' },
          ].map((src, i) => (
            <span key={i} className="text-[10px] bg-white/5 text-slate-400 px-2 py-1 rounded-full border border-white/10">
              {src.type === 'Primary' ? '🔵' : src.type === 'Official' ? '🟢' : src.type === 'Aggregator' ? '🟣' : '🟡'} {src.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── COUNTDOWN BANNER ───────────────────────────────────
function CountdownBanner({ time, electionInfo }) {
  const diff = ELECTION_DATE - time;
  const isElectionDay = diff <= 0;

  if (isElectionDay) {
    return (
      <div className="glass-card p-6 bg-gradient-to-r from-green-500/10 to-sky-500/10 border-green-500/30">
        <div className="text-center">
          <h2 className="text-3xl font-black text-green-400 mb-2">🗳️ ELECTION DAY 🗳️</h2>
          <p className="text-lg text-slate-300 font-bangla">১৩তম জাতীয় সংসদ নির্বাচন ২০২৬</p>
          <p className="text-sm text-slate-400 mt-1">13th Jatiya Sangsad Election • 12 February 2026</p>
          <div className="mt-3 text-sm text-slate-400">
            <Clock size={14} className="inline mr-1" />
            {time.toLocaleTimeString('en-US', { hour12: true, timeZone: 'Asia/Dhaka' })} BDT
          </div>
        </div>
      </div>
    );
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return (
    <div className="glass-card p-6 bg-gradient-to-r from-sky-500/10 to-violet-500/10 border-sky-500/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="text-sky-400" />
            13th Jatiya Sangsad Election
            <span className="text-sm font-normal text-slate-400 font-bangla">১৩তম জাতীয় সংসদ নির্বাচন</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Voting Day: 12 February 2026 • 8:00 AM – 4:00 PM BDT
          </p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'Days', value: days },
            { label: 'Hours', value: hours },
            { label: 'Min', value: minutes },
            { label: 'Sec', value: seconds },
          ].map(unit => (
            <div key={unit.label} className="text-center bg-white/5 rounded-xl px-4 py-2 border border-white/10">
              <div className="text-2xl md:text-3xl font-black gradient-text">
                {String(unit.value).padStart(2, '0')}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{unit.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SEAT MAP COMPONENT (300 dots) ──────────────────────
function SeatMap({ parties }) {
  if (!parties) return null;

  const seatColors = {};
  for (const party of parties) {
    for (const seat of party.seats || []) {
      seatColors[seat.constituency_id] = {
        color: party.color,
        party: party.short_name,
        name: seat.constituency_name,
        status: seat.status,
      };
    }
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <Zap size={18} className="text-yellow-400" />
        300-Seat Map
        <span className="text-xs font-normal text-slate-400 font-bangla">৩০০ আসনের মানচিত্র</span>
      </h3>
      <p className="text-xs text-slate-400 mb-4">Each dot = 1 constituency. Hover to see details.</p>
      <div className="seat-grid">
        {Array.from({ length: 300 }, (_, i) => {
          const seat = seatColors[i + 1];
          return (
            <div
              key={i}
              className="seat-dot"
              style={{
                backgroundColor: seat?.color || '#1e293b',
                opacity: seat?.status === 'declared' ? 1 : seat?.status === 'postponed' ? 0.2 : 0.6,
              }}
              title={seat ? `${seat.name} - ${seat.party} (${seat.status})` : `Seat ${i + 1}`}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-white/5">
        {parties?.filter(p => p.totalSeats > 0).map(p => (
          <div key={p.id} className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.short_name} ({p.totalSeats})
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── STAT CARD ──────────────────────────────────────────
function StatCard({ icon, label, labelBn, value, total, color, isTime, subtitle }) {
  return (
    <div className="glass-card-hover p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <div>
          <span className="text-xs text-slate-400">{label}</span>
          {labelBn && <span className="text-[10px] text-slate-600 ml-1 font-bangla">{labelBn}</span>}
        </div>
      </div>
      <div className={`stat-value ${isTime ? 'text-2xl md:text-3xl' : ''}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[10px] text-slate-500 mt-1">{subtitle}</div>
      )}
      {total && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${(parseInt(value) / total) * 100}%`,
                background: `linear-gradient(90deg, var(--tw-gradient-from), var(--tw-gradient-to))`,
              }}
            />
          </div>
          <span className="text-xs text-slate-500">{total}</span>
        </div>
      )}
    </div>
  );
}

function formatNumber(num) {
  if (num >= 10000000) return (num / 10000000).toFixed(1) + ' Cr';
  if (num >= 100000) return (num / 100000).toFixed(1) + ' L';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="glass-card h-32 shimmer" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="glass-card h-28 shimmer" />
        ))}
      </div>
      <div className="glass-card h-96 shimmer" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card h-80 shimmer" />
        <div className="glass-card h-80 shimmer" />
      </div>
    </div>
  );
}
