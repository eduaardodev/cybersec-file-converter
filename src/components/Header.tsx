import React from 'react';
import { User as UserIcon, LogOut, Lock } from 'lucide-react';
import { User } from '../types/client';

interface HeaderProps {
  user: User | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onQuickDemoLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onOpenAuth,
  onLogout,
}) => {
  const isAdmin = user?.role === 'admin';

  return (
    <header className="border-b border-slate-800 bg-[#0d0f14] text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold tracking-tight shadow-sm shadow-blue-900/40">
            F
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-blue-500 text-base uppercase">FS-CONVERT</span>
              {isAdmin && (
                <span className="text-[10px] font-mono font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                  Admin
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 font-mono hidden sm:block">
              {isAdmin ? 'ADMINISTRATOR CONSOLE' : 'FAST CLOUD DOCUMENT CONVERTER'}
            </p>
          </div>
        </div>

        {/* User / Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#13151a] border border-slate-800 text-xs">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-slate-200 font-medium">{user.email}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase font-bold ${
                    isAdmin
                      ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {user.role}
                </span>
              </div>
              <button
                id="btn-logout"
                onClick={onLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#13151a] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-medium transition cursor-pointer"
                title="Logout from session"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="btn-open-login"
                onClick={onOpenAuth}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase transition cursor-pointer shadow-sm shadow-blue-900/40"
              >
                <Lock className="h-3.5 w-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
