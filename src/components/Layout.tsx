import React, { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink } from 'react-router';
import { Home, BarChart2, Clock, Settings, Wifi, WifiOff, LogIn, LogOut, Bot, ChevronRight, Car, Coffee, RefreshCw, KeyRound, BookOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { cn, validatePin } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import { useStore, useFirestoreSync, ProgramType } from '@/store/useStore';
import UserManual from './UserManual';
import GlobalActionBanner from './GlobalActionBanner';

export default function Layout() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user, signIn, signOut, loading, isAuthorized } = useAuth();
  const [logoError, setLogoError] = useState(false);
  
  // Easter Egg State
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogoClick = () => {
    setLogoClickCount(prev => prev + 1);
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => setLogoClickCount(0), 1000);
  };

  useEffect(() => {
    // Preload Easter Egg image
    const img = new Image();
    img.src = '/pop.png?v=1.9.0';
  }, []);

  useEffect(() => {
    if (logoClickCount === 5) {
      setShowEasterEgg(true);
      setTimeout(() => setShowEasterEgg(false), 5000); // Hide after 5 seconds
      setLogoClickCount(0);
    }
  }, [logoClickCount]);
  
  const activeProgram = useStore(state => state.activeProgram);
  const setActiveProgram = useStore(state => state.setActiveProgram);
  const appPin = useStore(state => state.appPin);
  const updateAppPin = useStore(state => state.updateAppPin);
  const [hasSelectedProgram, setHasSelectedProgram] = useState(() => {
    return localStorage.getItem('hasSelectedProgram') === 'true';
  });

  const [pinInput, setPinInput] = useState('');
  const [isPinVerified, setIsPinVerified] = useState(() => {
    return sessionStorage.getItem('isPinVerified') === 'true';
  });
  const [pinError, setPinError] = useState(false);
  const [isPinResetMode, setIsPinResetMode] = useState(false);
  const [isManualOpen, setIsManualOpen] = useState(false);

  // Rate Limit & Lockout State
  const [failedAttempts, setFailedAttempts] = useState(() => {
    return Number(localStorage.getItem('pin_failed_attempts') || '0');
  });
  const [lockedUntil, setLockedUntil] = useState(() => {
    return Number(localStorage.getItem('pin_locked_until') || '0');
  });
  const [remainingLockTime, setRemainingLockTime] = useState(0);

  useEffect(() => {
    const checkLock = () => {
      const now = Date.now();
      if (now < lockedUntil) {
        setRemainingLockTime(Math.ceil((lockedUntil - now) / 1000));
      } else {
        setRemainingLockTime(0);
      }
    };
    checkLock();
    const interval = setInterval(checkLock, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const getLockDuration = (attempts: number) => {
    if (attempts < 5) return 0;
    if (attempts === 5) return 1;
    if (attempts === 6) return 5;
    if (attempts === 7) return 30;
    return 300; // 5 minutes (300s)
  };

  // Initialize Firestore sync
  useFirestoreSync();

  const handleProgramSelect = (program: ProgramType) => {
    setActiveProgram(program);
    setHasSelectedProgram(true);
    localStorage.setItem('hasSelectedProgram', 'true');
  };

  const handleSignOut = () => {
    signOut();
    setHasSelectedProgram(false);
    localStorage.removeItem('hasSelectedProgram');
    setIsPinVerified(false);
    sessionStorage.removeItem('isPinVerified');
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (remainingLockTime > 0) {
      toast.error(`보안 잠금 상태입니다. ${remainingLockTime}초 후 다시 시도해 주세요.`);
      return;
    }

    if (pinInput === appPin) {
      setIsPinVerified(true);
      sessionStorage.setItem('isPinVerified', 'true');
      setPinError(false);
      setFailedAttempts(0);
      localStorage.setItem('pin_failed_attempts', '0');
      localStorage.removeItem('pin_locked_until');
      toast.success('로그인에 성공하였습니다.');
    } else {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);
      localStorage.setItem('pin_failed_attempts', String(newAttempts));
      setPinError(true);
      setPinInput('');

      const duration = getLockDuration(newAttempts);
      if (duration > 0) {
        const until = Date.now() + duration * 1000;
        setLockedUntil(until);
        localStorage.setItem('pin_locked_until', String(until));
        toast.error(`비밀번호가 일치하지 않습니다. ${duration}초 동안 입력이 제한됩니다.`);
      } else {
        toast.error(`비밀번호가 일치하지 않습니다. (실패 횟수: ${newAttempts}/5)`);
      }
    }
  };

  const handlePinResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.email !== 'wlgns1232356@gmail.com') {
      toast.error('비밀번호를 초기화할 권한이 없습니다. 최고 관리자 계정으로 접속해 주세요.');
      return;
    }

    const valResult = validatePin(pinInput);
    if (!valResult.isValid) {
      toast.error(valResult.error || '취약한 비밀번호 또는 잘못된 형식입니다.');
      return;
    }

    await updateAppPin(pinInput);
    setIsPinResetMode(false);
    setPinInput('');
    setPinError(false);
    toast.success('보안 비밀번호가 성공적으로 변경되었습니다.');
  };

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
      <div className="flex items-center justify-center h-[100dvh] bg-transparent text-brand-muted">
        <div className="animate-pulse flex flex-col items-center bg-white/40 p-8 rounded-3xl backdrop-blur-xl border border-white shadow-sm">
          <div className="w-12 h-12 bg-white/60 rounded-full mb-4 border border-white/80"></div>
          <div className="h-4 w-24 bg-white/60 rounded border border-white/80"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-transparent p-4">
        <div className="bg-white/50 backdrop-blur-[24px] p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/80 max-w-sm w-full text-center relative overflow-hidden">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/60 backdrop-blur-md text-brand-dark rounded-2xl flex items-center justify-center border border-white/80 shadow-md overflow-hidden transform rotate-3">
            {!logoError ? (
              <img src={`https://science.seoul.go.kr/RAIM/resource/www/img/favicon32.png`} alt="RAIM Logo" className="w-full h-full object-contain p-2 transform -rotate-3" referrerPolicy="no-referrer" onError={() => setLogoError(true)} />
            ) : (
              <Bot className="w-10 h-10 transform -rotate-3" />
            )}
          </div>
          <h1 className="text-2xl font-extrabold text-brand-black mb-2 tracking-tight">RAIM 방문자 관리</h1>
          <p className="text-sm text-brand-muted mb-10 font-medium">서울 로봇인공지능과학관 통계 시스템</p>
          <button
            onClick={signIn}
            className="w-full flex items-center justify-center space-x-2 bg-brand-dark hover:bg-brand-blue text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
          >
            <LogIn className="w-4 h-4" />
            <span>관리자 로그인</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
          </button>
        </div>
        <div className="mt-8 flex flex-col items-center space-y-3">
          <img src="https://science.seoul.go.kr/RAIM/resource/www/img/footer_logo.png" alt="Seoul Robot & AI Museum" className="h-6 opacity-60" />
          <img src="https://science.seoul.go.kr/RAIM/resource/www/img/logo_wa.png" alt="Web Accessibility" className="h-8 opacity-50" />
          <div className="text-xs text-brand-muted font-medium mt-2">
            © 2026 Seoul Robot & AI Museum
          </div>
        </div>
      </div>
    );
  }

  if (!isPinVerified) {
    const isButtonDisabled = isPinResetMode 
      ? (pinInput.length !== 6 && pinInput.length !== 8)
      : (pinInput.length !== 6 && pinInput.length !== 8);

    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-transparent p-4">
        <div className="bg-white/50 backdrop-blur-[24px] p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/80 max-w-sm w-full text-center relative overflow-hidden">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/60 backdrop-blur-md text-brand-dark rounded-2xl flex items-center justify-center border border-white/80 shadow-md overflow-hidden">
            <KeyRound className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-extrabold text-brand-black mb-2 tracking-tight">
            {isPinResetMode ? '비밀번호 초기화' : '보안 비밀번호'}
          </h1>
          <p className="text-sm text-brand-muted mb-8 font-medium">
            {isPinResetMode ? '새로운 6자리 또는 8자리 숫자를 입력해주세요' : '숫자 6자리 또는 8자리를 입력해주세요'}
          </p>
          <form onSubmit={isPinResetMode ? handlePinResetSubmit : handlePinSubmit} className="space-y-4">
            {remainingLockTime > 0 && !isPinResetMode ? (
              <div className="text-center py-6 px-4 bg-rose-50/70 backdrop-blur-sm border border-rose-100 text-rose-600 rounded-2xl font-semibold text-xs shadow-inner animate-pulse">
                <p className="mb-2 text-rose-500 font-extrabold">
                  비밀번호 {failedAttempts}회 연속 실패로 잠금되었습니다.
                </p>
                <span className="text-3xl font-black text-rose-700">{remainingLockTime}초</span> 후 재시도 가능
              </div>
            ) : (
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value.replace(/[^0-9]/g, ''));
                  setPinError(false);
                }}
                placeholder={isPinResetMode ? "새 비밀번호" : "비밀번호"}
                className={cn(
                  "w-full text-center text-2xl tracking-widest bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl px-4 py-4 font-bold text-brand-dark focus:outline-none shadow-inner transition-all",
                  pinError 
                    ? "border-rose-400 bg-rose-50/50 text-rose-600" 
                    : " "
                )}
                autoFocus
              />
            )}
            {pinError && !isPinResetMode && remainingLockTime === 0 && (
              <p className="text-rose-500 text-xs font-bold animate-bounce">비밀번호가 일치하지 않습니다.</p>
            )}
            <button
              type="submit"
              disabled={isButtonDisabled || (remainingLockTime > 0 && !isPinResetMode)}
              className="w-full flex items-center justify-center space-x-2 bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
            >
              <span>{isPinResetMode ? '비밀번호 재설정' : '확인'}</span>
            </button>
          </form>
          <div className="mt-6 flex flex-col items-center space-y-3">
            {user?.email === 'wlgns1232356@gmail.com' && (
              <button 
                onClick={() => {
                  setIsPinResetMode(!isPinResetMode);
                  setPinInput('');
                  setPinError(false);
                }} 
                className="text-xs text-brand-blue font-bold hover:text-brand-dark transition-colors"
              >
                {isPinResetMode ? '로그인으로 돌아가기' : '비밀번호 초기화 (최고 관리자)'}
              </button>
            )}
            <button onClick={handleSignOut} className="text-xs text-brand-muted font-bold hover:text-brand-dark transition-colors">
              다른 계정으로 로그인
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!hasSelectedProgram) {
    return (
      <div className="flex flex-col items-center justify-center h-[100dvh] bg-transparent p-4">
        <div className="bg-white/50 backdrop-blur-[24px] p-8 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/80 max-w-md w-full text-center relative overflow-hidden">
          <h1 className="text-2xl font-extrabold text-brand-black mb-2 tracking-tight">체험관 선택</h1>
          <p className="text-sm text-brand-muted mb-8 font-medium">관리할 체험관을 선택해주세요</p>
          
          <div className="space-y-4">
            <button
              onClick={() => handleProgramSelect('무인자동차')}
              className="w-full flex items-center p-4 bg-white/50 hover:bg-white/80 border border-white/60 rounded-2xl transition-all group active:scale-95 text-left shadow-sm hover:shadow-md relative overflow-hidden"
            >
              <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-sm text-brand-blue mr-4 group-hover:scale-110 transition-transform relative z-10">
                <Car className="w-6 h-6" />
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="font-extrabold text-brand-dark text-lg">무인자동차 연구소</h3>
                <p className="text-xs text-brand-muted font-medium">자율/예약 관람 병행</p>
              </div>
            </button>
            <button
              onClick={() => handleProgramSelect('스낵헌터')}
              className="w-full flex items-center p-4 bg-white/50 hover:bg-white/80 border border-white/60 rounded-2xl transition-all group active:scale-95 text-left shadow-sm hover:shadow-md relative overflow-hidden"
            >
              <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-sm text-brand-light mr-4 group-hover:scale-110 transition-transform relative z-10">
                <Coffee className="w-6 h-6" />
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="font-extrabold text-brand-dark text-lg">로봇팔 스낵헌터</h3>
                <p className="text-xs text-brand-muted font-medium">자율/예약 관람 병행</p>
              </div>
            </button>
            <button
              onClick={() => handleProgramSelect('메디봇')}
              className="w-full flex items-center p-4 bg-white/50 hover:bg-white/80 border border-white/60 rounded-2xl transition-all group active:scale-95 text-left shadow-sm hover:shadow-md relative overflow-hidden"
            >
              <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-sm text-teal-600 mr-4 group-hover:scale-110 transition-transform relative z-10">
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="font-extrabold text-brand-dark text-lg">수술로봇 메디봇</h3>
                <p className="text-xs text-brand-muted font-medium">자율/예약 관람 병행</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-transparent text-brand-black font-sans overflow-hidden selection:bg-brand-blue/20 selection:text-brand-dark relative">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)_+_0.875rem)] pb-3.5 bg-white/60 backdrop-blur-[20px] border-b border-white/80 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center space-x-2">
          <NavLink to="/" onClick={handleLogoClick} className="flex items-center space-x-3 hover:opacity-85 transition-opacity group">
            <div className="w-9 h-9 bg-white/60 backdrop-blur-sm text-brand-dark rounded-xl flex items-center justify-center border border-white/80 shadow-sm overflow-hidden shrink-0 group-hover:shadow-md transition-all">
              {!logoError ? (
                <img src={`https://science.seoul.go.kr/RAIM/resource/www/img/favicon32.png`} alt="RAIM Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" onError={() => setLogoError(true)} />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="font-extrabold text-base tracking-tight text-brand-dark leading-tight flex items-center">
                RAIM {activeProgram}
              </h1>
              <span className="text-xs font-bold text-brand-muted mt-0.5">방문자 카운터</span>
            </div>
          </NavLink>
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setHasSelectedProgram(false);
              localStorage.removeItem('hasSelectedProgram');
            }}
            className="p-1 bg-white/80 hover:bg-white border border-transparent rounded-full shadow-sm text-brand-muted hover:text-brand-dark transition-all duration-300 hover:rotate-180 cursor-pointer flex items-center justify-center shrink-0 w-6 h-6 ml-1 focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none"
            title="체험관 변경"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center space-x-3 text-xs">
          <button 
            onClick={() => setIsManualOpen(true)}
            className="flex items-center space-x-1.5 bg-white/60 border border-white/80 shadow-sm text-brand-blue px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-white/80 transition-all active:scale-95 cursor-pointer focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>설명서</span>
          </button>
          {isOnline ? (
            <div className="flex items-center space-x-1.5 bg-brand-cyan/20 border border-brand-cyan/30 px-2.5 py-1.5 rounded-xl">
              <div className="w-1.5 h-1.5 bg-brand-cyan rounded-full animate-pulse"></div>
              <span className="text-brand-dark font-bold text-xs tracking-wider uppercase">Online</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-rose-100/50 border border-rose-200/50 px-2.5 py-1.5 rounded-xl">
              <WifiOff className="w-3 h-3 text-rose-600" />
              <span className="text-rose-700 font-bold text-xs tracking-wider uppercase">Offline</span>
            </div>
          )}
          <button onClick={handleSignOut} className="p-2 text-brand-muted hover:text-brand-dark hover:bg-white/50 rounded-xl transition-all active:scale-95" title="로그아웃">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Global Action Info */}
      <GlobalActionBanner />
      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-[calc(6rem_+_env(safe-area-inset-bottom))] pt-2">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-[24px] saturate-[1.2] border-t border-white/80 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]" style={{ WebkitBackdropFilter: "blur(24px) saturate(1.2)" }}>
        <div className="flex justify-around items-center h-16 px-2 max-w-md mx-auto">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="카운터" />
          <NavItem to="/dashboard" icon={<BarChart2 className="w-5 h-5" />} label="대시보드" />
          <NavItem to="/history" icon={<Clock className="w-5 h-5" />} label="기록" />
          <NavItem to="/settings" icon={<Settings className="w-5 h-5" />} label="설정" />
        </div>
      </nav>

      {/* Easter Egg */}
      {showEasterEgg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in duration-300"></div>
          <div className="relative z-10 animate-in zoom-in duration-300 animate-[bounce_2s_infinite]">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-10 py-5 rounded-3xl font-black text-6xl shadow-[0_10px_40px_rgba(250,204,21,0.6)] whitespace-nowrap transform -rotate-12 border-4 border-white">
              POP!! 💥
            </div>
            <img 
              src="/pop.png?v=1.9.0" 
              alt="Easter Egg" 
              className="w-[85vw] h-[85vw] max-w-2xl max-h-2xl object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      )}

      {/* User Manual Modal */}
      {isManualOpen && (
        <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-white/80 backdrop-blur-[24px] rounded-[2rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/80">
            <div className="flex items-center justify-between p-5 border-b border-white/50 bg-white/50">
              <div className="flex items-center space-x-2">
                <div className="bg-brand-blue/10 p-2 rounded-xl text-brand-blue border border-brand-blue/20">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-brand-dark tracking-tight">시스템 사용 설명서</h2>
              </div>
              <button 
                onClick={() => setIsManualOpen(false)}
                className="p-2 text-brand-muted hover:text-brand-dark hover:bg-white/50 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 overflow-y-auto flex-1 bg-white/10 relative">
              <UserManual />
            </div>
            <div className="p-4 border-t border-white/50 bg-white/50">
              <button
                onClick={() => setIsManualOpen(false)}
                className="w-full py-3 bg-brand-dark hover:bg-brand-black text-white rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={({ isActive }) =>
        cn(
          "flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-all duration-200 active:scale-95 outline-none focus:outline-none relative",
          
          isActive 
            ? "text-brand-dark font-black bg-brand-blue/10" 
            : "text-brand-muted hover:text-brand-dark font-medium"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={cn("transition-transform relative z-10", isActive ? "scale-110" : "scale-100")}>
            {icon}
          </div>
          <span className="text-[11px] mt-1 tracking-tight relative z-10">{label}</span>
        </>
      )}
    </NavLink>
  );
}
