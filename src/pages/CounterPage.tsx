import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useStore, RecordType, Counts, ProgramType } from '@/store/useStore';
import { vibrate, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RotateCcw, Plus, Minus, FileText, Clock, Users, Undo2, RefreshCw, X } from 'lucide-react';
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

const CATEGORIES: { id: string; label: string; color: string; fields: { id: keyof Counts; label: string }[] }[] = [
  { 
    id: 'adult', 
    label: '성인 (Adult)', 
    color: 'bg-blue-500',
    fields: [{ id: 'adult_m', label: '남' }, { id: 'adult_f', label: '여' }]
  },
  { 
    id: 'youth', 
    label: '청소년 (Youth)', 
    color: 'bg-emerald-500',
    fields: [{ id: 'youth_m', label: '남' }, { id: 'youth_f', label: '여' }]
  },
  { 
    id: 'child', 
    label: '어린이 (Child)', 
    color: 'bg-amber-500',
    fields: [{ id: 'child_m', label: '남' }, { id: 'child_f', label: '여' }]
  },
  { 
    id: 'infant', 
    label: '유아 (Infant)', 
    color: 'bg-rose-500',
    fields: [{ id: 'infant_m', label: '남' }, { id: 'infant_f', label: '여' }]
  },
];

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

  const handleReset = () => {
    if (window.confirm('현재 세션의 모든 카운트를 0으로 초기화하시겠습니까?')) {
      resetCounts(date, type, session, activeProgram);
      toast.success('카운트가 0으로 초기화되었습니다.');
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsAutoSync(false);
    setDate(e.target.value);
  };

  const handleSessionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setIsAutoSync(false);
    setSession(e.target.value);
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
        setSession(AUTONOMOUS_HOURS[0]); // fallback to first, or leave it
        return;
      }
      
      setType(newType);
      setIsAutoSync(true);
      setLastTypeSwitchTime(Date.now());
      setSession(getCurrentSession(newType, activeProgram, now, date));
    } else {
      // Manual mode (no time restriction)
      setType(newType);
      setSession(newType === 'autonomous' ? AUTONOMOUS_HOURS[0] : getSessionsForProgram(activeProgram, date).reserved[0]);
    }
  };

  const handleGroupSubmit = () => {
    const total = (Object.values(groupCounts) as number[]).reduce((a, b) => a + b, 0);
    if (total === 0) {
      toast.error('입력할 인원을 설정해주세요.');
      return;
    }
    addGroupCount(date, type, session, activeProgram, groupCounts, groupMemo);
    setIsGroupModalOpen(false);
    setGroupCounts(INITIAL_COUNTS);
    setGroupMemo('');
    vibrate([50, 50, 50]);
    toast.success(`${total}명이 일괄 입력되었습니다.`);
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-xl mx-auto">
      {/* Controls */}
      <div className="space-y-3 sm:space-y-4 bg-white/40 backdrop-blur-2xl p-4 sm:p-6 rounded-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] relative overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-extrabold text-brand-dark tracking-tight">관람 모드 및 시간</h2>
          <button 
            onClick={() => setIsAutoSync(!isAutoSync)}
            className={cn(
              "flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full transition-all active:scale-95",
              isAutoSync 
                ? "bg-brand-cyan/20 text-brand-dark font-bold border border-brand-cyan/30 shadow-sm backdrop-blur-sm" 
                : "bg-white/50 text-brand-muted hover:bg-white/80 font-medium border border-white/60 backdrop-blur-sm"
            )}
          >
            <Clock className={cn("w-3.5 h-3.5", isAutoSync && "animate-pulse")} />
            <span>{isAutoSync ? '실시간 연동 중' : '수동 모드 (연동 켜기)'}</span>
          </button>
        </div>

        <div className="flex bg-white/40 rounded-xl p-1.5 border border-white/60 shadow-sm backdrop-blur-sm relative">
          <button
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-0 focus-visible:ring-0 border relative z-10",
              type === 'autonomous' ? "bg-white/80 text-brand-blue shadow-sm border-transparent" : "text-brand-muted hover:text-brand-dark border-transparent"
            )}
            onClick={() => handleTypeChange('autonomous')}
          >
            자율관람 (Autonomous)
          </button>
          <button
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-0 focus-visible:ring-0 border relative z-10",
              type === 'reserved' ? "bg-white/80 text-brand-blue shadow-sm border-transparent" : "text-brand-muted hover:text-brand-dark border-transparent"
            )}
            onClick={() => handleTypeChange('reserved')}
          >
            예약관람 (Reserved)
          </button>
        </div>

        <div className="flex space-x-2 items-stretch">
          <input
            type="date"
            value={date}
            onChange={handleDateChange}
            className={cn(
              "bg-white/50 backdrop-blur-[16px] border border-white/60 rounded-xl px-4 py-3 text-sm font-medium text-brand-dark focus:outline-none focus:ring-0 focus-visible:ring-0 flex-1 transition-all shadow-sm",
              isAutoSync ? "border-brand-cyan/30" : "border-white/60"
            )}
          />
          {type === 'autonomous' && isAutoSync ? (
            <div className="flex-1 bg-brand-light/10 backdrop-blur-sm border border-brand-light/20 rounded-xl px-4 py-3 text-sm text-brand-dark flex items-center justify-between font-bold shadow-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-brand-blue shrink-0" />
                <span className="text-sm font-bold">{session} (현재)</span>
              </div>
              <span className="text-xs bg-brand-blue/90 text-white px-2 py-0.5 rounded-full shadow-sm shrink-0">자동</span>
            </div>
          ) : (
            <select
              value={session}
              onChange={handleSessionChange}
              className={cn(
                "bg-white/50 backdrop-blur-[16px] border border-white/60 rounded-xl px-4 py-3 text-sm font-medium text-brand-dark focus:outline-none focus:ring-0 focus-visible:ring-0 flex-1 transition-all shadow-sm appearance-none",
                isAutoSync ? "border-brand-cyan/30" : "border-white/60"
              )}
            >
              {(type === 'autonomous' ? AUTONOMOUS_HOURS : getSessionsForProgram(activeProgram, date).reserved).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Group Entry Button */}
      <button
        onClick={() => setIsGroupModalOpen(true)}
        className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-xl text-brand-blue bg-white/40 backdrop-blur-xl hover:bg-white/80 transition-all text-sm font-bold border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-95"
      >
        <Users className="w-5 h-5" />
        <span>단체 입력 모드 (한 번에 여러 명 입력)</span>
      </button>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-3 relative overflow-hidden group">
            <div className="flex justify-between items-center mb-3 mt-1">
              <span className="text-brand-dark font-extrabold text-xs tracking-tight">{cat.label.split(' ')[0]}</span>
              <motion.span 
                key={(counts[cat.fields[0].id] as number) + (counts[cat.fields[1].id] as number)}
                initial={{ scale: 1.3, color: '#00BFDF' }}
                animate={{ scale: 1, color: '#000000' }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="text-xl font-black text-brand-black tracking-tighter"
              >
                {(counts[cat.fields[0].id] as number) + (counts[cat.fields[1].id] as number)}
              </motion.span>
            </div>
            
            <div className="space-y-3">
              {cat.fields.map(field => (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-xs font-semibold text-brand-muted">{field.label}</span>
                    <motion.span 
                      key={counts[field.id]}
                      initial={{ scale: 1.4, color: '#00BFDF' }}
                      animate={{ scale: 1, color: '#000000' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="text-sm font-bold text-brand-dark"
                    >
                      {counts[field.id]}
                    </motion.span>
                  </div>
                  <div className="flex space-x-1.5">
                    <motion.button
                      whileTap={{ scale: 0.85 }}
                      onClick={() => handleDecrement(field.id)}
                      className="flex-1 bg-white/50 hover:bg-white/80 text-brand-muted rounded-xl py-1.5 flex items-center justify-center transition-all border border-white/60 shadow-sm active:shadow-inner"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleIncrement(field.id)}
                      className={cn("flex-[2] text-white rounded-xl py-1.5 flex items-center justify-center transition-all shadow-md active:shadow-inner", cat.color)}
                    >
                      <Plus className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* No-show & Reset */}
      <div className="space-y-4">
        {type === 'reserved' && (
          <div className="space-y-4">
            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-4 flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="bg-white/50 p-2.5 rounded-xl text-amber-500 shadow-sm border border-white/60">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-dark">취소</h3>
                  <p className="text-xs text-brand-muted font-medium">예약 취소 인원</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <motion.span 
                  key={counts.cancelled}
                  initial={{ scale: 1.4, color: '#f59e0b' }}
                  animate={{ scale: 1, color: '#000000' }}
                  className="text-xl font-black text-brand-black w-8 text-center"
                >
                  {counts.cancelled}
                </motion.span>
                <div className="flex space-x-2">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleDecrement('cancelled')}
                    className="bg-white/50 hover:bg-white/80 text-brand-muted rounded-xl p-2 transition-all border border-white/60 shadow-sm active:shadow-inner"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleIncrement('cancelled')}
                    className="bg-brand-dark hover:bg-brand-black text-white rounded-xl p-2 transition-all shadow-md active:shadow-inner"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-4 flex items-center justify-between group">
              <div className="flex items-center space-x-3">
                <div className="bg-white/50 p-2.5 rounded-xl text-brand-muted shadow-sm border border-white/60">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-dark">노쇼 (No-show)</h3>
                  <p className="text-xs text-brand-muted font-medium">예약 후 방문하지 않은 인원</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <motion.span 
                  key={counts.noShow}
                  initial={{ scale: 1.4, color: '#e11d48' }}
                  animate={{ scale: 1, color: '#000000' }}
                  className="text-xl font-black text-brand-black w-8 text-center"
                >
                  {counts.noShow}
                </motion.span>
                <div className="flex space-x-2">
                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={() => handleDecrement('noShow')}
                    className="bg-white/50 hover:bg-white/80 text-brand-muted rounded-xl p-2 transition-all border border-white/60 shadow-sm active:shadow-inner"
                  >
                    <Minus className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleIncrement('noShow')}
                    className="bg-brand-dark hover:bg-brand-black text-white rounded-xl p-2 transition-all shadow-md active:shadow-inner"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute top-3.5 left-3.5 text-brand-muted">
            <FileText className="w-4 h-4" />
          </div>
          <textarea
            value={memo}
            onChange={(e) => updateMemo(date, type, session, activeProgram, e.target.value)}
            placeholder="특이사항 (단체명, 장비 이슈 등)..."
            className="w-full bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl pl-10 pr-4 py-3.5 text-sm text-brand-dark placeholder-brand-muted focus:outline-none    min-h-[80px] resize-none transition-all"
          />
        </div>

        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-rose-600 bg-white/40 backdrop-blur-xl hover:bg-white/80 transition-all text-sm font-bold border border-white/60 shadow-[0_4px_20px_rgba(0,0,0,0.03)] active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>현재 세션 초기화</span>
        </button>
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
              className="pointer-events-auto flex items-center space-x-2 bg-brand-dark/80 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-xl hover:bg-brand-black active:scale-95 transition-all border border-brand-dark/50"
            >
              <Undo2 className="w-4 h-4" />
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white/80 backdrop-blur-xl border border-white/50 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 border-b border-white/50 flex justify-between items-center bg-white/40">
                <h3 className="font-bold text-brand-dark flex items-center">
                  <Users className="w-5 h-5 mr-2 text-brand-blue" />
                  단체 입력
                </h3>
                <button onClick={() => setIsGroupModalOpen(false)} className="text-brand-muted hover:text-brand-dark active:scale-95 transition-transform">
                  ✕
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="space-y-4">
                  {CATEGORIES.map(cat => (
                    <div key={cat.id} className="space-y-2">
                      <label className="text-xs font-bold text-brand-dark">{cat.label}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {cat.fields.map(field => (
                          <div key={field.id} className="flex flex-col">
                            <label className="text-xs font-medium text-brand-muted mb-1">{field.label}</label>
                            <div className="flex items-center border border-white/50 rounded-lg overflow-hidden bg-white/60 shadow-sm backdrop-blur-sm">
                              <button
                                type="button"
                                onClick={() => setGroupCounts(prev => ({ ...prev, [field.id]: Math.max(0, (prev[field.id] || 0) - 1) }))}
                                className="px-3 py-2 bg-white/40 text-brand-muted hover:bg-white/80 border-r border-white/50 active:bg-white/90 transition-all active:scale-95"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={groupCounts[field.id] || ''}
                                onChange={(e) => setGroupCounts(prev => ({ ...prev, [field.id]: parseInt(e.target.value) || 0 }))}
                                className="w-full bg-transparent text-center py-2 text-brand-dark focus:outline-none text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => setGroupCounts(prev => ({ ...prev, [field.id]: (prev[field.id] || 0) + 1 }))}
                                className="px-3 py-2 bg-white/40 text-brand-muted hover:bg-white/80 border-l border-white/50 active:bg-white/90 transition-all active:scale-95"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex flex-col">
                  <label className="text-xs font-medium text-brand-muted mb-1">단체명 / 메모 (선택)</label>
                  <input
                    type="text"
                    value={groupMemo}
                    onChange={(e) => setGroupMemo(e.target.value)}
                    className="bg-white/60 backdrop-blur-sm border border-white/50 rounded-lg px-3 py-2 text-brand-dark focus:outline-none  shadow-sm placeholder-brand-muted/70"
                    placeholder="예: OO초등학교 3학년 1반"
                  />
                </div>
              </div>

              <div className="p-4 bg-white/40 border-t border-white/50 flex space-x-2 backdrop-blur-md">
                <button
                  onClick={() => setIsGroupModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-brand-muted bg-brand-light/10 backdrop-blur-sm border border-brand-light/20 font-medium text-sm hover:bg-white/80 active:scale-95 transition-transform shadow-sm"
                >
                  취소
                </button>
                <button
                  onClick={handleGroupSubmit}
                  className="flex-1 py-2.5 rounded-xl text-white bg-brand-blue font-medium text-sm hover:bg-brand-dark shadow-md active:scale-95 transition-transform border border-brand-blue/50"
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
