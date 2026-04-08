import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useStore, RecordType, Counts } from '@/store/useStore';
import { vibrate, cn } from '@/lib/utils';
import { RotateCcw, Plus, Minus, FileText, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const RESERVED_SESSIONS = ['1회차 (10:00)', '2회차 (10:30)', '3회차 (13:00)', '4회차 (13:30)', '5회차 (15:30)', '6회차 (16:00)'];
const AUTONOMOUS_HOURS = Array.from({ length: 8 }, (_, i) => `${10 + i}:00`);

const CATEGORIES: { id: keyof Counts; label: string; color: string }[] = [
  { id: 'adult', label: '성인 (Adult)', color: 'bg-blue-500' },
  { id: 'youth', label: '청소년 (Youth)', color: 'bg-emerald-500' },
  { id: 'child', label: '어린이 (Child)', color: 'bg-amber-500' },
  { id: 'infant', label: '유아 (Infant)', color: 'bg-rose-500' },
];

const getCurrentSession = (type: RecordType, now: Date = new Date()) => {
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  if (type === 'autonomous') {
    const currentHour = Math.max(10, Math.min(17, hours));
    return `${currentHour}:00`;
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
  const [groupCounts, setGroupCounts] = useState<Counts>({ adult: 0, youth: 0, child: 0, infant: 0 });
  const [groupMemo, setGroupMemo] = useState('');
  
  const { getRecord, incrementCount, decrementCount, resetCounts, updateMemo, addGroupCount } = useStore();
  
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
  const counts = record?.counts || { adult: 0, youth: 0, child: 0, infant: 0 };
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

  const handleGroupSubmit = () => {
    if (groupCounts.adult === 0 && groupCounts.youth === 0 && groupCounts.child === 0 && groupCounts.infant === 0) {
      alert('입력할 인원을 설정해주세요.');
      return;
    }
    addGroupCount(date, type, session, groupCounts, groupMemo);
    setIsGroupModalOpen(false);
    setGroupCounts({ adult: 0, youth: 0, child: 0, infant: 0 });
    setGroupMemo('');
    vibrate([50, 50, 50]);
  };

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto">
      {/* Controls */}
      <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-sm font-bold text-slate-800">관람 모드 및 시간</h2>
          <button 
            onClick={() => setIsAutoSync(true)}
            className={cn(
              "flex items-center space-x-1 text-xs px-2 py-1 rounded-full transition-colors",
              isAutoSync 
                ? "bg-blue-50 text-blue-600 font-medium border border-blue-200" 
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            )}
          >
            <Clock className={cn("w-3 h-3", isAutoSync && "animate-pulse")} />
            <span>{isAutoSync ? '실시간 연동 중' : '실시간 연동 켜기'}</span>
          </button>
        </div>

        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-md transition-all",
              type === 'autonomous' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            )}
            onClick={() => setType('autonomous')}
          >
            자율관람 (Autonomous)
          </button>
          <button
            className={cn(
              "flex-1 py-2 text-sm font-medium rounded-md transition-all",
              type === 'reserved' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            )}
            onClick={() => setType('reserved')}
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
              "bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 flex-1 transition-colors",
              isAutoSync ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
            )}
          />
          <select
            value={session}
            onChange={handleSessionChange}
            className={cn(
              "bg-white border rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 flex-1 transition-colors",
              isAutoSync ? "border-blue-200 bg-blue-50/30" : "border-slate-200"
            )}
          >
            {(type === 'autonomous' ? AUTONOMOUS_HOURS : RESERVED_SESSIONS).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Group Entry Button */}
      <button
        onClick={() => setIsGroupModalOpen(true)}
        className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors text-sm font-medium border border-blue-100 shadow-sm"
      >
        <Users className="w-5 h-5" />
        <span>단체 입력 모드 (한 번에 여러 명 입력)</span>
      </button>

      {/* Counters */}
      <div className="grid grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => (
          <div key={cat.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex flex-col items-center relative overflow-hidden">
            <div className={cn("absolute top-0 left-0 right-0 h-1 opacity-80", cat.color)} />
            <span className="text-slate-500 text-sm font-medium mb-2">{cat.label}</span>
            <span className="text-5xl font-bold text-slate-900 mb-4 tracking-tighter">{counts[cat.id]}</span>
            
            <div className="flex w-full space-x-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDecrement(cat.id)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl py-3 flex items-center justify-center transition-colors"
              >
                <Minus className="w-6 h-6" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleIncrement(cat.id)}
                className={cn("flex-[2] text-white rounded-xl py-3 flex items-center justify-center transition-colors", cat.color.replace('bg-', 'bg-opacity-90 hover:bg-opacity-100 bg-'))}
              >
                <Plus className="w-8 h-8" />
              </motion.button>
            </div>
          </div>
        ))}
      </div>

      {/* Memo & Reset */}
      <div className="space-y-4">
        <div className="relative">
          <div className="absolute top-3 left-3 text-slate-400">
            <FileText className="w-5 h-5" />
          </div>
          <textarea
            value={memo}
            onChange={(e) => updateMemo(date, type, session, e.target.value)}
            placeholder="특이사항 (단체명, 장비 이슈 등)..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 min-h-[80px] resize-none shadow-sm"
          />
        </div>

        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors text-sm font-medium border border-rose-100"
        >
          <RotateCcw className="w-4 h-4" />
          <span>현재 세션 초기화</span>
        </button>
      </div>

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
                <button onClick={() => setIsGroupModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              </div>
              
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {CATEGORIES.map(cat => (
                    <div key={cat.id} className="flex flex-col">
                      <label className="text-xs font-medium text-slate-500 mb-1">{cat.label}</label>
                      <input
                        type="number"
                        min="0"
                        value={groupCounts[cat.id] || ''}
                        onChange={(e) => setGroupCounts(prev => ({ ...prev, [cat.id]: parseInt(e.target.value) || 0 }))}
                        className="border border-slate-200 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-blue-500"
                        placeholder="0"
                      />
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
                  className="flex-1 py-2.5 rounded-xl text-slate-600 bg-white border border-slate-200 font-medium text-sm hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  onClick={handleGroupSubmit}
                  className="flex-1 py-2.5 rounded-xl text-white bg-blue-600 font-medium text-sm hover:bg-blue-700 shadow-sm"
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
