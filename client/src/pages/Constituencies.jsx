import { useState } from 'react';
import { useConstituencies, useConstituency } from '../hooks/useApi';
import { MapPin, Search, ChevronRight, X, CheckCircle2, Loader2, Filter } from 'lucide-react';

const DIVISIONS = ['All', 'Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Barishal', 'Sylhet', 'Rangpur', 'Mymensingh'];

const toBanglaNum = (n) => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

export default function Constituencies() {
  const [division, setDivision] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: constituencies, loading, pagination } = useConstituencies({
    division: division || undefined,
    status: status || undefined,
    page,
    limit: 50,
  });

  const { data: detail, loading: detailLoading } = useConstituency(selected);

  const filtered = constituencies?.filter(c => 
    !searchQuery || 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.leading_party?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3 font-bangla">
          <MapPin className="text-emerald-400" />
          ৩০০ আসন
          <span className="text-sm font-normal text-slate-400 font-bangla">১৩তম জাতীয় সংসদ</span>
        </h2>
        <p className="text-sm text-slate-400 mt-1 font-bangla">
          বিস্তারিত ফলাফল দেখতে যেকোনো আসনে ক্লিক করুন
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Division filter */}
        <div className="flex gap-1 flex-wrap">
          {DIVISIONS.map(d => (
            <button
              key={d}
              onClick={() => { setDivision(d === 'All' ? '' : d); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                (d === 'All' && !division) || division === d
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              {d === 'All' ? 'সকল বিভাগ' : d}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex gap-1">
          <button
            onClick={() => { setStatus(''); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all font-bangla ${
              !status
                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
            }`}
          >
            সকল অবস্থা
          </button>
          <button
            onClick={() => { setStatus('declared'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all font-bangla ${
              status === 'declared'
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
            }`}
          >
            ✅ ঘোষিত
          </button>
          <button
            onClick={() => { setStatus('counting'); setPage(1); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all font-bangla ${
              status === 'counting'
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-white/5 text-slate-400 hover:bg-white/10 border border-transparent'
            }`}
          >
            ⏳ গণনা চলছে
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="আসন খুঁজুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50 font-bangla"
          />
        </div>
      </div>

      <div className="flex gap-6">
        {/* Constituency List */}
        <div className="flex-1 space-y-2">
          {loading ? (
            Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="glass-card h-16 shimmer" />
            ))
          ) : filtered?.length === 0 ? (
            <div className="text-center text-slate-400 py-12 font-bangla">কোনো ফলাফল পাওয়া যায়নি</div>
          ) : (
            filtered?.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left glass-card-hover p-4 flex items-center gap-4 ${
                  selected === c.id ? 'border-sky-500/50 bg-sky-500/5' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-sm font-bold text-slate-400">
                  {toBanglaNum(c.id)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{c.name}</span>
                    <span className="text-xs text-slate-500">{c.division}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(c.centers_reported / (c.total_centers || 1)) * 100}%`,
                          backgroundColor: c.party_color || '#666',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 font-bangla">
                      {toBanglaNum(c.centers_reported)}/{toBanglaNum(c.total_centers)} কেন্দ্র
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="party-badge"
                    style={{
                      borderColor: (c.party_color || '#666') + '40',
                      backgroundColor: (c.party_color || '#666') + '15',
                      color: c.party_color || '#888',
                    }}
                  >
                    {c.leading_party || '?'}
                  </span>
                  {c.status === 'declared' ? (
                    <CheckCircle2 size={14} className="text-green-400" />
                  ) : (
                    <Loader2 size={14} className="text-yellow-400 animate-spin" />
                  )}
                </div>
                <ChevronRight size={14} className="text-slate-600" />
              </button>
            ))
          )}

          {/* Pagination */}
          {!loading && filtered?.length > 0 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-white/5 text-sm disabled:opacity-30 hover:bg-white/10 font-bangla"
              >
                পূর্ববর্তী
              </button>
              <span className="px-4 py-2 text-sm text-slate-400 font-bangla">
                পৃষ্ঠা {toBanglaNum(page)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 rounded-lg bg-white/5 text-sm hover:bg-white/10 font-bangla"
              >
                পরবর্তী
              </button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selected && (
          <div className="hidden lg:block w-96">
            <div className="glass-card p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg font-bangla">
                  {detail?.constituency?.name || 'লোড হচ্ছে...'}
                </h3>
                <button onClick={() => setSelected(null)} className="p-1 rounded hover:bg-white/5 text-xs font-bangla flex items-center gap-1">
                  <X size={16} /> পেছনে
                </button>
              </div>

              {detailLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <div key={i} className="h-16 bg-white/5 rounded-lg shimmer" />)}
                </div>
              ) : (
                <>
                  <div className="text-xs text-slate-400 mb-1 font-bold font-bangla">আসনের বিস্তারিত</div>
                  <div className="text-xs text-slate-400 mb-4 font-bangla">
                    <span>{detail?.constituency?.division}</span> • 
                    <span> {detail?.constituency?.district}</span> • 
                    <span> মোট ভোটার: {toBanglaNum(detail?.constituency?.total_voters?.toLocaleString() || '0')}</span>
                  </div>

                  <div className="space-y-3">
                    {detail?.results?.map((r, i) => (
                      <div
                        key={r.candidate_id}
                        className={`p-3 rounded-xl ${
                          i === 0 ? 'bg-white/[0.06] border border-white/10' : 'bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {i === 0 && <span className="text-xs">🏆 এগিয়ে</span>}
                          <span className="font-bold text-sm">{r.candidate_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="party-badge text-[10px] py-0.5 px-2"
                            style={{
                              borderColor: r.party_color + '40',
                              backgroundColor: r.party_color + '15',
                              color: r.party_color,
                            }}
                          >
                            {r.party_short}
                          </span>
                          <span className="text-slate-400 font-bold font-bangla">
                            {toBanglaNum(r.votes?.toLocaleString() || '0')} ভোট
                          </span>
                          <span className="text-slate-500">
                            ({toBanglaNum(r.vote_percentage || 0)}%)
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${r.vote_percentage || 0}%`,
                              backgroundColor: r.party_color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {detail?.results?.length === 0 && (
                    <div className="text-center text-slate-500 py-6 font-bangla">ফলাফলের অপেক্ষায়</div>
                  )}

                  {detail?.results?.[0] && (
                    <div className="mt-4 pt-3 border-t border-white/5 text-xs text-slate-500 font-bangla">
                      <div>অবস্থা: {detail.results[0].status === 'declared' ? 'ঘোষিত' : detail.results[0].status === 'counting' ? 'গণনা চলছে' : detail.results[0].status === 'postponed' ? 'স্থগিত' : 'অপেক্ষমান'}</div>
                      <div>কেন্দ্র রিপোর্টেড: {toBanglaNum(detail.results[0].centers_reported)}/{toBanglaNum(detail.results[0].total_centers)}</div>
                      <div>সূত্র: {detail.results[0].source}</div>
                      <div>সর্বশেষ আপডেট: {new Date(detail.results[0].updated_at).toLocaleString('bn-BD')}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
