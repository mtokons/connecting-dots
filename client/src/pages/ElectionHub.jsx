import { useState, lazy, Suspense } from 'react';
import { Vote, LayoutDashboard, TreePine, MapPin, Brain, Loader2 } from 'lucide-react';

// Lazy load existing election pages
import Dashboard from './Dashboard';
import TreeView from './TreeView';
import Constituencies from './Constituencies';
import Predictions from './Predictions';

const electionTabs = [
  { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
  { id: 'tree', label: 'পার্টি ট্রি', icon: TreePine },
  { id: 'constituencies', label: '৩০০ আসন', icon: MapPin },
  { id: 'predictions', label: 'এআই পূর্বাভাস', icon: Brain },
];

export default function ElectionHub() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderTab = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'tree': return <TreeView />;
      case 'constituencies': return <Constituencies />;
      case 'predictions': return <Predictions />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="glass-card p-6 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shrink-0">
            <Vote size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-bangla">
              নির্বাচন ২০২৬
            </h1>
            <p className="text-sm text-slate-400 mt-1 font-bangla">
              ১৩তম জাতীয় সংসদ নির্বাচন — ড্যাশবোর্ড, ফলাফল, পার্টি ট্রি, ৩০০ আসন ও এআই পূর্বাভাস
            </p>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {electionTabs.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={16} />
              <span className="font-bangla">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {renderTab()}
      </div>
    </div>
  );
}
