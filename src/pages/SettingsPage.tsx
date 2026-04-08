import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Download, Cloud, Info, Calendar, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { exportToXLSX } from '@/lib/exportUtils';

export default function SettingsPage() {
  const { getAllRecords } = useStore();
  const [exportDate, setExportDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleExportXLSX = () => {
    const allRecords = getAllRecords();
    const records = allRecords.filter(r => r.date === exportDate);
    
    if (records.length === 0) {
      alert(`${exportDate} 날짜에 내보낼 데이터가 없습니다.`);
      return;
    }

    exportToXLSX(exportDate, allRecords);
  };

  return (
    <div className="p-4 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-extrabold mb-6 text-slate-900 tracking-tight ml-1">설정 (Settings)</h2>

      <div className="space-y-4">
        <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500 opacity-80" />
          <h3 className="text-sm font-extrabold text-slate-800 mb-2 flex items-center tracking-tight">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-500" />
            데이터 내보내기 (XLSX)
          </h3>
          <p className="text-xs font-medium text-slate-500 mb-5 leading-relaxed">
            선택한 날짜의 방문객 데이터를 엑셀(XLSX) 파일로 다운로드합니다.
          </p>
          
          <div className="flex space-x-2 mb-5">
            <div className="flex-1 flex items-center space-x-3 bg-slate-50 border border-slate-200/60 rounded-2xl px-4 py-3 shadow-inner">
              <Calendar className="w-5 h-5 text-slate-400" />
              <input
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                className="bg-transparent border-none text-sm font-bold text-slate-900 focus:outline-none w-full"
              />
            </div>
          </div>

          <button
            onClick={handleExportXLSX}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-3.5 rounded-2xl text-sm font-bold transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{exportDate} 엑셀 다운로드</span>
          </button>
        </div>

        <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 opacity-80" />
          <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center tracking-tight">
            <Cloud className="w-5 h-5 mr-2 text-blue-500" />
            동기화 상태
          </h3>
          <div className="flex items-center justify-between text-sm bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
            <span className="text-slate-600 font-bold">서버 연결 상태</span>
            <div className="flex items-center space-x-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-700 font-bold text-xs">온라인 (자동 동기화 중)</span>
            </div>
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-4 leading-relaxed px-1">
            오프라인 상태에서는 기기에 안전하게 임시 저장되며, 네트워크 연결 시 자동으로 서버와 동기화됩니다.
          </p>
        </div>

        <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-300 opacity-80" />
          <h3 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center tracking-tight">
            <Info className="w-5 h-5 mr-2 text-slate-400" />
            앱 정보
          </h3>
          <div className="space-y-3 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">버전</span>
              <span className="text-slate-900 font-black bg-white px-2 py-1 rounded-lg border border-slate-200/60 shadow-sm text-xs">1.0.0</span>
            </div>
            <div className="h-px bg-slate-200/60 w-full" />
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold">개발</span>
              <span className="text-slate-900 font-black">김지훈</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
