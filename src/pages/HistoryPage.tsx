import { useStore } from '@/store/useStore';
import { FileText } from 'lucide-react';

export default function HistoryPage() {
  const { getAllRecords } = useStore();
  
  const sortedRecords = [...getAllRecords()].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.session.localeCompare(a.session);
  });

  const validRecords = sortedRecords.filter(r => {
    const safeCounts = {
      adult_m: r.counts.adult_m || 0, adult_f: r.counts.adult_f || 0,
      youth_m: r.counts.youth_m || 0, youth_f: r.counts.youth_f || 0,
      child_m: r.counts.child_m || 0, child_f: r.counts.child_f || 0,
      infant_m: r.counts.infant_m || 0, infant_f: r.counts.infant_f || 0,
    };
    const total = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
    return total > 0 || r.memo.trim() !== '';
  });

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-extrabold mb-6 text-slate-900 tracking-tight ml-1">전체 기록 (History)</h2>
      
      {validRecords.length === 0 ? (
        <div className="text-center text-slate-400 py-16 bg-white rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <FileText className="w-8 h-8 mx-auto mb-3 text-slate-300" />
          <p className="font-medium">기록이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {validRecords.map(record => {
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
              <div key={record.id} className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl p-5 relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-400 to-indigo-500 opacity-80" />
                <div className="flex justify-between items-start mb-4 pl-2">
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100/50 shadow-sm">
                        {record.type === 'autonomous' ? '자율관람' : '예약관람'}
                      </span>
                      <span className="text-sm font-extrabold text-slate-800 tracking-tight">{record.date}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{record.session}</span>
                  </div>
                  <div className="text-right bg-slate-50 px-3 py-2 rounded-xl border border-slate-100">
                    <div className="text-sm font-black text-slate-900 tracking-tight">총 {total}명</div>
                    <div className="text-[10px] font-bold text-slate-500 mt-0.5">남 {maleTotal} / 여 {femaleTotal}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mt-4 mb-2 pl-2">
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-500 mb-0.5">성인</div>
                    <div className="text-lg font-black text-blue-600 tracking-tighter">{safeCounts.adult_m + safeCounts.adult_f}</div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">({safeCounts.adult_m}/{safeCounts.adult_f})</div>
                  </div>
                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-500 mb-0.5">청소년</div>
                    <div className="text-lg font-black text-emerald-600 tracking-tighter">{safeCounts.youth_m + safeCounts.youth_f}</div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">({safeCounts.youth_m}/{safeCounts.youth_f})</div>
                  </div>
                  <div className="bg-amber-50/50 border border-amber-100/50 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-500 mb-0.5">어린이</div>
                    <div className="text-lg font-black text-amber-600 tracking-tighter">{safeCounts.child_m + safeCounts.child_f}</div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">({safeCounts.child_m}/{safeCounts.child_f})</div>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100/50 rounded-xl p-2.5 text-center">
                    <div className="text-[10px] font-bold text-slate-500 mb-0.5">유아</div>
                    <div className="text-lg font-black text-rose-600 tracking-tighter">{safeCounts.infant_m + safeCounts.infant_f}</div>
                    <div className="text-[9px] font-medium text-slate-400 mt-0.5">({safeCounts.infant_m}/{safeCounts.infant_f})</div>
                  </div>
                </div>

                {record.memo && (
                  <div className="flex items-start space-x-2.5 mt-4 pt-4 border-t border-slate-100/80 text-sm text-slate-600 pl-2">
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
}
