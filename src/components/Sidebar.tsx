import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  History,
  ShieldCheck,
  Cpu,
  FileCheck2,
} from 'lucide-react';

export type TabType = 'dashboard' | 'convert' | 'history' | 'security-demo';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeJobsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeJobsCount = 0,
}) => {
  const mainItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'Metrics & Activity Overview',
      letter: 'D',
    },
    {
      id: 'convert' as TabType,
      label: 'Conversion Hub',
      icon: ArrowLeftRight,
      description: 'Upload & Transform Formats',
      letter: 'C',
      badge: activeJobsCount > 0 ? `${activeJobsCount} Active` : undefined,
    },
    {
      id: 'history' as TabType,
      label: 'History',
      icon: History,
      description: 'User Converted Archives',
      letter: 'H',
    },
  ];

  const labItems = [
    {
      id: 'security-demo' as TabType,
      label: 'Security Demo',
      icon: ShieldCheck,
      description: 'Academic Attack Tests',
      letter: 'S',
      highlight: true,
    },
  ];

  return (
    <aside className="w-full md:w-60 bg-[#0d0f14] border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-4">
        {/* Main Section */}
        <div>
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Main
          </div>
          <nav className="space-y-1">
            {mainItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-800/50 text-white border border-slate-700/50 shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-slate-800/40 text-slate-500'
                      }`}
                    >
                      {item.letter}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono font-bold rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Lab Tools Section */}
        <div>
          <div className="pt-2 px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Lab Tools
          </div>
          <nav className="space-y-1">
            {labItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition cursor-pointer ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-xs'
                      : 'text-slate-400 hover:bg-slate-800/30 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-slate-800/40 text-slate-500'
                      }`}
                    >
                      {item.letter}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="ml-2 px-1.5 py-0.5 text-[9px] font-mono uppercase font-bold rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                    Live
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Concurrency System Status Widget */}
        <div className="p-3.5 rounded-xl bg-[#13151a] border border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span className="flex items-center gap-1.5 text-xs">
              <Cpu className="h-3.5 w-3.5 text-blue-400" />
              Worker Engine
            </span>
            <span className="text-[10px] text-green-500 font-mono font-bold">NORMAL</span>
          </div>
          <div className="text-slate-500 text-[11px] leading-relaxed">
            Asynchronous queue with max 4 workers & 2 jobs/user governor.
          </div>
          <div className="pt-1 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 font-mono">
            <span>Storage:</span>
            <span className="text-slate-400">Isolated</span>
          </div>
        </div>
      </div>

      {/* Footer Info / Auditor badge */}
      <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <FileCheck2 className="h-3.5 w-3.5 text-blue-400" />
          <span className="font-mono text-slate-400">v2.4.0-SEC</span>
        </span>
        <span className="font-mono text-[10px] text-green-500 uppercase px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 rounded">
          Active
        </span>
      </div>
    </aside>
  );
};
