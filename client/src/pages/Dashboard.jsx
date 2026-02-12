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
      {/* ─── নির্বাচনী কাউন্টডাউন / হেডার ─────────────── */}
      <CountdownBanner time={time} electionInfo={electionInfo} />

      {/* ─── প্রধান পরিসংখ্যান ─────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<CheckCircle2 className="text-green-400" />}
          label="ঘোষিত"
          value={totalDeclared}
          total={300}
          color="green"
        />
        <StatCard
          icon={<Loader2 className="text-yellow-400 animate-spin" />}
          label="গণনা চলছে"
          value={totalCounting}
          total={300}
          color="yellow"
        />
        <StatCard
          icon={<Flag className="text-red-400" />}
          label="স্থগিত"
          value={totalPostponed}
          total={300}
          color="red"
          subtitle="শেরপুর-৩"
        />
        <StatCard
          icon={<Vote className="text-sky-400" />}
          label="মোট ভোট"
          value={formatNumber(dashboard?.totalVotes || 0)}
          color="sky"
        />
        <StatCard
          icon={<Users className="text-violet-400" />}
          label="মোট ভোটার"
          value="১২.৭৬ কোটি"
          color="violet"
          subtitle="পুরুষ: ৬.৪৮ কোটি | নারী: ৬.২৮ কোটি"
        />
      </div>

      {/* ─── আসন স্কোরবোর্ড ────────────────────────── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2 font-bangla">
            <BarChart3 className="text-sky-400" />
            আসন স্কোরবোর্ড
          </h2>
          <div className="text-xs text-slate-500 font-bangla">
            সংখ্যাগরিষ্ঠতা: <span className="text-white font-bold">১৫১</span> | মোট: <span className="text-white font-bold">৩০০</span> (২৯৯ ভোট + ১ স্থগিত)
          </div>
        </div>

        {/* Horizontal stacked bar showing all parties */}
        <div className="mb-4">
          <div className="flex rounded-xl overflow-hidden h-12 bg-black/30">
            {partySeats.length > 0 ? partySeats.map(party => {
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
                  title={`${party.name_bn || party.short_name}: ${party.seats_leading} আসন`}
                >
                  {width > 5 && (
                    <span className="text-xs font-bold text-white drop-shadow-lg">
                      {party.short_name} {party.seats_leading}
                    </span>
                  )}
                </div>
              );
            }) : (
              <div className="flex items-center justify-center w-full text-slate-500 text-sm font-bangla">
                <Clock size={16} className="mr-2 opacity-50" />
                ফলাফলের অপেক্ষায় — এখনো কোনো আসন ঘোষিত হয়নি
              </div>
            )}
          </div>
          {/* Majority marker */}
          <div className="relative h-6">
            <div 
              className="absolute top-0 w-0.5 h-4 bg-white/50"
              style={{ left: `${(151 / 300) * 100}%` }}
            />
            <div 
              className="absolute top-4 text-[10px] text-slate-400 -translate-x-1/2 font-bangla"
              style={{ left: `${(151 / 300) * 100}%` }}
            >
              সংখ্যাগরিষ্ঠতা: ১৫১
            </div>
          </div>
        </div>

        {/* Party breakdown table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {partySeats.length > 0 ? partySeats.map((party, i) => (
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
                  {party.name_bn && <span className="text-xs text-slate-500 truncate font-bangla">{party.name_bn}</span>}
                  {!party.name_bn && <span className="text-xs text-slate-500 truncate">{party.name}</span>}
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
                <div className="text-[10px] text-slate-500 font-bangla">
                  {party.seats_won} ঘোষিত
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-2 text-center py-8 text-slate-500">
              <Clock size={24} className="mx-auto mb-2 opacity-40" />
              <div className="text-sm font-bangla">এখনো কোনো ফলাফল প্রকাশিত হয়নি</div>
              <div className="text-xs text-slate-600 mt-1 font-bangla">নির্বাচন কমিশন ঘোষণা করলে দলীয় ফলাফল এখানে দেখা যাবে</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── মূল তথ্য ব্যানার ────────────────────────── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-bold text-slate-400 mb-3 flex items-center gap-2 font-bangla">
          <Zap size={14} className="text-amber-400" />
          ২০২৬ নির্বাচনের মূল তথ্য
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'ভোটের তারিখ', value: '১২ ফেব্রুয়ারি ২০২৬', icon: '🗓️' },
            { label: 'নির্বাচনী এলাকা', value: '৩০০ (২৯৯+১)', icon: '🗳️' },
            { label: 'দল', value: '৫১ নিবন্ধিত', icon: '🏛️' },
            { label: 'প্রার্থী', value: '২,০২৭', icon: '👤' },
            { label: 'স্বতন্ত্র', value: '২৫৬', icon: '⭐' },
            { label: 'আ.লী. অবস্থা', value: 'স্থগিত', icon: '🚫' },
          ].map((fact, i) => (
            <div key={i} className="bg-white/[0.03] rounded-lg p-3 text-center">
              <div className="text-xl mb-1">{fact.icon}</div>
              <div className="text-xs text-slate-400 font-bangla">{fact.label}</div>
              <div className="font-bold text-sm font-bangla">{fact.value}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {['প্রথমবার ডাক ভোট', 'নো ভোট অপশন', 'জুলাই সনদ গণভোট', 'জেন-জি প্রভাবিত নির্বাচন'].map(tag => (
            <span key={tag} className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-1 rounded-full font-bangla">
              ✨ {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ─── চার্ট ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
            <BarChart3 size={18} className="text-sky-400" />
            দলভিত্তিক আসন
          </h3>
          {partySeats.length > 0 ? (
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
                formatter={(value, name) => [value, name === 'seats_leading' ? 'এগিয়ে' : 'জিতেছে']}
              />
              <Bar dataKey="seats_leading" radius={[0, 6, 6, 0]} name="এগিয়ে">
                {partySeats.slice(0, 8).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
              <BarChart3 size={32} className="mb-2 opacity-20" />
              <div className="text-sm font-bangla">কোনো তথ্য পাওয়া যায়নি</div>
            </div>
          )}
        </div>

        {/* Pie Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
            <Target size={18} className="text-violet-400" />
            ভোট বণ্টন
          </h3>
          {partySeats.filter(p => p.total_votes > 0).length > 0 ? (
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
                formatter={(value) => [formatNumber(value), 'ভোট']}
              />
            </PieChart>
          </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[300px] text-slate-500">
              <Target size={32} className="mb-2 opacity-20" />
              <div className="text-sm font-bangla">এখনো কোনো ভোট গণনা হয়নি</div>
            </div>
          )}
        </div>
      </div>

      {/* ─── আসন মানচিত্র (৩০০ বিন্দু) ─────────────────────── */}
      <SeatMap parties={parties} />

      {/* ─── এআই পূর্বাভাস ─────────────────────── */}
      {predictions && predictions.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
            <Sparkles size={18} className="text-amber-400" />
            এআই পূর্বাভাস
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {predictions.slice(0, 4).map(pred => (
              <div key={pred.id} className="bg-white/[0.03] rounded-xl p-4 text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: pred.color }} />
                <div className="font-bold">{pred.short_name}</div>
                <div className="text-xs text-slate-500 mb-1 font-bangla">{pred.party_name}</div>
                <div className="text-3xl font-black mt-1" style={{ color: pred.color }}>
                  {pred.predicted_seats}
                </div>
                {seatRanges[pred.short_name] && (
                  <div className="text-[10px] text-slate-500 mt-0.5 font-bangla">
                    পরিসীমা: {seatRanges[pred.short_name].min}–{seatRanges[pred.short_name].max}
                  </div>
                )}
                <div className="text-xs text-slate-500 mt-1 font-bangla">
                  {(pred.win_probability * 100).toFixed(0)}% জয়ের সম্ভাবনা
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
                <div className="text-[10px] text-slate-600 mt-1 font-bangla">
                  {(pred.confidence * 100).toFixed(0)}% নির্ভরযোগ্যতা
                </div>
              </div>
            ))}
          </div>

          {/* Scenarios */}
          {scenarios && scenarios.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/5">
              <h4 className="text-sm font-bold text-slate-400 mb-3 font-bangla">নির্বাচনী পরিস্থিতি</h4>
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

      {/* ─── বিভাগ অনুযায়ী ─────────────────────── */}
      {divisions && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
            <MapPin size={18} className="text-emerald-400" />
            বিভাগ অনুযায়ী ফলাফল
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {divisions.map(div => (
              <div key={div.division} className="bg-white/[0.03] rounded-xl p-4">
                <div className="font-bold text-sm mb-2">{div.division}</div>
                <div className="text-xs text-slate-400 mb-3 font-bangla">{div.total_seats} আসন</div>
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

      {/* ─── তথ্যসূত্র ────────────────────────────── */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-bold text-slate-400 mb-3 font-bangla">তথ্যসূত্র</h3>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://www.jamuna.tv/parliament-election-2026"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] bg-white/5 text-slate-400 px-2 py-1 rounded-full border border-white/10 hover:text-sky-400 transition-colors font-bangla"
          >
            🔵 যমুনা টিভি
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── কাউন্টডাউন ব্যানার ───────────────────────────────────
function CountdownBanner({ time, electionInfo }) {
  const diff = ELECTION_DATE - time;
  const isElectionDay = diff <= 0;
  const COUNTING_START = new Date('2026-02-12T10:30:00.000Z'); // 4:30 PM BDT
  const countingStarted = time >= COUNTING_START;

  if (isElectionDay) {
    return (
      <div className="glass-card p-6 bg-gradient-to-r from-green-500/10 to-sky-500/10 border-green-500/30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-3xl font-black text-green-400 font-bangla">
              {countingStarted ? '📊 ফলাফল আসছে' : '🗳️ নির্বাচনের দিন 🗳️'}
            </h2>
          </div>
          <p className="text-lg text-slate-300 font-bangla">১৩তম জাতীয় সংসদ নির্বাচন ২০২৬</p>
          <p className="text-sm text-slate-400 mt-1 font-bangla">
            {countingStarted 
              ? 'ভোট গণনা চলছে • যমুনা টিভি থেকে সরাসরি ফলাফল' 
              : '১৩তম জাতীয় সংসদ নির্বাচন • ১২ ফেব্রুয়ারি ২০২৬'}
          </p>
          <div className="mt-3 text-sm text-slate-400">
            <Clock size={14} className="inline mr-1" />
            {time.toLocaleTimeString('bn-BD', { hour12: true, timeZone: 'Asia/Dhaka' })} বাংলাদেশ সময়
            {countingStarted && <span className="ml-2 text-amber-400 font-bangla">• বিকাল ৪:৩০ থেকে গণনা চলছে</span>}
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
          <h2 className="text-xl font-bold flex items-center gap-2 font-bangla">
            <Calendar className="text-sky-400" />
            ১৩তম জাতীয় সংসদ নির্বাচন
          </h2>
          <p className="text-sm text-slate-400 mt-1 font-bangla">
            ভোটের দিন: ১২ ফেব্রুয়ারি ২০২৬ • সকাল ৮:০০ – বিকাল ৪:০০
          </p>
        </div>
        <div className="flex gap-3">
          {[
            { label: 'দিন', value: days },
            { label: 'ঘণ্টা', value: hours },
            { label: 'মিনিট', value: minutes },
            { label: 'সেকেন্ড', value: seconds },
          ].map(unit => (
            <div key={unit.label} className="text-center bg-white/5 rounded-xl px-4 py-2 border border-white/10">
              <div className="text-2xl md:text-3xl font-black gradient-text">
                {String(unit.value).padStart(2, '0')}
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bangla">{unit.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── আসন মানচিত্র (৩০০ বিন্দু) ──────────────────────
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
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2 font-bangla">
        <Zap size={18} className="text-yellow-400" />
        ৩০০ আসনের মানচিত্র
      </h3>
      <p className="text-xs text-slate-400 mb-4 font-bangla">প্রতিটি বিন্দু = ১টি নির্বাচনী এলাকা। বিস্তারিত দেখতে হোভার করুন।</p>
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
              title={seat ? `${seat.name} - ${seat.party} (${seat.status === 'declared' ? 'ঘোষিত' : seat.status === 'counting' ? 'গণনা চলছে' : seat.status === 'postponed' ? 'স্থগিত' : seat.status})` : `আসন ${i + 1}`}
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

// ─── পরিসংখ্যান কার্ড ──────────────────────────────────────────
function StatCard({ icon, label, value, total, color, isTime, subtitle }) {
  return (
    <div className="glass-card-hover p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <div>
          <span className="text-xs text-slate-400 font-bangla">{label}</span>
        </div>
      </div>
      <div className={`stat-value ${isTime ? 'text-2xl md:text-3xl' : ''}`}>
        {value}
      </div>
      {subtitle && (
        <div className="text-[10px] text-slate-500 mt-1 font-bangla">{subtitle}</div>
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
  if (num >= 10000000) return (num / 10000000).toFixed(1) + ' কোটি';
  if (num >= 100000) return (num / 100000).toFixed(1) + ' লক্ষ';
  if (num >= 1000) return (num / 1000).toFixed(1) + ' হাজার';
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
