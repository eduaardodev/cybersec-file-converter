import React, { useState } from 'react';
import { X, Lock, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types/client';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await api.register(email, password);
        onSuccess(res.user);
      } else {
        const res = await api.login(email, password);
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@converter.local');
    setPassword('Demo1234!');
    setIsRegister(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#13151a] border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight uppercase">
              {isRegister ? 'Create Academic Account' : 'Authenticate to Platform'}
            </h2>
            <p className="text-[11px] text-slate-500">
              Pass-hash authentication with salted bcrypt & JWT authorization
            </p>
          </div>
        </div>

        {/* 1-Click Demo Fill Button */}
        <div className="mb-4 p-3 rounded-lg bg-[#0a0a0c] border border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-300">
            <span className="font-semibold block text-slate-200">Academic Presentation?</span>
            <span className="text-[11px] text-slate-500">Use the pre-seeded evaluation account</span>
          </div>
          <button
            type="button"
            onClick={fillDemoCredentials}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase shadow-sm transition cursor-pointer shrink-0"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Fill Demo
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800/80 flex items-start gap-2.5 text-red-200 text-xs">
            <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block uppercase text-[11px]">Authentication Error</span>
              <span className="text-slate-300">{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full bg-[#0a0a0c] border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-[#0a0a0c] border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-mono">Passwords are never saved in plaintext (Bcrypt 10 rounds).</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs uppercase transition cursor-pointer shadow-sm shadow-blue-900/40"
          >
            {loading ? 'Processing...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          {isRegister ? 'Already have an account?' : "Don't have an account yet?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-blue-400 hover:underline font-bold cursor-pointer"
          >
            {isRegister ? 'Sign In' : 'Create an Account'}
          </button>
        </div>
      </div>
    </div>
  );
};
