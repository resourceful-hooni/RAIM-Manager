import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Outlet, NavLink } from 'react-router';
import { Home, BarChart2, Clock, ClipboardList, Settings, WifiOff, LogIn, LogOut, Bot, ChevronRight, Car, Coffee, RefreshCw, KeyRound, BookOpen, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, validatePin } from '@/lib/utils';
import { useAuth } from './AuthProvider';
import { useStore, useFirestoreSync, ProgramType } from '@/store/useStore';
import UserManual from './UserManual';
import GlobalActionBanner from './GlobalActionBanner';
import RobotCursor from './RobotCursor';

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
    img.src = '/pop.svg';
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
  // 체험관 변경은 집계 대상이 바뀌는 동작이라 확인을 한 번 받는다.
  const [isProgramSwitchConfirmOpen, setIsProgramSwitchConfirmOpen] = useState(false);
  // 헤더에서 변경을 눌러 선택 화면으로 온 경우에만 '취소'로 되돌아갈 수 있다.
  const [isSwitchingProgram, setIsSwitchingProgram] = useState(false);

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
    setIsSwitchingProgram(false);
    localStorage.setItem('hasSelectedProgram', 'true');
  };

  const confirmProgramSwitch = useCallback(() => {
    setIsProgramSwitchConfirmOpen(false);
    setIsSwitchingProgram(true);
    setHasSelectedProgram(false);
    localStorage.removeItem('hasSelectedProgram');
  }, []);

  const cancelProgramSwitch = useCallback(() => {
    setHasSelectedProgram(true);
    setIsSwitchingProgram(false);
    localStorage.setItem('hasSelectedProgram', 'true');
  }, []);

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

  // 아래 화면들은 조건부로 렌더되지만, 훅은 항상 같은 순서로 호출되어야 한다.
  const isPinGateVisible = !loading && !!user && !isPinVerified;
  const isProgramPickerVisible = !loading && !!user && isPinVerified && !hasSelectedProgram;

  const closeManual = useCallback(() => setIsManualOpen(false), []);
  const closeProgramSwitchConfirm = useCallback(() => setIsProgramSwitchConfirmOpen(false), []);
  const exitPinResetMode = useCallback(() => {
    setIsPinResetMode(false);
    setPinInput('');
    setPinError(false);
  }, []);

  const manualDialogRef = useModalA11y(isManualOpen, closeManual);
  const programSwitchDialogRef = useModalA11y(isProgramSwitchConfirmOpen, closeProgramSwitchConfirm);
  const pinDialogRef = useModalA11y(isPinGateVisible, isPinResetMode ? exitPinResetMode : undefined);
  const programPickerRef = useModalA11y(isProgramPickerVisible, isSwitchingProgram ? cancelProgramSwitch : undefined);

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
          <div className="w-20 h-20 mx-auto mb-6 rounded-[1.25rem] overflow-hidden shadow-lg ring-1 ring-white/70 bg-brand-dark flex items-center justify-center text-white">
            {!logoError ? (
              <img src="/app-icon.svg" alt="" aria-hidden="true" className="w-full h-full" onError={() => setLogoError(true)} />
            ) : (
              <Bot className="w-10 h-10" />
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
          <img src="/raim_logo.png" alt="Seoul Robot & AI Museum" className="h-8 object-contain" />
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
        <div
          ref={pinDialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pin-gate-title"
          tabIndex={-1}
          className="bg-white/50 backdrop-blur-[24px] p-10 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/80 max-w-sm w-full text-center relative overflow-hidden"
        >
          <div className="w-20 h-20 mx-auto mb-6 bg-white/60 backdrop-blur-md text-brand-dark rounded-2xl flex items-center justify-center border border-white/80 shadow-md overflow-hidden">
            <KeyRound className="w-10 h-10" />
          </div>
          <h1 id="pin-gate-title" className="text-2xl font-extrabold text-brand-black mb-2 tracking-tight">
            {isPinResetMode ? '비밀번호 초기화' : '보안 비밀번호'}
          </h1>
          <p className="text-sm text-brand-muted mb-8 font-medium">
            {isPinResetMode ? '새로운 6자리 또는 8자리 숫자를 입력해주세요' : '숫자 6자리 또는 8자리를 입력해주세요'}
          </p>
          <form onSubmit={isPinResetMode ? handlePinResetSubmit : handlePinSubmit} className="space-y-4">
            {remainingLockTime > 0 && !isPinResetMode ? (
              <div className="text-center py-6 px-4 bg-rose-50/70 backdrop-blur-sm border border-rose-100 text-rose-700 rounded-2xl font-semibold text-xs shadow-inner animate-pulse" role="alert">
                <p className="mb-2 text-rose-700 font-extrabold">
                  비밀번호 <span className="tnum">{failedAttempts}</span>회 연속 실패로 잠금되었습니다.
                </p>
                <span className="text-3xl font-black text-rose-700 tnum">{remainingLockTime}초</span> 후 재시도 가능
              </div>
            ) : (
              <>
                <label htmlFor="app-pin-input" className="sr-only">
                  {isPinResetMode ? '새 보안 비밀번호 (숫자 6자리 또는 8자리)' : '보안 비밀번호 (숫자 6자리 또는 8자리)'}
                </label>
                <input
                  id="app-pin-input"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/[^0-9]/g, ''));
                    setPinError(false);
                  }}
                  placeholder={isPinResetMode ? "새 비밀번호" : "비밀번호"}
                  aria-invalid={pinError}
                  aria-describedby={pinError && !isPinResetMode ? 'app-pin-error' : undefined}
                  className={cn(
                    "w-full text-center text-2xl tracking-widest tnum bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl px-4 py-4 font-bold text-brand-dark shadow-inner transition-all",
                    pinError
                      ? "border-rose-400 bg-rose-50/50 text-rose-600"
                      : " "
                  )}
                  autoFocus
                />
              </>
            )}
            {pinError && !isPinResetMode && remainingLockTime === 0 && (
              <p id="app-pin-error" role="alert" className="text-rose-600 text-xs font-bold animate-bounce">비밀번호가 일치하지 않습니다.</p>
            )}
            <button
              type="submit"
              disabled={isButtonDisabled || (remainingLockTime > 0 && !isPinResetMode)}
              className="w-full flex items-center justify-center space-x-2 bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed hover:bg-brand-blue text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95"
            >
              <span>{isPinResetMode ? '비밀번호 재설정' : '확인'}</span>
            </button>
          </form>
          <div className="mt-4 flex flex-col items-center">
            {user?.email === 'wlgns1232356@gmail.com' && (
              <button
                type="button"
                onClick={() => {
                  setIsPinResetMode(!isPinResetMode);
                  setPinInput('');
                  setPinError(false);
                }}
                className="inline-flex items-center justify-center min-h-11 px-3 rounded-xl text-xs text-brand-blue font-bold hover:text-brand-dark hover:bg-white/50 transition-colors"
              >
                {isPinResetMode ? '로그인으로 돌아가기' : '비밀번호 초기화 (최고 관리자)'}
              </button>
            )}
            <button type="button" onClick={handleSignOut} className="inline-flex items-center justify-center min-h-11 px-3 rounded-xl text-xs text-brand-muted font-bold hover:text-brand-dark hover:bg-white/50 transition-colors">
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
        <div
          ref={programPickerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="program-picker-title"
          tabIndex={-1}
          className="bg-white/50 backdrop-blur-[24px] p-8 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/80 max-w-md w-full text-center relative overflow-hidden"
        >
          <h1 id="program-picker-title" className="text-2xl font-extrabold text-brand-black mb-2 tracking-tight">체험관 선택</h1>
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
              <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl shadow-sm text-brand-dark mr-4 group-hover:scale-110 transition-transform relative z-10">
                <Bot className="w-6 h-6" />
              </div>
              <div className="flex-1 relative z-10">
                <h3 className="font-extrabold text-brand-dark text-lg">수술로봇 메디봇</h3>
                <p className="text-xs text-brand-muted font-medium">자율/예약 관람 병행</p>
              </div>
            </button>
          </div>

          {isSwitchingProgram && (
            <button
              type="button"
              onClick={cancelProgramSwitch}
              className="mt-6 inline-flex items-center justify-center min-h-11 px-4 rounded-xl text-sm font-bold text-brand-muted hover:text-brand-dark hover:bg-white/60 transition-colors"
            >
              취소하고 {activeProgram}(으)로 돌아가기
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-transparent text-brand-black font-sans overflow-hidden selection:bg-brand-blue/20 selection:text-brand-dark relative">
      {/* Header */}
      <header className="flex items-center justify-between gap-2 px-3 sm:px-5 pt-[calc(env(safe-area-inset-top)_+_0.75rem)] pb-3 bg-white/60 backdrop-blur-[20px] border-b border-white/80 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center min-w-0">
          <NavLink to="/" onClick={handleLogoClick} className="flex items-center gap-2.5 min-w-0 rounded-2xl hover:opacity-85 transition-opacity group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-sm ring-1 ring-white/70 group-hover:shadow-md transition-all bg-brand-dark flex items-center justify-center text-white">
              {!logoError ? (
                <img src="/app-icon.svg" alt="" aria-hidden="true" className="w-full h-full" onError={() => setLogoError(true)} />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight leading-tight truncate">
                <span className="text-brand-dark">RAIM</span>{' '}
                <span className="text-brand-blue">{activeProgram}</span>
              </h1>
              <span className="text-2xs sm:text-xs font-bold text-brand-muted mt-0.5 truncate">방문자 카운터</span>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={() => setIsProgramSwitchConfirmOpen(true)}
            className="group ml-1.5 sm:ml-2.5 shrink-0 min-h-11 min-w-11 flex items-center justify-center bg-white/80 hover:bg-white border border-white/80 rounded-full shadow-sm text-brand-muted hover:text-brand-dark transition-colors cursor-pointer"
            title="체험관 변경"
            aria-label="체험관 변경"
          >
            <RefreshCw className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
          </button>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsManualOpen(true)}
            aria-label="설명서"
            className="flex items-center justify-center gap-1.5 min-h-11 min-w-11 sm:px-3 bg-white/60 border border-white/80 shadow-sm text-brand-blue rounded-xl text-xs font-bold hover:bg-white/80 transition-all active:scale-95 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 shrink-0" aria-hidden="true" />
            {/* 360px에서는 글자가 한 자씩 줄바꿈되어 헤더가 무너지므로 아이콘만 남긴다 */}
            <span className="hidden sm:inline whitespace-nowrap">설명서</span>
          </button>
          <div
            role="status"
            aria-live="polite"
            className={cn(
              "flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border shrink-0",
              isOnline ? "bg-emerald-50/80 border-emerald-200/70" : "bg-rose-50/80 border-rose-200/70"
            )}
          >
            {isOnline ? (
              <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse shrink-0" aria-hidden="true"></span>
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-rose-700 shrink-0" aria-hidden="true" />
            )}
            <span className={cn(
              "hidden sm:inline font-bold text-xs tracking-wider uppercase whitespace-nowrap",
              isOnline ? "text-emerald-800" : "text-rose-700"
            )}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
            {/* 좁은 화면에서는 점/아이콘만 보이지만 상태는 읽을 수 있어야 한다 */}
            <span className="sr-only sm:hidden">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <button type="button" onClick={handleSignOut} className="min-h-11 min-w-11 flex items-center justify-center shrink-0 text-brand-muted hover:text-brand-dark hover:bg-white/50 rounded-xl transition-all active:scale-95" title="로그아웃" aria-label="로그아웃">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Global Action Info */}
      <GlobalActionBanner />
      
      {/* Custom Robot Cursor */}
      <RobotCursor />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-[calc(6rem_+_env(safe-area-inset-bottom))] pt-2">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/60 backdrop-blur-[24px] saturate-[1.2] border-t border-white/80 pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]" style={{ WebkitBackdropFilter: "blur(24px) saturate(1.2)" }}>
        <div className="flex items-center justify-center gap-0.5 sm:gap-1 h-16 px-2 max-w-md sm:max-w-lg mx-auto">
          <NavItem to="/" icon={<Home className="w-5 h-5" />} label="카운터" />
          <NavItem to="/dashboard" icon={<BarChart2 className="w-5 h-5" />} label="대시보드" />
          <NavItem to="/history" icon={<Clock className="w-5 h-5" />} label="기록" />
          <NavItem to="/attendance" icon={<ClipboardList className="w-5 h-5" />} label="출석부" />
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
              src="/pop.svg" 
              alt="Easter Egg" 
              className="w-[85vw] h-[85vw] max-w-2xl max-h-2xl object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            />
          </div>
        </div>
      )}

      {/* User Manual Modal */}
      {isManualOpen && (
        <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-sm z-[100] flex justify-center items-center p-4 animate-fade-in">
          <div
            ref={manualDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manual-dialog-title"
            tabIndex={-1}
            className="bg-white/80 backdrop-blur-[24px] rounded-[2rem] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/80"
          >
            <div className="flex items-center justify-between gap-2 p-5 border-b border-white/50 bg-white/50">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="bg-brand-blue/10 p-2 rounded-xl text-brand-blue border border-brand-blue/20 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h2 id="manual-dialog-title" className="text-lg font-bold text-brand-dark tracking-tight truncate">시스템 사용 설명서</h2>
              </div>
              <button
                type="button"
                onClick={closeManual}
                aria-label="설명서 닫기"
                className="min-h-11 min-w-11 shrink-0 flex items-center justify-center text-brand-muted hover:text-brand-dark hover:bg-white/50 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-0 overflow-y-auto flex-1 bg-white/10 relative">
              <UserManual />
            </div>
            <div className="p-4 border-t border-white/50 bg-white/50">
              <button
                type="button"
                onClick={closeManual}
                className="w-full min-h-11 py-3 bg-brand-dark hover:bg-brand-black text-white rounded-xl font-bold shadow-md transition-all active:scale-95 text-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 체험관 변경 확인 */}
      {isProgramSwitchConfirmOpen && (
        <div className="fixed inset-0 bg-brand-black/40 backdrop-blur-sm z-[110] flex justify-center items-center p-4 animate-fade-in">
          <div
            ref={programSwitchDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="program-switch-title"
            aria-describedby="program-switch-desc"
            tabIndex={-1}
            className="bg-white/80 backdrop-blur-[24px] rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border border-white/80 text-center"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/70 border border-white/80 shadow-sm flex items-center justify-center text-brand-blue">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h2 id="program-switch-title" className="text-lg font-extrabold text-brand-dark tracking-tight">체험관을 변경할까요?</h2>
            <p id="program-switch-desc" className="mt-2 text-sm text-brand-muted font-medium leading-relaxed">
              지금은 <span className="font-bold text-brand-blue">{activeProgram}</span> 기준으로 집계하고 있습니다. 변경하시면 체험관 선택 화면으로 이동합니다.
            </p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={closeProgramSwitchConfirm}
                className="flex-1 min-h-11 rounded-xl bg-white/70 border border-white/80 text-brand-dark text-sm font-bold hover:bg-white shadow-sm transition-all active:scale-95"
              >
                취소
              </button>
              <button
                type="button"
                onClick={confirmProgramSwitch}
                className="flex-1 min-h-11 rounded-xl bg-brand-dark hover:bg-brand-blue text-white text-sm font-bold shadow-md transition-all active:scale-95"
              >
                변경하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 모달 공통 접근성 처리.
 * 열릴 때 포커스를 모달 안으로 옮기고, Tab을 모달 안에 가두고,
 * Esc로 닫고(onClose가 있을 때만), 닫힐 때 직전에 포커스가 있던 곳으로 되돌린다.
 */
function useModalA11y(isOpen: boolean, onClose?: () => void) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusable = (): HTMLElement[] => {
      if (!container) return [];
      const nodes = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const visible: HTMLElement[] = [];
      nodes.forEach((el) => {
        // 화면에 실제로 보이는 요소만 (숨겨진 입력란 등 제외)
        if (el.getClientRects().length > 0) visible.push(el);
      });
      return visible;
    };

    (getFocusable()[0] ?? container)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const close = onCloseRef.current;
        if (close) {
          e.preventDefault();
          close();
        }
        return;
      }
      if (e.key !== 'Tab' || !container) return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!active || !container.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? lastEl : firstEl).focus();
      } else if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  return containerRef;
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <NavLink
      to={to}
      style={{ WebkitTapHighlightColor: "transparent" }}
      className={({ isActive }) =>
        cn(
          "flex-1 basis-0 min-w-0 flex flex-col items-center justify-center h-14 rounded-xl transition-all duration-200 active:scale-95 relative",
          isActive
            ? "text-brand-dark font-black bg-brand-blue/10"
            : "text-brand-muted hover:text-brand-dark font-medium"
        )
      }
    >
      {({ isActive }) => (
        <>
          <div className={cn("transition-transform relative z-10 shrink-0", isActive ? "scale-110" : "scale-100")}>
            {icon}
          </div>
          <span className="text-2xs mt-1 tracking-tight relative z-10 max-w-full truncate">{label}</span>
        </>
      )}
    </NavLink>
  );
}
