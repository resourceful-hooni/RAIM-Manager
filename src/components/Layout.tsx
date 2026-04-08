import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router';
import { Home, BarChart2, Clock, Settings, Wifi, WifiOff, LogIn, LogOut, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import { useFirestoreSync } from '@/store/useStore';

export default function Layout() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, signIn, signOut, loading } = useAuth();
  const [logoError, setLogoError] = useState(false);
  
  // Initialize Firestore sync
  useFirestoreSync();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-sm w-full text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border border-blue-200 shadow-sm overflow-hidden">
            {!logoError ? (
              <img src="/logo.png" alt="RAIM Logo" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
            ) : (
              <Bot className="w-8 h-8" />
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">RAIM 방문자 관리</h1>
          <p className="text-sm text-slate-500 mb-8">관리자 계정으로 로그인해주세요.</p>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            <LogIn className="w-4 h-4" />
            <span>Google 로그인</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center border border-blue-200 shadow-sm overflow-hidden shrink-0">
            {!logoError ? (
              <img src="/logo.png" alt="RAIM Logo" className="w-full h-full object-cover" onError={() => setLogoError(true)} />
            ) : (
              <Bot className="w-5 h-5" />
            )}
          </div>
          <h1 className="font-bold text-sm tracking-tight truncate max-w-[180px] sm:max-w-none text-slate-800">RAIM 무인자동차방문자 프로그램</h1>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          {isOnline ? (
            <span className="flex items-center text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
              <Wifi className="w-4 h-4 mr-1" /> Online
            </span>
          ) : (
            <span className="flex items-center text-rose-600 bg-rose-100 px-2 py-1 rounded-full">
              <WifiOff className="w-4 h-4 mr-1" /> Offline
            </span>
          )}
          <button onClick={signOut} className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 rounded-full">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 pb-[env(safe-area-inset-bottom)] z-50">
        <div className="flex justify-around items-center h-16 px-2">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="Counter" />
          <NavItem to="/dashboard" icon={<BarChart2 className="w-5 h-5" />} label="Dashboard" />
          <NavItem to="/history" icon={<Clock className="w-5 h-5" />} label="History" />
          <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="Settings" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
          isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-900"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={cn("transition-transform", isActive ? "scale-110" : "scale-100")}>
            {icon}
          </div>
          <span className="text-[10px] font-medium">{label}</span>
        </>
      )}
    </NavLink>
  );
}
