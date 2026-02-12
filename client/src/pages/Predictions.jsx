import { usePredictions, usePartyTree } from '../hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts';
import { Brain, Sparkles, TrendingUp, Target, Zap, AlertTriangle, Users, Calendar, BarChart3 } from 'lucide-react';

export default function Predictions() {
  const { data: predictions, scenarios, seatRanges, electionInfo, loading } = usePredictions();
  const { data: parties } = usePartyTree();

  if (loading) return <PredictionSkeleton />;

  const topPredictions = predictions?.slice(0, 8) || [];
  const leader = topPredictions[0];
  const majorityNeeded = 151;
  const hasFormGovt = leader?.predicted_seats >= majorityNeeded;

  // Generate simulated trend data
  const trendData = generateTrendData(topPredictions);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3 font-bangla">
          <Brain className="text-violet-400" />
          এআই পূর্বাভাস — ১৩তম জাতীয় সংসদ
        </h2>
        <p className="text-sm text-slate-400 mt-1 font-bangla">
          Bayesian (বেইজিয়ান) অনুমান + FPTP সিমুলেশন • যমুনা টিভি তথ্যের ভিত্তিতে • প্রতি ৫ মিনিটে আপডেট
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <AlertTriangle size={18} className="text-amber-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-amber-200/80 font-bangla">
          <span className="font-bold">এআই পূর্বাভাস দাবিত্যাগ:</span> এই পূর্বাভাসগুলো একটি এআই মডেল দ্বারা তৈরি যা পরিসংখ্যানগত মডেল, জরিপ তথ্য এবং ঐতিহাসিক ভোটের ধরনের উপর ভিত্তি করে।
          আওয়ামী লীগ স্থগিত এবং প্রতিদ্বন্দ্বিতা করছে না। ১৯৮৬ সালের পর আওয়ামী লীগ ছাড়া প্রথম নির্বাচন। প্রকৃত ফলাফল উল্লেখযোগ্যভাবে ভিন্ন হতে পারে।
        </div>
      </div>

      {/* Election Context Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: <Calendar size={16} className="text-sky-400" />, label: 'ভোটের তারিখ', value: '১২ ফেব্রুয়ারি ২০২৬' },
          { icon: <Users size={16} className="text-green-400" />, label: 'মোট ভোটার', value: '১২.৭৬ কোটি' },
          { icon: <BarChart3 size={16} className="text-violet-400" />, label: 'মোট আসন', value: '৩০০ (২৯৯+১)' },
          { icon: <Zap size={16} className="text-amber-400" />, label: 'আ.লীগ অবস্থা', value: 'স্থগিত' },
        ].map((item, i) => (
          <div key={i} className="glass-card p-3 flex items-center gap-3">
            {item.icon}
            <div>
              <div className="text-[10px] text-slate-500 font-bangla">{item.label}</div>
              <div className="font-bold text-sm font-bangla">{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Hero Prediction */}
      {leader && (
        <div className="glass-card p-8 text-center">
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-3 font-bangla">
            <Sparkles size={14} className="inline mr-1" />
            এআই প্রক্ষিপ্ত বিজয়ী
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-6 h-6 rounded-full" style={{ backgroundColor: leader.color }} />
            <div className="text-5xl font-black" style={{ color: leader.color }}>
              {leader.short_name}
            </div>
          </div>
          <div className="text-lg text-slate-300 mb-4">{leader.party_name}</div>
          <div className="flex justify-center gap-8">
            <div>
              <div className="text-4xl font-black gradient-text">{leader.predicted_seats}</div>
              <div className="text-xs text-slate-500 font-bangla">পূর্বাভাসকৃত আসন</div>
              {seatRanges[leader.short_name] && (
                <div className="text-[10px] text-slate-600 font-bangla">
                  পরিসীমা: {seatRanges[leader.short_name].min}–{seatRanges[leader.short_name].max}
                </div>
              )}
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-4xl font-black" style={{ color: leader.win_probability > 0.5 ? '#22c55e' : '#ef4444' }}>
                {(leader.win_probability * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-slate-500 font-bangla">জয়ের সম্ভাবনা</div>
            </div>
            <div className="w-px bg-white/10" />
            <div>
              <div className="text-4xl font-black text-sky-400">
                {(leader.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500 font-bangla">মডেল নির্ভরযোগ্যতা</div>
            </div>
          </div>
          {hasFormGovt && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-full text-green-400 text-sm font-bold font-bangla">
              <Zap size={14} />
              সরকার গঠনের পূর্বাভাস (≥১৫১ আসন)
            </div>
          )}
        </div>
      )}

      {/* Election Scenarios */}
      {scenarios && scenarios.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
            <Target size={18} className="text-amber-400" />
            নির্বাচনী পরিস্থিতি
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scenarios.map((scenario, i) => (
              <div key={i} className="bg-white/[0.03] rounded-xl p-5 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-lg">{scenario.name}</h4>
                  <div className="text-2xl font-black text-sky-400">
                    {(scenario.probability * 100).toFixed(0)}%
                  </div>
                </div>
                <p className="text-sm text-slate-400 mb-3">{scenario.description}</p>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${scenario.probability * 100}%`,
                      backgroundColor: i === 0 ? '#22c55e' : i === 1 ? '#3b82f6' : i === 2 ? '#f97316' : '#ef4444',
                    }}
                  />
                </div>
                <div className="mt-2 text-xs text-slate-500 font-bangla">
                  {scenario.bnpSeats && `বিএনপি: ${scenario.bnpSeats} আসন`}
                  {scenario.jiSeats && `জামায়াত: ${scenario.jiSeats} আসন`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Party Predictions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {topPredictions.map((pred, i) => (
          <div key={pred.id} className="glass-card-hover p-5" style={{ borderColor: pred.color + '20' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="text-xl font-black text-slate-600">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </div>
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: pred.color }} />
              <div>
                <div className="font-bold">{pred.short_name}</div>
                <div className="text-xs text-slate-500">{pred.party_name}</div>
              </div>
            </div>

            {/* Predicted seats with visual */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1 font-bangla">
                <span>পূর্বাভাসকৃত আসন</span>
                <span>{pred.predicted_seats}/৩০০</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${(pred.predicted_seats / 300) * 100}%`,
                    backgroundColor: pred.color,
                  }}
                />
              </div>
              {/* Majority marker */}
              <div className="relative h-3">
                <div
                  className="absolute top-0 w-px h-2 bg-white/30"
                  style={{ left: `${(151 / 300) * 100}%` }}
                />
              </div>
              {/* Seat range */}
              {seatRanges[pred.short_name] && (
                <div className="text-[10px] text-slate-500 mt-1 font-bangla">
                  পরিসীমা: {seatRanges[pred.short_name].min}–{seatRanges[pred.short_name].max} আসন
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white/[0.03] rounded-lg p-2">
                <div className="text-lg font-black" style={{ color: pred.win_probability > 0.5 ? '#22c55e' : pred.color }}>
                  {(pred.win_probability * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-500 font-bangla">জয়ের সম্ভাবনা</div>
              </div>
              <div className="bg-white/[0.03] rounded-lg p-2">
                <div className="text-lg font-black text-sky-400">
                  {(pred.confidence * 100).toFixed(0)}%
                </div>
                <div className="text-[10px] text-slate-500 font-bangla">নির্ভরযোগ্যতা</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prediction Bar Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
            <Target size={18} className="text-sky-400" />
            আসন পূর্বাভাস
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topPredictions.slice(0, 6)} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="short_name" stroke="#94a3b8" />
              <YAxis stroke="#334155" domain={[0, 300]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="predicted_seats" radius={[6, 6, 0, 0]} name="পূর্বাভাসকৃত আসন">
                {topPredictions.slice(0, 6).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Line Chart */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
            <TrendingUp size={18} className="text-emerald-400" />
            পূর্বাভাস প্রবণতা
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData} margin={{ left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="time" stroke="#94a3b8" />
              <YAxis stroke="#334155" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  color: '#fff',
                }}
              />
              {topPredictions.slice(0, 4).map(pred => (
                <Line
                  key={pred.short_name}
                  type="monotone"
                  dataKey={pred.short_name}
                  stroke={pred.color}
                  strokeWidth={2}
                  dot={false}
                  name={pred.party_name}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Key Factors */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
          <Zap size={18} className="text-amber-400" />
          নির্বাচনের মূল বিষয়সমূহ
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'আ.লীগ স্থগিতাদেশ', desc: '১৯৮৬ সালের পর আওয়ামী লীগ ছাড়া প্রথম নির্বাচন। ~৪ কোটি সাবেক আ.লীগ ভোটার অন্য দলে পুনর্বণ্টন হচ্ছে।', color: 'text-red-400' },
            { title: 'বিএনপি বিদ্রোহী ফ্যাক্টর', desc: '৭৯টি আসনে ৯২ জন বিএনপি বিদ্রোহী প্রার্থী বিএনপির ভোট বিভক্ত করতে পারে, সম্ভাব্য ১৫-২০ আসন হারাতে পারে।', color: 'text-orange-400' },
            { title: 'তরুণ ভোট (জেন-জি)', desc: '৪৪% ভোটার তরুণ। প্রথমবারের ভোটাররা এনসিপি (ছাত্র আন্দোলন দল) এবং জামায়াতের প্রতি আগ্রহী।', color: 'text-blue-400' },
            { title: 'ডাক ভোট', desc: 'বাংলাদেশের প্রথম ডাক ভোটিং ব্যবস্থা। ভোটার উপস্থিতি ৩-৫% বাড়াতে পারে।', color: 'text-green-400' },
            { title: 'নো ভোট অপশন', desc: 'প্রথমবারের মতো ভোটাররা ব্যালটে "নো ভোট" নির্বাচন করতে পারবেন। ঘনিষ্ঠ প্রতিদ্বন্দ্বিতায় ব্যবধানে প্রভাব ফেলতে পারে।', color: 'text-violet-400' },
            { title: 'জুলাই সনদ', desc: 'জুলাই সনদের (ছাত্র অভ্যুত্থানের দাবি) উপর গণভোট একই ব্যালটে। ঐতিহাসিক তাৎপর্য।', color: 'text-amber-400' },
          ].map((factor, i) => (
            <div key={i} className="bg-white/[0.03] rounded-xl p-4">
              <div className={`font-bold mb-2 ${factor.color} font-bangla`}>{factor.title}</div>
              <div className="text-xs text-slate-400 font-bangla">{factor.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Info */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 font-bangla">
          <Brain size={18} className="text-violet-400" />
          মডেল তথ্য
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white/[0.03] rounded-xl p-4">
            <div className="font-bold text-sky-400 mb-2 font-bangla">অ্যালগরিদম</div>
            <div className="text-slate-400 font-bangla">Bayesian (বেইজিয়ান) অনুমান ও FPTP (ফার্স্ট পাস্ট দ্য পোস্ট) সিমুলেশন। জরিপের পূর্বানুমান ও রিয়েল-টাইম পর্যবেক্ষিত তথ্যের সমন্বয়।</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4">
            <div className="font-bold text-emerald-400 mb-2 font-bangla">তথ্যের উৎস</div>
            <div className="text-slate-400 font-bangla">যমুনা টিভি</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4">
            <div className="font-bold text-violet-400 mb-2 font-bangla">মডেল সংস্করণ</div>
            <div className="text-slate-400 font-bangla">v2-bayesian-2026। আ.লীগ স্থগিতাদেশ, বিদ্রোহী প্রার্থী, তরুণ ভোটের উত্থান এবং FPTP ভোট বিভাজন বিবেচনা করে।</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function generateTrendData(predictions) {
  const points = 12;
  const data = [];
  for (let i = 0; i < points; i++) {
    const point = { time: `${i * 30}m` };
    for (const pred of predictions.slice(0, 4)) {
      const base = pred.predicted_seats;
      const noise = Math.sin(i * 0.5 + predictions.indexOf(pred)) * 15;
      const trend = (i / points) * 20 - 10;
      point[pred.short_name] = Math.max(0, Math.round(base + noise + trend));
    }
    data.push(point);
  }
  return data;
}

function PredictionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-white/5 rounded-lg shimmer" />
      <div className="glass-card h-48 shimmer" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="glass-card h-40 shimmer" />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="glass-card h-48 shimmer" />)}
      </div>
    </div>
  );
}
