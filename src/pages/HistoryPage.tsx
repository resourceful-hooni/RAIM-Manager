import { useStore } from '@/store/useStore';
import { FileText } from 'lucide-react';

export default function HistoryPage() {
  const { getAllRecords } = useStore();
  
  const sortedRecords = [...getAllRecords()].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.session.localeCompare(a.session);
  });

  const validRecords = sortedRecords.filter(r => {
    const total = r.counts.adult + r.counts.youth + r.counts.child + r.counts.infant;
    return total > 0 || r.memo.trim() !== '';
  });

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-slate-900">전체 기록 (History)</h2>
      
      {validRecords.length === 0 ? (
        <div className="text-center text-slate-400 py-10">기록이 없습니다.</div>
      ) : (
        <div className="space-y-3">
          {validRecords.map(record => {
            const total = record.counts.adult + record.counts.youth + record.counts.child + record.counts.infant;
            
            return (
              <div key={record.id} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mr-2 border border-blue-100">
                      {record.type === 'autonomous' ? '자율' : '예약'}
                    </span>
                    <span className="text-sm font-medium text-slate-700">{record.date} {record.session}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">총 {total}명</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mt-3 mb-3">
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-500">성인</div>
                    <div className="text-sm font-semibold text-blue-600">{record.counts.adult}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-500">청소년</div>
                    <div className="text-sm font-semibold text-emerald-600">{record.counts.youth}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-500">어린이</div>
                    <div className="text-sm font-semibold text-amber-600">{record.counts.child}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 text-center">
                    <div className="text-[10px] text-slate-500">유아</div>
                    <div className="text-sm font-semibold text-rose-600">{record.counts.infant}</div>
                  </div>
                </div>

                {record.memo && (
                  <div className="flex items-start space-x-2 mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="whitespace-pre-wrap">{record.memo}</p>
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
