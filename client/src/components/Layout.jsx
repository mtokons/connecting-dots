import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSSE } from '../hooks/useApi';
import { 
  Home, Newspaper, Mic, Radio, Vote,
  Menu, X, Wifi, WifiOff, MessageSquare
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'হোম', icon: Home },
  { path: '/news', label: 'সংবাদ', icon: Newspaper },
  { path: '/podcasts', label: 'পডকাস্ট', icon: Mic },
  { path: '/live', label: 'লাইভ', icon: Radio },
  { path: '/election', label: 'নির্বাচন ২০২৬', icon: Vote },
];

export default function Layout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();
  const { connected, breaking } = useSSE();

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── TOP BAR / TICKER ─────────────────────────── */}
      {breaking.length > 0 && (
        <div className="ticker-wrap py-1.5">
          <div className="animate-ticker inline-flex gap-12 text-sm">
            {breaking.map((b, i) => (
              <span key={i} className="text-red-300 whitespace-nowrap">
                🔴 {b.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ─── HEADER ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 glass-card border-x-0 border-t-0 rounded-none">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="হোম পেজে যান">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <circle cx="8" cy="8" r="2"/>
                  <circle cx="16" cy="6" r="2"/>
                  <circle cx="12" cy="16" r="2"/>
                  <line x1="8" y1="8" x2="16" y2="6" strokeOpacity="0.5"/>
                  <line x1="8" y1="8" x2="12" y2="16" strokeOpacity="0.5"/>
                  <line x1="16" y1="6" x2="12" y2="16" strokeOpacity="0.5"/>
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight group-hover:text-sky-400 transition-colors">
                Connecting Dots
              </h1>
              <p className="text-[10px] text-slate-400 -mt-0.5 font-bangla">
                সংবাদ • পডকাস্ট • লাইভ স্ট্রিমিং
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="প্রধান নেভিগেশন">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path || 
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-label={item.label}
                  title={item.label}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {/* সংযোগ স্থিতি */}
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
              connected ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`} title={connected ? 'সরাসরি সংযুক্ত' : 'সংযোগ বিচ্ছিন্ন'}>
              {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
              <span className="hidden sm:inline">{connected ? 'LIVE' : 'OFFLINE'}</span>
            </div>

            {/* সরাসরি সূচক */}
            <div className="hidden sm:flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-full" title="সরাসরি সম্প্রচার চলছে">
              <span className="live-dot" />
              <span className="text-xs font-bold text-red-400 tracking-wider">LIVE</span>
            </div>

            {/* মোবাইল মেনু টগল */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-white/5"
              aria-label={mobileMenuOpen ? 'মেনু বন্ধ করুন' : 'মেনু খুলুন'}
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* মোবাইল নেভিগেশন */}
        {mobileMenuOpen && (
          <nav className="lg:hidden px-4 pb-4 border-t border-white/5 pt-3" aria-label="মোবাইল নেভিগেশন">
            <div className="grid grid-cols-2 gap-2">
              {navItems.map(item => {
                const Icon = item.icon;
                const active = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label={item.label}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      active
                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                        : 'text-slate-400 hover:text-white bg-white/5'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* ─── MAIN CONTENT ─────────────────────────────── */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-6">
        {children}
      </main>

      {/* ─── FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-white/5 py-6 mt-8">
        <div className="max-w-[1600px] mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <p className="text-sm text-slate-500">
              <span className="gradient-text font-bold">Connecting Dots</span> — সংবাদ, পডকাস্ট ও লাইভ স্ট্রিমিং পোর্টাল
            </p>
            <p className="text-xs text-slate-600 mt-1">
              বাংলাদেশকেন্দ্রিক মিডিয়া প্ল্যাটফর্ম • এআই-চালিত বিশ্লেষণ
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-600">
            <span>🇧🇩 বাংলাদেশের জন্য তৈরি</span>
            <span>•</span>
            <span>ওপেন সোর্স</span>
            <span>•</span>
            <span>❤️ দিয়ে তৈরি</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
