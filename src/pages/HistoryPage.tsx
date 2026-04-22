import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { FileText, Calendar, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function HistoryPage() {
  const { getAllRecords } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({});
  
  const validRecords = useMemo(() => {
    return getAllRecords().filter(r => {
      const safeCounts = {
        adult_m: r.counts.adult_m || 0, adult_f: r.counts.adult_f || 0,
        youth_m: r.counts.youth_m || 0, youth_f: r.counts.youth_f || 0,
        child_m: r.counts.child_m || 0, child_f: r.counts.child_f || 0,
        infant_m: r.counts.infant_m || 0, infant_f: r.counts.infant_f || 0,
      };
      const total = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
      return total > 0 || r.memo.trim() !== '';
    });
  }, [getAllRecords]);

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
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center ml-1">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">전체 기록 (History)</h2>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="메모 내용으로 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
        />
      </div>
      
      {groupedRecords.length === 0 ? (
        <div className="text-center text-slate-400 py-16 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <FileText className="w-8 h-8 mx-auto mb-3 text-slate-300" />
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
              <div key={date} className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl overflow-hidden">
                <button 
                  onClick={() => toggleDate(date)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100 transition-colors active:bg-slate-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-100">
                      <Calendar className="w-4 h-4 text-blue-500" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">{date}</h3>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">총 {records.length}건 기록</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-slate-400">
                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">합계 {dailyTotal}명</span>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="divide-y divide-slate-100/80 bg-white">
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
                        <div key={record.id} className="p-5 hover:bg-slate-50/50 transition-colors">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="flex items-center space-x-2 mb-1.5">
                                <span className={cn(
                                  "text-[10px] font-bold px-2.5 py-1 rounded-md border shadow-sm",
                                  record.type === 'autonomous' 
                                    ? "text-blue-700 bg-blue-50 border-blue-100/50" 
                                    : "text-indigo-700 bg-indigo-50 border-indigo-100/50"
                                )}>
                                  {record.type === 'autonomous' ? '자율관람' : '예약관람'}
                                </span>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60 ">{record.session}</span>
                              </div>
                            </div>
                            <div className="text-right bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-inner">
                              <div className="text-sm font-black text-slate-900 tracking-tight">총 {total}명</div>
                              <div className="text-[10px] font-bold text-slate-500 mt-0.5">남 {maleTotal} / 여 {femaleTotal}</div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-2 mb-2">
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-500 mb-0.5">성인</div>
                              <div className="text-base font-black text-slate-800 tracking-tighter">{safeCounts.adult_m + safeCounts.adult_f}</div>
                              <div className="text-[9px] font-bold text-slate-400 mt-0.5">남{safeCounts.adult_m}/여{safeCounts.adult_f}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-500 mb-0.5">청소년</div>
                              <div className="text-base font-black text-slate-800 tracking-tighter">{safeCounts.youth_m + safeCounts.youth_f}</div>
                              <div className="text-[9px] font-bold text-slate-400 mt-0.5">남{safeCounts.youth_m}/여{safeCounts.youth_f}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-500 mb-0.5">어린이</div>
                              <div className="text-base font-black text-slate-800 tracking-tighter">{safeCounts.child_m + safeCounts.child_f}</div>
                              <div className="text-[9px] font-bold text-slate-400 mt-0.5">남{safeCounts.child_m}/여{safeCounts.child_f}</div>
                            </div>
                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-2 text-center shadow-sm">
                              <div className="text-[10px] font-bold text-slate-500 mb-0.5">유아</div>
                              <div className="text-base font-black text-slate-800 tracking-tighter">{safeCounts.infant_m + safeCounts.infant_f}</div>
                              <div className="text-[9px] font-bold text-slate-400 mt-0.5">남{safeCounts.infant_m}/여{safeCounts.infant_f}</div>
                            </div>
                          </div>

                          {record.memo && (
                            <div className="flex items-start space-x-2.5 mt-3 pt-3 border-t border-slate-100/80 text-sm text-slate-600">
                              <div className="bg-slate-100 p-1.5 rounded-lg shrink-0">
                                <FileText className="w-3.5 h-3.5 text-slate-500" />
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
