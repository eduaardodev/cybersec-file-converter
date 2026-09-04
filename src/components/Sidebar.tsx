import React from 'react';
import {
  LayoutDashboard,
  ArrowLeftRight,
  History,
} from 'lucide-react';

export type TabType = 'dashboard' | 'convert' | 'history';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  activeJobsCount?: number;
  isAdmin?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeJobsCount = 0,
  isAdmin = false,
}) => {
  const allMainItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: isAdmin ? 'Painel Central de Auditoria' : 'Metrics & Activity Overview',
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
      label: isAdmin ? 'Histórico de Usuários' : 'History',
      icon: History,
      description: isAdmin ? 'Conversões dos Usuários' : 'User Converted Archives',
      letter: 'H',
    },
  ];

  // Remove Conversion Hub from Admin mode
  const mainItems = isAdmin
    ? allMainItems.filter((item) => item.id !== 'convert')
    : allMainItems;

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
      </div>
    </aside>
  );
};
