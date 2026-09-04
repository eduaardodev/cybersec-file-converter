import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ConverterView } from './components/ConverterView';
import { HistoryView } from './components/HistoryView';
import { SecurityDemoView } from './components/SecurityDemoView';
import { AuthModal } from './components/AuthModal';
import { api } from './services/api';
import { User, ConversionJob, DashboardStats } from './types/client';

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [conversions, setConversions] = useState<ConversionJob[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Initial user check
  const refreshUser = async () => {
    if (!api.getToken()) return;
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch {
      api.setToken(null);
      setUser(null);
    }
  };

  // Fetch stats and conversions
  const refreshData = async () => {
    if (!user) return;
    try {
      const [statsData, convData] = await Promise.all([
        api.getStats().catch(() => null),
        api.getConversions().catch(() => ({ conversions: [] })),
      ]);
      if (statsData) setStats(statsData);
      if (convData?.conversions) setConversions(convData.conversions);
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (user) {
      refreshData();
      const interval = setInterval(refreshData, 5000);
      return () => clearInterval(interval);
    } else {
      setStats(null);
      setConversions([]);
    }
  }, [user]);

  // Quick 1-click Demo Login for Academic Evaluation
  const handleQuickDemoLogin = async () => {
    try {
      const res = await api.login('demo@converter.local', 'Demo1234!');
      setUser(res.user);
      showToast('Authenticated as demo@converter.local (Admin)');
    } catch (err: any) {
      showToast(err.message || 'Demo login failed');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setUser(null);
    showToast('Logged out successfully');
  };

  const handleDownload = async (id: string, filename: string) => {
    try {
      await api.downloadConversion(id, filename);
      showToast(`Downloaded ${filename}`);
      refreshData();
    } catch (err: any) {
      showToast(err.message || 'Download failed');
    }
  };

  const activeJobsCount = conversions.filter(
    (c) => c.status === 'processing' || c.status === 'pending'
  ).length;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-300 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onQuickDemoLogin={handleQuickDemoLogin}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          activeJobsCount={activeJobsCount}
        />

        {/* View Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto bg-[#0a0a0c]">
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              conversions={conversions}
              onNavigateToConvert={() => setCurrentTab('convert')}
              onNavigateToSecurity={() => setCurrentTab('security-demo')}
              onDownload={handleDownload}
            />
          )}

          {currentTab === 'convert' && (
            <ConverterView
              onConversionCreated={() => {
                refreshData();
                showToast('Conversion job finished successfully!');
              }}
              onDownload={handleDownload}
              isAuthenticated={!!user}
              onRequireAuth={() => setIsAuthOpen(true)}
            />
          )}

          {currentTab === 'history' && (
            <HistoryView
              conversions={conversions}
              onDownload={handleDownload}
              onNavigateToConvert={() => setCurrentTab('convert')}
            />
          )}

          {currentTab === 'security-demo' && <SecurityDemoView />}
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={(loggedUser) => {
          setUser(loggedUser);
          showToast(`Welcome, ${loggedUser.email}`);
        }}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-[#13151a] border border-slate-700 text-xs text-slate-200 shadow-xl animate-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}
