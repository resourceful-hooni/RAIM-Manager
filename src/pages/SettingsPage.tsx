import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Download, Cloud, Info, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function SettingsPage() {
  const { getAllRecords } = useStore();
  const [exportDate, setExportDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleExportCSV = () => {
    const allRecords = getAllRecords();
    const records = allRecords.filter(r => r.date === exportDate);
    
    if (records.length === 0) {
      alert(`${exportDate} 날짜에 내보낼 데이터가 없습니다.`);
      return;
    }

    const headers = ['날짜', '유형', '시간/회차', '성인', '청소년', '어린이', '유아', '총계', '메모'];
    const csvRows = [headers.join(',')];

    records.forEach(r => {
      const total = r.counts.adult + r.counts.youth + r.counts.child + r.counts.infant;
      const typeLabel = r.type === 'autonomous' ? '자율관람' : '예약관람';
      const memo = `"${r.memo.replace(/"/g, '""')}"`; // Escape quotes
      
      const row = [
        r.date,
        typeLabel,
        r.session,
        r.counts.adult,
        r.counts.youth,
        r.counts.child,
        r.counts.infant,
        total,
        memo
      ];
      csvRows.push(row.join(','));
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RAIM_Visitor_Data_${exportDate.replace(/-/g, '')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-4 text-slate-900">설정 (Settings)</h2>

      <div className="space-y-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
          <h3 className="text-sm font-medium text-slate-800 mb-3 flex items-center">
            <Download className="w-4 h-4 mr-2" />
            데이터 내보내기 (CSV)
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            선택한 날짜의 방문객 데이터를 CSV 파일로 다운로드하여 엑셀에서 확인할 수 있습니다.
          </p>
          
          <div className="flex space-x-2 mb-4">
            <div className="flex-1 flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                className="bg-transparent border-none text-sm text-slate-900 focus:outline-none w-full"
              />
            </div>
          </div>

          <button
            onClick={handleExportCSV}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-medium transition-colors"
          >
            {exportDate} 데이터 다운로드
          </button>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
          <h3 className="text-sm font-medium text-slate-800 mb-3 flex items-center">
            <Cloud className="w-4 h-4 mr-2" />
            동기화 상태
          </h3>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">서버 연결 상태</span>
            <span className="text-emerald-600 font-medium">온라인 (자동 동기화 중)</span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            오프라인 상태에서는 기기에 안전하게 임시 저장되며, 네트워크 연결 시 자동으로 서버와 동기화됩니다.
          </p>
        </div>

        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
          <h3 className="text-sm font-medium text-slate-800 mb-3 flex items-center">
            <Info className="w-4 h-4 mr-2" />
            앱 정보
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">버전</span>
              <span className="text-slate-700">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">개발</span>
              <span className="text-slate-700">RAIM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
