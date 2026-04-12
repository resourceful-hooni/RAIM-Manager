import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useStore, RecordType, Counts } from '@/store/useStore';
import { vibrate, cn } from '@/lib/utils';
import { RotateCcw, Plus, Minus, FileText, Clock, Users, Undo2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const RESERVED_SESSIONS = ['1회차 (10:00)', '2회차 (10:30)', '3회차 (13:00)', '4회차 (13:30)', '5회차 (15:30)', '6회차 (16:00)', '단체'];
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
  noShow: 0
};

const getCurrentSession = (type: RecordType, now: Date = new Date()) => {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (type === 'autonomous') {
    const currentHour = Math.max(10, Math.min(17, hours));
    return `${currentHour}시`;
  } else {
    const slots = [
      { time: 10 * 60, label: '1회차 (10:00)' },
      { time: 10 * 60 + 30, label: '2회차 (10:30)' },
      { time: 13 * 60, label: '3회차 (13:00)' },
      { time: 13 * 60 + 30, label: '4회차 (13:30)' },
      { time: 15 * 60 + 30, label: '5회차 (15:30)' },
      { time: 16 * 60, label: '6회차 (16:00)' },
    ];
    
    let currentSlot = slots[0].label;
    for (let i = slots.length - 1; i >= 0; i--) {
      if (timeInMinutes >= slots[i].time) {
        currentSlot = slots[i].label;
        break;
      }
    }
    return currentSlot;
  }
};

export default function CounterPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [type, setType] = useState<RecordType>('autonomous');
  const [session, setSession] = useState(getCurrentSession('autonomous'));
  const [isAutoSync, setIsAutoSync] = useState(true);
  
  // Group Entry Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupCounts, setGroupCounts] = useState<Counts>(INITIAL_COUNTS);
  const [groupMemo, setGroupMemo] = useState('');
  
  const { getRecord, incrementCount, decrementCount, resetCounts, updateMemo, addGroupCount, lastAction, undoLastAction } = useStore();
  
  // Auto-sync effect
  useEffect(() => {
    if (!isAutoSync) return;
    
    const updateTime = () => {
      const now = new Date();
      setDate(format(now, 'yyyy-MM-dd'));
      setSession(getCurrentSession(type, now));
    };
    
    updateTime(); // Run immediately on type change or auto-sync enable
    const intervalId = setInterval(updateTime, 10000); // Check every 10 seconds
    
    return () => clearInterval(intervalId);
  }, [isAutoSync, type]);

  const record = getRecord(date, type, session);
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
  };
  const memo = record?.memo || '';

  const handleIncrement = (category: keyof Counts) => {
    vibrate(50);
    incrementCount(date, type, session, category);
  };

  const handleDecrement = (category: keyof Counts) => {
    if (counts[category] > 0) {
      vibrate([30, 50]);
      decrementCount(date, type, session, category);
    }
  };

  const handleReset = () => {
    if (window.confirm('현재 세션의 모든 카운트를 0으로 초기화하시겠습니까?')) {
      resetCounts(date, type, session);
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
    setType(newType);
    if (!isAutoSync) {
      setSession(newType === 'autonomous' ? AUTONOMOUS_HOURS[0] : RESERVED_SESSIONS[0]);
    }
  };

  const handleGroupSubmit = () => {
    const total = (Object.values(groupCounts) as number[]).reduce((a, b) => a + b, 0);
    if (total === 0) {
      alert('입력할 인원을 설정해주세요.');
      return;
    }
    addGroupCount(date, type, session, groupCounts, groupMemo);
    setIsGroupModalOpen(false);
    setGroupCounts(INITIAL_COUNTS);
    setGroupMemo('');
    vibrate([50, 50, 50]);
  };

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Controls */}
      <div className="space-y-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] relative overflow-hidden">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-extrabold text-slate-800 tracking-tight">관람 모드 및 시간</h2>
          <button 
            onClick={() => setIsAutoSync(true)}
            className={cn(
              "flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-full transition-all active:scale-95",
              isAutoSync 
                ? "bg-blue-50 text-blue-600 font-bold border border-blue-200/60 shadow-sm" 
                : "bg-slate-50 text-slate-500 hover:bg-slate-100 font-medium border border-slate-200/60"
            )}
          >
            <Clock className={cn("w-3.5 h-3.5", isAutoSync && "animate-pulse")} />
            <span>{isAutoSync ? '실시간 연동 중' : '실시간 연동 켜기'}</span>
          </button>
        </div>

        <div className="flex bg-slate-50 rounded-xl p-1.5 border border-slate-100">
          <button
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all active:scale-95",
              type === 'autonomous' ? "bg-white text-blue-600 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => handleTypeChange('autonomous')}
          >
            자율관람 (Autonomous)
          </button>
          <button
            className={cn(
              "flex-1 py-2.5 text-sm font-bold rounded-lg transition-all active:scale-95",
              type === 'reserved' ? "bg-white text-blue-600 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
            )}
            onClick={() => handleTypeChange('reserved')}
          >
            예약관람 (Reserved)
          </button>
        </div>

        <div className="flex space-x-2">
          <input
            type="date"
            value={date}
            onChange={handleDateChange}
            className={cn(
              "bg-white border rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 flex-1 transition-all shadow-sm",
              isAutoSync ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
            )}
          />
          {type === 'autonomous' && isAutoSync ? (
            <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl px-4 py-3 text-sm text-blue-700 flex items-center justify-between font-bold shadow-sm">
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-2 text-blue-500" />
                <span>{session} (현재)</span>
              </div>
              <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full shadow-sm">자동</span>
            </div>
          ) : (
            <select
              value={session}
              onChange={handleSessionChange}
              className={cn(
                "bg-white border rounded-xl px-4 py-3 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 flex-1 transition-all shadow-sm appearance-none",
                isAutoSync ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
              )}
            >
              {(type === 'autonomous' ? AUTONOMOUS_HOURS : RESERVED_SESSIONS).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Group Entry Button */}
      <button
        onClick={() => setIsGroupModalOpen(true)}
        className="w-full flex items-center justify-center space-x-2 py-4 rounded-2xl text-blue-700 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all text-sm font-bold border border-blue-200/60 shadow-sm active:scale-95"
      >
        <Users className="w-5 h-5" />
        <span>단체 입력 모드 (한 번에 여러 명 입력)</span>
      </button>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-3">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-2xl p-3 relative overflow-hidden group">
            <div className={cn("absolute top-0 left-0 right-0 h-1.5 opacity-90 transition-all group-hover:h-2", cat.color)} />
            <div className="flex justify-between items-center mb-3 mt-1">
              <span className="text-slate-800 font-extrabold text-xs tracking-tight">{cat.label.split(' ')[0]}</span>
              <span className="text-xl font-black text-slate-900 tracking-tighter">
                {(counts[cat.fields[0].id] as number) + (counts[cat.fields[1].id] as number)}
              </span>
            </div>
            
            <div className="space-y-3">
              {cat.fields.map(field => (
                <div key={field.id} className="space-y-1.5">
                  <div className="flex justify-between items-end px-1">
                    <span className="text-[10px] font-semibold text-slate-500">{field.label}</span>
                    <span className="text-sm font-bold text-slate-900">{counts[field.id]}</span>
                  </div>
                  <div className="flex space-x-1.5">
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDecrement(field.id)}
                      className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl py-1.5 flex items-center justify-center transition-all border border-slate-200/60"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleIncrement(field.id)}
                      className={cn("flex-[2] text-white rounded-xl py-1.5 flex items-center justify-center transition-all shadow-sm hover:shadow active:shadow-none", cat.color)}
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
          <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-2xl p-4 flex items-center justify-between group">
            <div className="flex items-center space-x-3">
              <div className="bg-slate-100 p-2.5 rounded-xl text-slate-500">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">노쇼 (No-show)</h3>
                <p className="text-[10px] text-slate-500 font-medium">예약 후 방문하지 않은 인원</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xl font-black text-slate-900 w-8 text-center">{counts.noShow}</span>
              <div className="flex space-x-2">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDecrement('noShow')}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-400 rounded-xl p-2 transition-all border border-slate-200/60"
                >
                  <Minus className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleIncrement('noShow')}
                  className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl p-2 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <div className="absolute top-3.5 left-3.5 text-slate-400">
            <FileText className="w-4 h-4" />
          </div>
          <textarea
            value={memo}
            onChange={(e) => updateMemo(date, type, session, e.target.value)}
            placeholder="특이사항 (단체명, 장비 이슈 등)..."
            className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 min-h-[80px] resize-none shadow-sm transition-all"
          />
        </div>

        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-all text-sm font-bold border border-rose-100/50 shadow-sm active:scale-95"
        >
          <RotateCcw className="w-4 h-4" />
          <span>현재 세션 초기화</span>
        </button>
      </div>

      {/* Undo Floating Button */}
      <AnimatePresence>
        {lastAction && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-0 right-0 flex justify-center z-50 pointer-events-none"
          >
            <button
              onClick={undoLastAction}
              className="pointer-events-auto flex items-center space-x-2 bg-slate-900/80 backdrop-blur-md text-white px-5 py-3 rounded-full shadow-xl hover:bg-slate-800 active:scale-95 transition-all border border-slate-700/50"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="font-bold text-slate-900 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-blue-600" />
                  단체 입력
                </h3>
                <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600 active:scale-95 transition-transform">
                  ✕
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="space-y-4">
                  {CATEGORIES.map(cat => (
                    <div key={cat.id} className="space-y-2">
                      <label className="text-xs font-bold text-slate-700">{cat.label}</label>
                      <div className="grid grid-cols-2 gap-3">
                        {cat.fields.map(field => (
                          <div key={field.id} className="flex flex-col">
                            <label className="text-[10px] font-medium text-slate-500 mb-1">{field.label}</label>
                            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white shadow-sm">
                              <button
                                type="button"
                                onClick={() => setGroupCounts(prev => ({ ...prev, [field.id]: Math.max(0, (prev[field.id] || 0) - 1) }))}
                                className="px-3 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 border-r border-slate-200 active:bg-slate-200 transition-all active:scale-95"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={groupCounts[field.id] || ''}
                                onChange={(e) => setGroupCounts(prev => ({ ...prev, [field.id]: parseInt(e.target.value) || 0 }))}
                                className="w-full text-center py-2 text-slate-900 focus:outline-none text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0"
                              />
                              <button
                                type="button"
                                onClick={() => setGroupCounts(prev => ({ ...prev, [field.id]: (prev[field.id] || 0) + 1 }))}
                                className="px-3 py-2 bg-slate-50 text-slate-500 hover:bg-slate-100 border-l border-slate-200 active:bg-slate-200 transition-all active:scale-95"
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
                  <label className="text-xs font-medium text-slate-500 mb-1">단체명 / 메모 (선택)</label>
                  <input
                    type="text"
                    value={groupMemo}
                    onChange={(e) => setGroupMemo(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                    placeholder="예: OO초등학교 3학년 1반"
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex space-x-2">
                <button
                  onClick={() => setIsGroupModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-slate-600 bg-white border border-slate-200 font-medium text-sm hover:bg-slate-50 active:scale-95 transition-transform"
                >
                  취소
                </button>
                <button
                  onClick={handleGroupSubmit}
                  className="flex-1 py-2.5 rounded-xl text-white bg-blue-600 font-medium text-sm hover:bg-blue-700 shadow-sm active:scale-95 transition-transform"
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
