import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { FileText, Calendar, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { format } from 'date-fns';

export default function HistoryPage() {
  const allRecords = useStore(state => state.records);
  const activeProgram = useStore(state => state.activeProgram);
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<'all' | '무인자동차' | '스낵헌터' | '메디봇'>(activeProgram);
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  
  const validRecords = useMemo(() => {
    return allRecords.filter(r => {
      const getRecordProgram = (record: any) => record.program || '무인자동차';
      if (programFilter !== 'all' && getRecordProgram(r) !== programFilter) return false;

      const safeCounts = {
        adult_m: r.counts.adult_m || 0, adult_f: r.counts.adult_f || 0,
        youth_m: r.counts.youth_m || 0, youth_f: r.counts.youth_f || 0,
        child_m: r.counts.child_m || 0, child_f: r.counts.child_f || 0,
        infant_m: r.counts.infant_m || 0, infant_f: r.counts.infant_f || 0,
      };
      const total = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
      return total > 0 || r.memo.trim() !== '';
    });
  }, [allRecords, programFilter]);

  // Group by Date (YYYY-MM-DD)
  const groupedRecords = useMemo(() => {
    const groups: Record<string, typeof validRecords> = {};
    validRecords.forEach(record => {
      if (!groups[record.date]) groups[record.date] = [];
      
      // Memo Search Filter
      if (searchTerm && !record.memo.toLowerCase().includes(searchTerm.toLowerCase())) {
        return; // Skip if it doesn't match memo search
      }
      
      groups[record.date].push(record);
    });

    // Remove empty groups (caused by search filtering)
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });

    // Sort dates descending
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
      // Sort sessions within date
      const records = groups[date].sort((a, b) => a.session.localeCompare(b.session));
      return { date, records };
    });
  }, [validRecords, searchTerm]);

  const toggleDate = (date: string) => {
    setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center ml-1">
          <h2 className="text-xl font-extrabold text-brand-dark tracking-tight">전체 기록 (History)</h2>
        </div>

        <div className="flex flex-wrap gap-2 relative">
          {['all', '무인자동차', '스낵헌터', '메디봇'].map((prog) => (
            <button
              key={prog}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 border focus:outline-none relative z-10",
                programFilter === prog 
                  ? "bg-white/80 text-brand-blue border-white shadow-sm" 
                  : "bg-white/40 text-brand-muted border-white/50 hover:text-brand-dark"
              )}
              onClick={() => setProgramFilter(prog as any)}
            >
              {prog === 'all' ? '전체 통합 데이터' : prog}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-brand-muted" />
          </div>
          <input
            type="text"
            placeholder="메모 내용으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/60 backdrop-blur-sm border border-white/60 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-medium text-brand-dark placeholder-brand-muted focus:outline-none    transition-all shadow-sm"
          />
        </div>
      </div>
      
      {groupedRecords.length === 0 ? (
        <div className="text-center text-brand-muted py-16 bg-white/40 backdrop-blur-2xl rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          <FileText className="w-8 h-8 mx-auto mb-3 text-brand-muted/70" />
          <p className="font-medium text-sm">일치하는 기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-10">
          {groupedRecords.map(({ date, records }) => {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const isExpanded = expandedDates[date] !== undefined ? expandedDates[date] : date === todayStr;
            const dailyTotal = records.reduce((sum, r) => {
              const safeCounts = { ...r.counts };
              const t = Object.values(safeCounts).reduce((a: any, b: any) => (a || 0) + (b || 0), 0);
              return sum + (t as number);
            }, 0);

            return (
              <div key={date} className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl overflow-hidden">
                <button 
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between p-4 bg-white/40 border-b border-white/50 hover:bg-white/60 transition-colors active:bg-white/80"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-white/80 p-2 rounded-xl shadow-sm border border-white/60 backdrop-blur-sm">
                      <Calendar className="w-4 h-4 text-brand-blue" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-extrabold text-brand-dark tracking-tight">{date}</h3>
                      <p className="text-xs font-bold text-brand-muted mt-0.5">총 {records.length}건 기록</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-brand-muted">
                    <span className="text-xs font-black text-brand-blue bg-white/80 px-2.5 py-1 rounded-lg border border-white shadow-sm backdrop-blur-sm">합계 {dailyTotal}명</span>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-white/40 bg-white/30 backdrop-blur-md">
                    {records.map(record => {
                      const safeCounts = {
                        adult_m: record.counts.adult_m || 0, adult_f: record.counts.adult_f || 0,
                        youth_m: record.counts.youth_m || 0, youth_f: record.counts.youth_f || 0,
                        child_m: record.counts.child_m || 0, child_f: record.counts.child_f || 0,
                        infant_m: record.counts.infant_m || 0, infant_f: record.counts.infant_f || 0,
                      };
                      const total = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
                      const maleTotal = safeCounts.adult_m + safeCounts.youth_m + safeCounts.child_m + safeCounts.infant_m;
                      const femaleTotal = safeCounts.adult_f + safeCounts.youth_f + safeCounts.child_f + safeCounts.infant_f;
                      
                      return (
                        <div key={record.id} className="p-5 hover:bg-white/40 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center space-x-2 mb-1.5">
                                <span className={cn(
                                  "text-xs font-bold px-2.5 py-1 rounded-md border shadow-sm",
                                  (record as any).program === '스낵헌터' 
                                    ? 'text-amber-700 bg-amber-50/80 border-amber-100/50' 
                                    : (record as any).program === '메디봇'
                                      ? 'text-teal-700 bg-teal-50/80 border-teal-100/50'
                                      : 'text-brand-dark bg-white/60 border-white/50'
                                )}>
                                  {(record as any).program || '무인자동차'}
                                </span>
                                <span className={cn(
                                  "text-xs font-bold px-2.5 py-1 rounded-md border shadow-sm",
                                  record.type === 'autonomous' 
                                    ? "text-brand-blue bg-white/80 border-white" 
                                    : "text-brand-cyan bg-white/80 border-white"
                                )}>
                                  {record.type === 'autonomous' ? '자율관람' : '예약관람'}
                                </span>
                                <span className="text-xs font-bold text-brand-dark bg-white/60 px-2 py-1 rounded-md border border-white/50 shadow-sm">{record.session}</span>
                              </div>
                            </div>
                            <div className="text-right bg-white/50 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/60 shadow-sm">
                              <div className="text-sm font-black text-brand-dark tracking-tight">총 {total}명</div>
                              <div className="text-xs font-bold text-brand-muted mt-0.5">남 {maleTotal} / 여 {femaleTotal}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <div className="bg-white/50 border border-white/60 rounded-xl p-2 text-center shadow-sm backdrop-blur-sm">
                              <div className="text-xs font-bold text-brand-muted mb-0.5">성인</div>
                              <div className="text-base font-black text-brand-dark tracking-tighter">{safeCounts.adult_m + safeCounts.adult_f}</div>
                              <div className="text-[11px] font-bold text-brand-muted/70 mt-0.5">남{safeCounts.adult_m}/여{safeCounts.adult_f}</div>
                            </div>
                            <div className="bg-white/50 border border-white/60 rounded-xl p-2 text-center shadow-sm backdrop-blur-sm">
                              <div className="text-xs font-bold text-brand-muted mb-0.5">청소년</div>
                              <div className="text-base font-black text-brand-dark tracking-tighter">{safeCounts.youth_m + safeCounts.youth_f}</div>
                              <div className="text-[11px] font-bold text-brand-muted/70 mt-0.5">남{safeCounts.youth_m}/여{safeCounts.youth_f}</div>
                            </div>
                            <div className="bg-white/50 border border-white/60 rounded-xl p-2 text-center shadow-sm backdrop-blur-sm">
                              <div className="text-xs font-bold text-brand-muted mb-0.5">어린이</div>
                              <div className="text-base font-black text-brand-dark tracking-tighter">{safeCounts.child_m + safeCounts.child_f}</div>
                              <div className="text-[11px] font-bold text-brand-muted/70 mt-0.5">남{safeCounts.child_m}/여{safeCounts.child_f}</div>
                            </div>
                            <div className="bg-white/50 border border-white/60 rounded-xl p-2 text-center shadow-sm backdrop-blur-sm">
                              <div className="text-xs font-bold text-brand-muted mb-0.5">유아</div>
                              <div className="text-base font-black text-brand-dark tracking-tighter">{safeCounts.infant_m + safeCounts.infant_f}</div>
                              <div className="text-[11px] font-bold text-brand-muted/70 mt-0.5">남{safeCounts.infant_m}/여{safeCounts.infant_f}</div>
                            </div>
                          </div>

                          {record.memo && (
                            <div className="flex items-start space-x-2.5 mt-3 pt-3 border-t border-white/40 text-sm text-brand-dark">
                              <div className="bg-white/50 border border-white/60 p-1.5 rounded-lg shrink-0 shadow-sm">
                                <FileText className="w-3.5 h-3.5 text-brand-muted" />
                              </div>
                              <p className="whitespace-pre-wrap font-medium leading-relaxed pt-0.5">{record.memo}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
