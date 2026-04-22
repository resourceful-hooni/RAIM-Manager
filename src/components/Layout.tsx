import React, { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router';
import { Home, BarChart2, Clock, Settings, Wifi, WifiOff, LogIn, LogOut, Bot, ChevronRight } from 'lucide-react';
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
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 bg-slate-200 rounded-full mb-4"></div>
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 max-w-sm w-full text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner overflow-hidden transform rotate-3">
            {!logoError ? (
              <img src="/logo.png" alt="RAIM Logo" className="w-full h-full object-cover transform -rotate-3" referrerPolicy="no-referrer" onError={() => setLogoError(true)} />
            ) : (
              <Bot className="w-10 h-10 transform -rotate-3" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">RAIM 방문자 관리</h1>
          <p className="text-sm text-slate-500 mb-10 font-medium">서울 로봇AI 과학관 무인자동차 연구소</p>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>관리자 로그인</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        </div>
        <div className="mt-8 text-xs text-slate-400 font-medium">
          © 2026 Seoul Robot & AI Museum
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3.5 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 z-10 sticky top-0">
        <NavLink to="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity group">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100 shadow-sm overflow-hidden shrink-0 group-hover:shadow-md transition-all">
            {!logoError ? (
              <img src="/logo.png" alt="RAIM Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={() => setLogoError(true)} />
            ) : (
              <Bot className="w-5 h-5" />
            )}
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-[13px] leading-tight tracking-tight text-slate-900">RAIM 무인자동차 연구소</h1>
            <span className="text-[10px] font-medium text-slate-500">방문자 카운터</span>
          </div>
        </NavLink>
        <div className="flex items-center space-x-3 text-xs">
          {isOnline ? (
            <div className="flex items-center space-x-1.5 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-emerald-700 font-medium">Online</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-full">
              <WifiOff className="w-3 h-3 text-rose-500" />
              <span className="text-rose-700 font-medium">Offline</span>
            </div>
          )}
          <button onClick={signOut} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all active:scale-95" title="로그아웃">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 pt-2">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-[env(safe-area-inset-bottom)] z-50">
        <div className="flex justify-around items-center h-16 px-2 max-w-md mx-auto">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="카운터" />
          <NavItem to="/dashboard" icon={<BarChart2 className="w-5 h-5" />} label="대시보드" />
          <NavItem to="/history" icon={<Clock className="w-5 h-5" />} label="기록" />
          <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="설정" />
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
          "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 active:scale-95",
          isActive 
            ? "text-blue-600 bg-blue-50/80 font-bold" 
            : "text-slate-400 hover:text-slate-600 hover:bg-slate-50 font-medium"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={cn("transition-transform", isActive ? "scale-110" : "scale-100")}>
            {icon}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">{label}</span>
        </>
      )}
    </NavLink>
  );
}
