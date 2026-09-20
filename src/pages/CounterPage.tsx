import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { useStore, RecordType, Counts, ProgramType } from '@/store/useStore';
import { vibrate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RotateCcw, Plus, Minus, FileText, Clock, Users, Undo2, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// 스케줄 설정
const SESSIONS = {
  '무인자동차': {
    reserved: ['1회차 (10:30)', '2회차 (13:00)', '3회차 (13:30)', '4회차 (15:30)', '5회차 (16:00)', '단체'],
    reservedTimes: [
      { time: 10 * 60 + 30, label: '1회차 (10:30)' },
      { time: 13 * 60, label: '2회차 (13:00)' },
      { time: 13 * 60 + 30, label: '3회차 (13:30)' },
      { time: 15 * 60 + 30, label: '4회차 (15:30)' },
      { time: 16 * 60, label: '5회차 (16:00)' },
    ]
  },
  '스낵헌터': {
    reserved: ['1회차 (11:00)', '2회차 (11:30)', '3회차 (14:00)', '4회차 (14:30)', '5회차 (16:30)', '단체'],
    reservedTimes: [
      { time: 11 * 60, label: '1회차 (11:00)' },
      { time: 11 * 60 + 30, label: '2회차 (11:30)' },
      { time: 14 * 60, label: '3회차 (14:00)' },
      { time: 14 * 60 + 30, label: '4회차 (14:30)' },
      { time: 16 * 60 + 30, label: '5회차 (16:30)' },
    ]
  }
};

export const getSessionsForProgram = (program: ProgramType, dateStr: string) => {
  if (program !== '메디봇') {
    return SESSIONS[program as '무인자동차' | '스낵헌터'];
  }
  
  // Determine if dateStr is weekend
  const [year, month, day] = dateStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day || 1);
  const dayOfWeek = dateObj.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return {
      reserved: ['3회차 (14:30)', '4회차 (15:30)', '단체'],
      reservedTimes: [
        { time: 14 * 60 + 30, label: '3회차 (14:30)' },
        { time: 15 * 60 + 30, label: '4회차 (15:30)' },
      ]
    };
  } else {
    return {
      reserved: ['1회차 (11:00)', '2회차 (13:30)', '3회차 (14:30)', '4회차 (15:30)', '5회차 (16:30)', '단체'],
      reservedTimes: [
        { time: 11 * 60, label: '1회차 (11:00)' },
        { time: 13 * 60 + 30, label: '2회차 (13:30)' },
        { time: 14 * 60 + 30, label: '3회차 (14:30)' },
        { time: 15 * 60 + 30, label: '4회차 (15:30)' },
        { time: 16 * 60 + 30, label: '5회차 (16:30)' },
      ]
    };
  }
};

const AUTONOMOUS_HOURS = Array.from({ length: 8 }, (_, i) => `${10 + i}시`);

// color: 카드 머리말의 점 / addButton: + 버튼 채움색.
// 채움색은 모두 흰 글씨 기준 5:1 이상이라 AA를 통과하면서도 카테고리를 색으로 구분할 수 있다.
const CATEGORIES: { id: string; label: string; color: string; addButton: string; fields: { id: keyof Counts; label: string }[] }[] = [
  { 
    id: 'adult', 
    label: '성인 (Adult)', 
    color: 'bg-blue-500',
    addButton: 'bg-blue-500 hover:bg-blue-600',
    fields: [{ id: 'adult_m', label: '남' }, { id: 'adult_f', label: '여' }]
  },
  { 
    id: 'youth', 
    label: '청소년 (Youth)', 
    color: 'bg-emerald-500',
    addButton: 'bg-emerald-500 hover:bg-emerald-600',
    fields: [{ id: 'youth_m', label: '남' }, { id: 'youth_f', label: '여' }]
  },
  { 
    id: 'child', 
    label: '어린이 (Child)', 
    color: 'bg-amber-500',
    addButton: 'bg-amber-500 hover:bg-amber-600',
    fields: [{ id: 'child_m', label: '남' }, { id: 'child_f', label: '여' }]
  },
  { 
    id: 'infant', 
    label: '유아 (Infant)', 
    color: 'bg-rose-500',
    addButton: 'bg-rose-500 hover:bg-rose-600',
    fields: [{ id: 'infant_m', label: '남' }, { id: 'infant_f', label: '여' }]
  },
];

const TYPE_LABELS: Record<RecordType, string> = {
  autonomous: '자율관람',
  reserved: '예약관람',
};

// '성인 (Adult)' → '성인' (스크린리더 라벨과 카드 제목에 함께 쓴다)
const shortLabel = (label: string) => label.split(' ')[0];

const INITIAL_COUNTS: Counts = {
  adult_m: 0, adult_f: 0,
  youth_m: 0, youth_f: 0,
  child_m: 0, child_f: 0,
  infant_m: 0, infant_f: 0,
  noShow: 0, cancelled: 0
};

const getReservedSlotInfo = (now: Date, program: ProgramType, dateStr: string = format(new Date(), 'yyyy-MM-dd')) => {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const slots = getSessionsForProgram(program, dateStr).reservedTimes;
  
  // 예약관람 5분 전부터 해당 시간으로 카운트 (Add 5 minutes to current time effectively)
  const effectiveTime = timeInMinutes + 5;
  let currentSlot = slots[0];
  
  for (let i = slots.length - 1; i >= 0; i--) {
    if (effectiveTime >= slots[i].time) {
      currentSlot = slots[i];
      break;
    }
  }
  return { currentSlot, timeInMinutes };
};

const getCurrentSession = (type: RecordType, program: ProgramType, now: Date = new Date(), dateStr: string = format(new Date(), 'yyyy-MM-dd')) => {
  if (type === 'autonomous') {
    const hours = now.getHours();
    const currentHour = Math.max(10, Math.min(17, hours));
    return `${currentHour}시`;
  } else {
    return getReservedSlotInfo(now, program, dateStr).currentSlot.label;
  }
};

export default function CounterPage() {
  const activeProgram = useStore(state => state.activeProgram);
  const incrementCount = useStore(state => state.incrementCount);
  const decrementCount = useStore(state => state.decrementCount);
  const resetCounts = useStore(state => state.resetCounts);
  const updateMemo = useStore(state => state.updateMemo);
  const addGroupCount = useStore(state => state.addGroupCount);
  const lastAction = useStore(state => state.lastAction);
  const undoLastAction = useStore(state => state.undoLastAction);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<RecordType>('autonomous');
  const [session, setSession] = useState(getCurrentSession('autonomous', activeProgram));
  const [isAutoSync, setIsAutoSync] = useState(true);
  const [lastTypeSwitchTime, setLastTypeSwitchTime] = useState(0);
  
  // Group Entry Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupCounts, setGroupCounts] = useState<Counts>(INITIAL_COUNTS);
  const [groupMemo, setGroupMemo] = useState('');
  
  const [showUndo, setShowUndo] = useState(false);

  // 메모 디바운스용. 입력 중에는 초안(memoDraft)을 보여주고 저장은 500ms 뒤에 한 번만 한다.
  const [memoDraft, setMemoDraft] = useState<string | null>(null);
  const memoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoFlushRef = useRef<(() => void) | null>(null);

  // 입력 대상(관람 모드 · 회차) 변경 안내용
  const prevTargetRef = useRef<string | null>(null);
  const userSetTargetRef = useRef<string | null>(null);
  const mountedAtRef = useRef(Date.now());

  useEffect(() => {
    if (lastAction) {
      setShowUndo(true);
      const timer = setTimeout(() => {
        setShowUndo(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowUndo(false);
    }
  }, [lastAction]);

  // Ensure session is always valid when program, date, or type changes
  useEffect(() => {
    if (type === 'autonomous') {
      if (!AUTONOMOUS_HOURS.includes(session)) {
        setSession(AUTONOMOUS_HOURS[0]);
      }
    } else {
      const validSessions = getSessionsForProgram(activeProgram, date).reserved;
      if (!validSessions.includes(session)) {
        setSession(validSessions[0]);
      }
    }
  }, [activeProgram, date, type, session]);

  // Auto-sync effect
  useEffect(() => {
    if (!isAutoSync) return;
    
    const updateTime = () => {
      const now = new Date();
      setDate(format(now, 'yyyy-MM-dd'));
      
      let newType = type;
      const todayStr = format(now, 'yyyy-MM-dd');
      let newSession = getCurrentSession(newType, activeProgram, now, todayStr);

      const { currentSlot, timeInMinutes } = getReservedSlotInfo(now, activeProgram, todayStr);
      const sessionAgeMinutes = timeInMinutes - currentSlot.time;

      if (newType === 'reserved') {
        // Check if there hasn't been input recently
        const lastInputAgeMinutes = lastAction ? Math.floor((now.getTime() - lastAction.timestamp) / 60000) : Infinity;
        const manualSwitchAgeMinutes = Math.floor((now.getTime() - lastTypeSwitchTime) / 60000);
        
        // 예약관람 시간 후 20분 경과 && 마지막 입력 후 20분 경과 시 자율관람으로 자동 전환
        if (sessionAgeMinutes > 20 && lastInputAgeMinutes >= 15 && manualSwitchAgeMinutes >= 5) {
          setType('autonomous');
          setLastTypeSwitchTime(now.getTime());
          newType = 'autonomous';
          newSession = getCurrentSession('autonomous', activeProgram, now, todayStr);
        } else {
          newSession = currentSlot.label;
        }
      } else if (newType === 'autonomous') {
        const manualSwitchAgeMinutes = Math.floor((now.getTime() - lastTypeSwitchTime) / 60000);
        // 예약관람 시간대(시작 5분 전 ~ 20분 이후)에 진입하면 자동으로 예약관람으로 전환
        if (sessionAgeMinutes >= -5 && sessionAgeMinutes <= 20 && manualSwitchAgeMinutes >= 1) {
          setType('reserved');
          setLastTypeSwitchTime(now.getTime());
          newType = 'reserved';
          newSession = currentSlot.label;
        }
      }
      
      setSession(newSession);
    };
    
    updateTime(); // Run immediately on type change, auto-sync enable, or lastAction
    const intervalId = setInterval(updateTime, 1000); // Check every 1 second
    
    return () => clearInterval(intervalId);
  }, [isAutoSync, type, lastAction, activeProgram, lastTypeSwitchTime]);

  // 실시간 연동이 관람 모드/회차를 바꾸면 조용히 넘어가지 않고 알린다.
  // 연동 로직은 건드리지 않고 결과만 관찰한다.
  useEffect(() => {
    const target = `${type}|${session}`;
    const prev = prevTargetRef.current;
    prevTargetRef.current = target;

    if (prev === null || prev === target) return;

    // 사용자가 직접 바꾼 경우에는 해당 핸들러가 이미 안내했다
    if (userSetTargetRef.current === target) {
      userSetTargetRef.current = null;
      return;
    }

    // 첫 렌더 직후 연동이 현재 시각에 맞추는 것은 '변경'이 아니라 초기 설정이다
    if (Date.now() - mountedAtRef.current < 1500) return;

    toast.info(`입력 대상이 ${TYPE_LABELS[type]} · ${session}(으)로 바뀌었습니다.`, {
      description: '실시간 연동이 시각에 맞춰 회차를 바꿨습니다. 카운트할 회차가 맞는지 확인해 주세요.',
    });
  }, [type, session]);

  const record = useStore(useCallback((state: any) => state.records.find((r: any) => r.date === date && r.type === type && r.session === session && (r.program || '무인자동차') === activeProgram), [date, type, session, activeProgram])) as any;
  const rawCounts = record?.counts || INITIAL_COUNTS;
  const counts = {
    adult_m: rawCounts.adult_m || 0,
    adult_f: rawCounts.adult_f || 0,
    youth_m: rawCounts.youth_m || 0,
    youth_f: rawCounts.youth_f || 0,
    child_m: rawCounts.child_m || 0,
    child_f: rawCounts.child_f || 0,
    infant_m: rawCounts.infant_m || 0,
    infant_f: rawCounts.infant_f || 0,
    noShow: rawCounts.noShow || 0,
    cancelled: rawCounts.cancelled || 0,
  };
  const memo = record?.memo || '';
  const visitorTotal = CATEGORIES.reduce(
    (sum, cat) => sum + cat.fields.reduce((inner, field) => inner + (counts[field.id] as number), 0),
    0
  );

  const targetKey = `${date}|${type}|${session}|${activeProgram}`;

  // 대기 중인 메모를 지금 즉시 저장한다 (대상 변경 · 화면 이탈 · 단체 입력 직전)
  const flushMemo = () => {
    if (memoTimerRef.current !== null) {
      clearTimeout(memoTimerRef.current);
      memoTimerRef.current = null;
    }
    const pending = memoFlushRef.current;
    memoFlushRef.current = null;
    pending?.();
  };

  // 대상이 바뀌거나 화면을 떠나면, 대기 중인 메모를 '이전 대상'에 저장하고 초안을 비운다
  useEffect(() => {
    setMemoDraft(null);
    return () => {
      flushMemo();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const handleIncrement = (category: keyof Counts) => {
    vibrate(50);
    incrementCount(date, type, session, activeProgram, category);
  };

  const handleDecrement = (category: keyof Counts) => {
    if (counts[category] > 0) {
      vibrate([30, 50]);
      decrementCount(date, type, session, activeProgram, category);
    }
  };

  // 메모는 키 입력마다 저장하지 않고 500ms 멈춘 뒤 한 번만 저장한다 (저장 형태는 그대로).
  const handleMemoChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const target = { date, type, session, program: activeProgram };

    setMemoDraft(value);
    memoFlushRef.current = () => {
      updateMemo(target.date, target.type, target.session, target.program, value);
    };

    if (memoTimerRef.current !== null) clearTimeout(memoTimerRef.current);
    memoTimerRef.current = setTimeout(() => {
      memoTimerRef.current = null;
      const pending = memoFlushRef.current;
      memoFlushRef.current = null;
      pending?.();
      setMemoDraft(null); // 저장이 끝나면 다시 기록을 원본으로 삼는다
    }, 500);
  };

  // 입력칸에서 포커스가 빠지면 500ms를 기다리지 않고 바로 저장한다
  const handleMemoBlur = () => {
    flushMemo();
    setMemoDraft(null);
  };

  const handleReset = () => {
    const targetLabel = `${date} · ${TYPE_LABELS[type]} · ${session}`;
    const erased = type === 'reserved'
      ? '성인 · 청소년 · 어린이 · 유아 인원과 취소 · 노쇼 인원'
      : '성인 · 청소년 · 어린이 · 유아 인원';

    const proceed = window.confirm(
      `[${targetLabel}]\n\n이 회차에 입력된 ${erased}이(가) 모두 0이 됩니다.\n다른 날짜·회차의 기록과 이 회차의 메모는 지워지지 않습니다.\n\n초기화한 카운트는 되돌릴 수 없습니다. 초기화하시겠습니까?`
    );

    if (proceed) {
      resetCounts(date, type, session, activeProgram);
      toast.success(`${TYPE_LABELS[type]} ${session} 카운트를 0으로 초기화했습니다.`);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAutoSync(false);
    setDate(e.target.value);
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // 직접 고른 회차는 변경 안내(toast) 대상이 아니다
    userSetTargetRef.current = `${type}|${e.target.value}`;
    setIsAutoSync(false);
    setSession(e.target.value);
  };

  // 관람 모드를 바꾸면 회차도 함께 바뀐다. 조용히 바뀌지 않도록 바뀐 대상을 알린다.
  const announceTarget = (nextType: RecordType, nextSession: string, description?: string) => {
    userSetTargetRef.current = `${nextType}|${nextSession}`;
    toast.info(
      `입력 대상: ${TYPE_LABELS[nextType]} · ${nextSession}`,
      description ? { description } : undefined
    );
  };

  const handleTypeChange = (newType: RecordType) => {
    if (type === newType) return;
    
    const now = new Date();
    
    // Auto-sync behavior check
    if (isAutoSync) {
      const { currentSlot, timeInMinutes } = getReservedSlotInfo(now, activeProgram, date);
      const sessionAgeMinutes = timeInMinutes - currentSlot.time;
      const isValidReservedTime = sessionAgeMinutes >= -5 && sessionAgeMinutes <= 20;

      if (newType === 'reserved' && !isValidReservedTime) {
        toast.warning('현재는 자율관람 시간대입니다.\n(예약관람은 시작 5분 전부터 전환 가능)');
        return;
      } else if (newType === 'autonomous' && isValidReservedTime) {
        const proceed = window.confirm(`현재는 예약관람(${currentSlot.label}) 시간대입니다.\n자율관람으로 방금 전환을 원하시나요?\n(예 클릭 시, 실시간 연동이 해제됩니다.)`);
        if (!proceed) return;
        
        // Manual override for today during reserved time!
        setType(newType);
        setIsAutoSync(false); // Important: because they bypassed the active reserved window
        announceTarget(
          newType,
          AUTONOMOUS_HOURS[0],
          '실시간 연동이 해제되고 회차가 첫 시간대로 맞춰졌습니다. 회차를 확인해 주세요.'
        );
        setSession(AUTONOMOUS_HOURS[0]); // fallback to first, or leave it
        return;
      }

      const nextSession = getCurrentSession(newType, activeProgram, now, date);
      setType(newType);
      setIsAutoSync(true);
      setLastTypeSwitchTime(Date.now());
      announceTarget(newType, nextSession);
      setSession(nextSession);
    } else {
      // Manual mode (no time restriction)
      const nextSession = newType === 'autonomous' ? AUTONOMOUS_HOURS[0] : getSessionsForProgram(activeProgram, date).reserved[0];
      setType(newType);
      announceTarget(newType, nextSession, '수동 모드라 회차가 첫 시간대로 맞춰졌습니다. 회차를 확인해 주세요.');
      setSession(nextSession);
    }
  };

  const handleGroupSubmit = () => {
    const total = (Object.values(groupCounts) as number[]).reduce((a, b) => a + b, 0);
    if (total === 0) {
      toast.error('입력할 인원을 설정해주세요.');
      return;
    }
    // 대기 중인 메모를 먼저 저장해야 단체 메모가 덧붙는 대상이 최신 메모가 된다
    flushMemo();
    setMemoDraft(null);
    addGroupCount(date, type, session, activeProgram, groupCounts, groupMemo);
    setIsGroupModalOpen(false);
    setGroupCounts(INITIAL_COUNTS);
    setGroupMemo('');
    vibrate([50, 50, 50]);
    toast.success(`${total}명이 일괄 입력되었습니다.`);
  };

  return (
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-xl lg:max-w-4xl mx-auto">
      {/* Controls */}
      <div className="space-y-3 bg-white/40 backdrop-blur-2xl p-3.5 sm:p-4 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="flex justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-sm font-extrabold text-brand-dark tracking-tight shrink-0">관람 모드 및 시간</h2>
            <span className="shrink-0 rounded-full border border-white/70 bg-white/60 px-2 py-0.5 text-3xs font-bold text-brand-muted">
              합계 <span className="tnum text-brand-dark" aria-live="polite">{visitorTotal}</span>명
            </span>
          </div>
          <button
            onClick={() => setIsAutoSync(!isAutoSync)}
            className={cn(
              "flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full transition-all active:scale-95",
              isAutoSync
                ? "bg-brand-cyan/20 text-brand-dark font-bold border border-brand-cyan/30 shadow-sm backdrop-blur-sm"
                : "bg-white/50 text-brand-muted hover:bg-white/80 font-medium border border-white/60 backdrop-blur-sm"
            )}
          >
            <Clock className={cn("w-3.5 h-3.5", isAutoSync && "animate-pulse")} aria-hidden="true" />
            <span>{isAutoSync ? '실시간 연동 중' : '수동 모드 (연동 켜기)'}</span>
          </button>
        </div>

        <div className="flex bg-white/40 rounded-xl p-1.5 border border-white/60 shadow-sm backdrop-blur-sm relative">
          <button
            aria-pressed={type === 'autonomous'}
            className={cn(
              "flex-1 min-h-11 text-sm font-bold rounded-lg transition-all active:scale-95 border relative z-10",
              type === 'autonomous' ? "bg-white/80 text-brand-blue shadow-sm border-transparent" : "text-brand-muted hover:text-brand-dark border-transparent"
            )}
            onClick={() => handleTypeChange('autonomous')}
          >
            자율관람<span className="hidden sm:inline"> (Autonomous)</span>
          </button>
          <button
            aria-pressed={type === 'reserved'}
            className={cn(
              "flex-1 min-h-11 text-sm font-bold rounded-lg transition-all active:scale-95 border relative z-10",
              type === 'reserved' ? "bg-white/80 text-brand-blue shadow-sm border-transparent" : "text-brand-muted hover:text-brand-dark border-transparent"
            )}
            onClick={() => handleTypeChange('reserved')}
          >
            예약관람<span className="hidden sm:inline"> (Reserved)</span>
          </button>
        </div>

        <div className="flex space-x-2 items-stretch">
          <input
            type="date"
            value={date}
            onChange={handleDateChange}
            aria-label="카운트할 날짜"
            className={cn(
              "bg-white/50 backdrop-blur-[16px] border border-white/60 rounded-xl px-3 sm:px-4 min-h-11 text-sm font-medium text-brand-dark flex-1 min-w-0 transition-all shadow-sm",
              isAutoSync ? "border-brand-cyan/30" : "border-white/60"
            )}
          />
          {type === 'autonomous' && isAutoSync ? (
            <div className="flex-1 bg-brand-light/10 backdrop-blur-sm border border-brand-light/20 rounded-xl px-4 min-h-11 py-2 text-sm text-brand-dark flex items-center justify-between font-bold shadow-sm">
              <div className="flex items-center min-w-0">
                <Clock className="w-4 h-4 mr-2 text-brand-blue shrink-0" aria-hidden="true" />
                <span className="text-sm font-bold truncate">{session} (현재)</span>
              </div>
              <span className="text-2xs bg-brand-blue/90 text-white px-2 py-0.5 rounded-full shadow-sm shrink-0">자동</span>
            </div>
          ) : (
            <div className="relative flex-1 min-w-0">
              <select
                value={session}
                onChange={handleSessionChange}
                aria-label="카운트할 회차"
                className={cn(
                  "w-full bg-white/50 backdrop-blur-[16px] border border-white/60 rounded-xl pl-3 sm:pl-4 pr-8 sm:pr-10 min-h-11 text-sm font-medium text-brand-dark transition-all shadow-sm appearance-none",
                  isAutoSync ? "border-brand-cyan/30" : "border-white/60"
                )}
              >
                {(type === 'autonomous' ? AUTONOMOUS_HOURS : getSessionsForProgram(activeProgram, date).reserved).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Group Entry Button */}
      <button
        onClick={() => setIsGroupModalOpen(true)}
        className="w-full flex items-center justify-center space-x-2 min-h-11 py-3 rounded-xl text-brand-blue bg-white/40 backdrop-blur-xl hover:bg-white/80 transition-all text-sm font-bold border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-95"
      >
        <Users className="w-5 h-5" aria-hidden="true" />
        <span>단체 입력<span className="hidden sm:inline"> 모드 (한 번에 여러 명 입력)</span></span>
      </button>

      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {CATEGORIES.map((cat) => {
          const catName = shortLabel(cat.label);
          const catTotal = (counts[cat.fields[0].id] as number) + (counts[cat.fields[1].id] as number);

          return (
            <div key={cat.id} className="bg-white/55 border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-2.5 sm:p-3 relative overflow-hidden">
              <div className="flex justify-between items-center gap-1 mb-2 px-0.5">
                <span className="flex items-center gap-1.5 text-brand-dark font-extrabold text-xs min-w-0">
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cat.color)} aria-hidden="true" />
                  {/* 자간을 좁히지 않고 오른쪽 여유를 둔다. 글자 폭과 상자 폭이 똑같으면
                      마지막 글자 오른쪽이 1px 잘려 보였다. */}
                  <span className="truncate pr-0.5">{catName}</span>
                </span>
                <span className="tnum text-xl font-black text-brand-black tracking-tighter leading-none">
                  <motion.span
                    key={catTotal}
                    initial={{ scale: 1.3, color: '#00BFDF' }}
                    animate={{ scale: 1, color: '#000000' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    className="inline-block"
                  >
                    {catTotal}
                  </motion.span>
                </span>
              </div>

              <div className="space-y-2">
                {cat.fields.map(field => (
                  <div key={field.id} className="flex items-center gap-1.5">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleDecrement(field.id)}
                      aria-label={`${catName} ${field.label} 1명 빼기`}
                      className="min-h-11 w-11 shrink-0 bg-white/50 hover:bg-white/80 text-brand-muted rounded-xl flex items-center justify-center transition-all border border-white/60 shadow-sm active:shadow-inner"
                    >
                      <Minus className="w-4 h-4" aria-hidden="true" />
                    </motion.button>
                    <div className="flex-1 min-w-0 flex flex-col items-center justify-center leading-none">
                      <span className="text-3xs font-bold text-brand-muted">{field.label}</span>
                      {/* 숫자가 바뀌면 스크린리더가 읽어 주도록 바깥 span은 그대로 두고 안쪽만 교체한다 */}
                      <span className="tnum text-base font-black text-brand-dark mt-1" aria-live="polite">
                        <motion.span
                          key={counts[field.id]}
                          initial={{ scale: 1.4, color: '#00BFDF' }}
                          animate={{ scale: 1, color: '#000000' }}
                          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                          className="inline-block"
                        >
                          {counts[field.id]}
                        </motion.span>
                      </span>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleIncrement(field.id)}
                      aria-label={`${catName} ${field.label} 1명 추가`}
                      className={cn(
                        "min-h-11 flex-1 min-w-11 text-white rounded-xl flex items-center justify-center transition-all shadow-md active:shadow-inner",
                        cat.addButton,
                      )}
                    >
                      <Plus className="w-5 h-5" aria-hidden="true" />
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* No-show & Reset */}
      <div className="space-y-3 sm:space-y-4">
        {type === 'reserved' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="bg-white/55 border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-3 sm:p-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="bg-white/50 p-2.5 rounded-xl text-rose-600 shadow-sm border border-white/60 shrink-0">
                  <Users className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-brand-dark">취소</h3>
                  <p className="hidden sm:block text-2xs text-brand-muted font-medium">예약 취소 인원</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="tnum text-xl font-black text-brand-black w-9 text-center" aria-live="polite">
                  <motion.span
                    key={counts.cancelled}
                    initial={{ scale: 1.4, color: '#E11D48' }}
                    animate={{ scale: 1, color: '#000000' }}
                    className="inline-block"
                  >
                    {counts.cancelled}
                  </motion.span>
                </span>
                <div className="flex space-x-2">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleDecrement('cancelled')}
                    aria-label="취소 인원 1명 빼기"
                    className="bg-white/50 hover:bg-white/80 text-brand-muted rounded-xl min-h-11 w-11 flex items-center justify-center transition-all border border-white/60 shadow-sm active:shadow-inner"
                  >
                    <Minus className="w-4 h-4" aria-hidden="true" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleIncrement('cancelled')}
                    aria-label="취소 인원 1명 추가"
                    className="bg-brand-dark hover:bg-brand-blue text-white rounded-xl min-h-11 w-11 flex items-center justify-center transition-all shadow-md active:shadow-inner"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="bg-white/55 border border-white/70 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-3 sm:p-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="bg-white/50 p-2.5 rounded-xl text-amber-700 shadow-sm border border-white/60 shrink-0">
                  <Users className="w-5 h-5" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-brand-dark">노쇼 (No-show)</h3>
                  <p className="hidden sm:block text-2xs text-brand-muted font-medium">예약 후 방문하지 않은 인원</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="tnum text-xl font-black text-brand-black w-9 text-center" aria-live="polite">
                  <motion.span
                    key={counts.noShow}
                    initial={{ scale: 1.4, color: '#B45309' }}
                    animate={{ scale: 1, color: '#000000' }}
                    className="inline-block"
                  >
                    {counts.noShow}
                  </motion.span>
                </span>
                <div className="flex space-x-2">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleDecrement('noShow')}
                    aria-label="노쇼 인원 1명 빼기"
                    className="bg-white/50 hover:bg-white/80 text-brand-muted rounded-xl min-h-11 w-11 flex items-center justify-center transition-all border border-white/60 shadow-sm active:shadow-inner"
                  >
                    <Minus className="w-4 h-4" aria-hidden="true" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleIncrement('noShow')}
                    aria-label="노쇼 인원 1명 추가"
                    className="bg-brand-dark hover:bg-brand-blue text-white rounded-xl min-h-11 w-11 flex items-center justify-center transition-all shadow-md active:shadow-inner"
                  >
                    <Plus className="w-4 h-4" aria-hidden="true" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="relative flex-1">
            <div className="absolute top-3.5 left-3.5 text-brand-muted pointer-events-none">
              <FileText className="w-4 h-4" aria-hidden="true" />
            </div>
            <textarea
              value={memoDraft ?? memo}
              onChange={handleMemoChange}
              onBlur={handleMemoBlur}
              aria-label="특이사항 메모"
              placeholder="특이사항 (단체명, 장비 이슈 등)..."
              className="w-full text-selectable bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl pl-10 pr-4 py-3.5 text-sm text-brand-dark placeholder-brand-muted min-h-[80px] resize-none transition-all"
            />
          </div>

          <button
            onClick={handleReset}
            className="w-full lg:w-52 shrink-0 flex items-center justify-center space-x-2 min-h-11 py-3 rounded-xl text-rose-700 bg-white/40 backdrop-blur-xl hover:bg-white/80 transition-all text-sm font-bold border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-95"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>현재 세션 초기화</span>
          </button>
        </div>
      </div>

      {/* Undo Floating Button */}
      <AnimatePresence>
        {showUndo && lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-0 right-0 flex justify-center z-50 pointer-events-none"
          >
            <button
              onClick={undoLastAction}
              className="pointer-events-auto flex items-center space-x-2 bg-brand-dark/90 backdrop-blur-md text-white px-5 min-h-11 rounded-full shadow-xl hover:bg-brand-black active:scale-95 transition-all border border-brand-dark/50"
            >
              <Undo2 className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">방금 입력 취소</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group Entry Modal */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="group-entry-title"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-md max-h-[85dvh] flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-white/50 flex justify-between items-center bg-white/40 shrink-0">
                <h3 id="group-entry-title" className="font-bold text-brand-dark flex items-center">
                  <Users className="w-5 h-5 mr-2 text-brand-blue" aria-hidden="true" />
                  단체 입력
                </h3>
                <button
                  onClick={() => setIsGroupModalOpen(false)}
                  aria-label="단체 입력 닫기"
                  className="min-h-11 w-11 -mr-2 flex items-center justify-center rounded-xl text-brand-muted hover:text-brand-dark hover:bg-white/60 active:scale-95 transition-all"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              {/* 화상 키보드가 올라와도 아래 버튼에 닿을 수 있도록 본문만 스크롤한다 */}
              <div className="p-4 space-y-4 flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div className="space-y-4">
                  {CATEGORIES.map(cat => (
                    <div key={cat.id} className="space-y-2">
                      <span className="text-xs font-bold text-brand-dark">{cat.label}</span>
                      <div className="grid grid-cols-2 gap-3">
                        {cat.fields.map(field => (
                          <div key={field.id} className="flex flex-col">
                            <label htmlFor={`group-${field.id}`} className="text-2xs font-medium text-brand-muted mb-1">{field.label}</label>
                            <div className="flex items-center border border-white/50 rounded-lg overflow-hidden bg-white/60 shadow-sm backdrop-blur-sm">
                              <button
                                type="button"
                                onClick={() => setGroupCounts(prev => ({ ...prev, [field.id]: Math.max(0, (prev[field.id] || 0) - 1) }))}
                                aria-label={`${shortLabel(cat.label)} ${field.label} 1명 빼기`}
                                className="min-h-11 px-3 shrink-0 bg-white/40 text-brand-muted hover:bg-white/80 border-r border-white/50 active:bg-white/90 transition-all active:scale-95"
                              >
                                <Minus className="w-4 h-4" aria-hidden="true" />
                              </button>
                              <input
                                id={`group-${field.id}`}
                                type="number"
                                min="0"
                                inputMode="numeric"
                                value={groupCounts[field.id] || ''}
                                onChange={(e) => setGroupCounts(prev => ({ ...prev, [field.id]: parseInt(e.target.value) || 0 }))}
                                className="tnum w-full bg-transparent text-center min-h-11 text-brand-dark text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => setGroupCounts(prev => ({ ...prev, [field.id]: (prev[field.id] || 0) + 1 }))}
                                aria-label={`${shortLabel(cat.label)} ${field.label} 1명 추가`}
                                className="min-h-11 px-3 shrink-0 bg-white/40 text-brand-muted hover:bg-white/80 border-l border-white/50 active:bg-white/90 transition-all active:scale-95"
                              >
                                <Plus className="w-4 h-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col">
                  <label htmlFor="group-memo" className="text-2xs font-medium text-brand-muted mb-1">단체명 / 메모 (선택)</label>
                  <input
                    id="group-memo"
                    type="text"
                    value={groupMemo}
                    onChange={(e) => setGroupMemo(e.target.value)}
                    className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-lg px-3 min-h-11 text-sm text-brand-dark shadow-sm placeholder-brand-muted/70"
                    placeholder="예: OO초등학교 3학년 1반"
                  />
                </div>
              </div>

              <div className="p-4 bg-white/40 border-t border-white/50 flex space-x-2 backdrop-blur-md shrink-0">
                <button
                  onClick={() => setIsGroupModalOpen(false)}
                  className="flex-1 min-h-11 py-2.5 rounded-xl text-brand-muted bg-brand-light/10 backdrop-blur-sm border border-brand-light/20 font-medium text-sm hover:bg-white/80 active:scale-95 transition-transform shadow-sm"
                >
                  취소
                </button>
                <button
                  onClick={handleGroupSubmit}
                  className="flex-1 min-h-11 py-2.5 rounded-xl text-white bg-brand-blue font-bold text-sm hover:bg-brand-dark shadow-md active:scale-95 transition-transform border border-brand-blue/50"
                >
                  일괄 추가
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
