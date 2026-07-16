import React, { useState } from 'react';
import { useStore } from '@/store/useStore';
import { Download, Cloud, Info, Calendar, FileSpreadsheet, Upload, AlertTriangle, FileUp, CalendarRange, CloudOff, KeyRound, Check, ChevronDown, ChevronUp, History } from 'lucide-react';
import { format } from 'date-fns';
import { exportToXLSX } from '@/lib/exportUtils';
import { parseVisitorFile } from '@/lib/importUtils';
import { cn, validatePin } from '@/lib/utils';
import { useAuth } from '@/components/AuthProvider';
import { saveAs } from 'file-saver';
import { toast } from 'sonner';

const UPDATE_HISTORY = [
  {
    version: '1.9.4',
    notes: [
      '텍스트 드래그 방지 기능 추가 및 입력 요소 예외 처리',
      '비교 분석(일별, 주별, 월별, 연간) 시 현재 시각 및 당일 기준 일치하도록 개선',
    ]
  },
  {
    version: '1.9.0',
    notes: [
      '최신 Gemini 3.5 Flash 모델 탑재 및 다각도 심층 프롬프트 정교화',
      '인메모리 분석 캐싱(15분 TTL) 및 고품질 동적 AI 폴백 엔진 구축',
      '카운터 페이지에서 자율관람 모드 시 취소/노쇼 패널 자동 숨김 처리',
      'CSV 임포트 및 취소 데이터 연동 오류 해결, 컴파일 안정성 강화',
    ]
  },
  {
    version: '1.8.2',
    notes: [
      '시스템 라이브러리 최신화 및 안정성 검증 완료',
      '신규 공식 폰트(Paperlogy) 전체 시스템 적용',
      'UI 컴포넌트 렌더링 최적화 및 버그 수정',
    ]
  },
  {
    version: '1.7.0',
    notes: [
      '모든 기기에서 각 프로그램(무인자동차, 스낵헌터)별 실시간 최근 데이터 입력자 및 시간 동기화 (입력 책임 명확화)',
      '대시보드 총 방문객 카드에 자율관람 / 예약관람 데이터 분류 토글 기능 추가',
      '이스터에그 화면 비율 자동 조정 및 사진 로드 오류 해결',
      '앱 버전 및 업데이트 내역 리스트 간소화 (가독성 향상)',
    ]
  },
  {
    version: '1.6.x',
    notes: [
      '실시간 연동 중 완전 수동 모드로 전환/해제 토글 기능 (1.6.9)',
      '시스템 설명서 모달 및 상단 네비게이션바 빠른 확인 버튼 (1.6.9)',
      '초기 화면 로드 시 해당 시간대 예약관람 자동 연동 활성화 (1.6.8)',
      '예약관람 시간 외 버튼 클릭 시 팝업 및 자동 시스템 (1.6.5 ~ 1.6.7)',
      '보안 PIN 도입 및 전체 데이터 백업 및 복구 (1.6.2)',
    ]
  }
];

export default function SettingsPage() {
  const { user } = useAuth();
  const getAllRecords = useStore(state => state.getAllRecords);
  const importRecords = useStore(state => state.importRecords);
  const pendingSyncCount = useStore(state => state.pendingSyncCount);
  const activeProgram = useStore(state => state.activeProgram);
  const setAllRecords = useStore(state => state.setAllRecords);
  const appPin = useStore(state => state.appPin);
  const updateAppPin = useStore(state => state.updateAppPin);
  const [exportDate, setExportDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exportMonth, setExportMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isImporting, setIsImporting] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [isPinEditing, setIsPinEditing] = useState(false);
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({
    '1.9.4': true,
  });

  const toggleVersion = (version: string) => {
    setExpandedVersions(prev => ({
      ...prev,
      [version]: !prev[version]
    }));
  };

  const handleUpdatePin = async () => {
    if (user?.email !== 'wlgns1232356@gmail.com') {
      toast.error('비밀번호를 변경할 수 있는 권한이 없습니다. 최고 관리자 계정으로 접속해 주세요.');
      return;
    }

    const valResult = validatePin(newPin);
    if (!valResult.isValid) {
      toast.error(valResult.error || '취약한 비밀번호 형식이거나 지원되지 않습니다.');
      return;
    }

    await updateAppPin(newPin);
    setIsPinEditing(false);
    setNewPin('');
    toast.success('보안 비밀번호가 성공적으로 변경되었습니다.');
  };

  const handleBackupJSON = () => {
    const allRecords = getAllRecords();
    const blob = new Blob([JSON.stringify(allRecords, null, 2)], { type: 'application/json' });
    saveAs(blob, `RAIM_전체백업_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`);
  };

  const handleRestoreJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const text = await file.text();
      const records = JSON.parse(text);
      if (!Array.isArray(records)) throw new Error("Invalid format");
      
      if (window.confirm(`[주의] 복구 시 기존 데이터가 덮어씌워질 수 있습니다.\n\n총 ${records.length}개의 데이터를 복구하시겠습니까?`)) {
        await setAllRecords(records); // We need to add setAllRecords to useStore
        toast.success('데이터 복구가 완료되었습니다.');
      }
    } catch (error) {
      console.error('Restore Error:', error);
      toast.error('백업 데이터를 불러오는 중 오류가 발생했습니다. 올바른 JSON 파일인지 확인해주세요.');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleExportXLSX_Daily = () => {
    const allRecords = getAllRecords();
    const records = allRecords.filter(r => r.date === exportDate);
    
    if (records.length === 0) {
      toast.warning(`${exportDate} 날짜에 내보낼 데이터가 없습니다.`);
      return;
    }

    exportToXLSX(exportDate, allRecords, 'daily');
  };

  const handleExportXLSX_Monthly = () => {
    const allRecords = getAllRecords();
    const records = allRecords.filter(r => r.date.startsWith(exportMonth));
    
    if (records.length === 0) {
      toast.warning(`${exportMonth} 월에 내보낼 데이터가 없습니다.`);
      return;
    }

    exportToXLSX(exportMonth, allRecords, 'monthly');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const records = await parseVisitorFile(file);
      
      if (records.length === 0) {
        toast.error('가져올 수 있는 데이터가 없습니다. 파일 형식을 확인해주세요.');
        return;
      }

      if (window.confirm(`${records.length}개의 데이터를 가져오시겠습니까? 기존 데이터와 중복될 경우 덮어씌워집니다.`)) {
        await importRecords(records);
        toast.success('데이터를 성공적으로 가져왔습니다.');
      }
    } catch (error) {
      console.error('Import Error:', error);
      toast.error('데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
      <h2 className="text-xl font-extrabold mb-6 text-brand-dark tracking-tight ml-1">설정 (Settings)</h2>

      <div className="space-y-4">
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 relative overflow-hidden group">
          <h3 className="text-sm font-extrabold text-brand-dark mb-2 flex items-center tracking-tight">
            <FileSpreadsheet className="w-5 h-5 mr-2 text-emerald-600" />
            데이터 내보내기 (XLSX)
          </h3>
          <p className="text-xs font-medium text-brand-muted mb-5 leading-relaxed">
            원하시는 옵션(하루 전체 또는 월간 전체)을 선택하여 방문객 데이터를 엑셀로 다운로드합니다.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Daily Export Box */}
            <div className="flex-1 bg-white/40 border border-white/60 shadow-sm backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-3 text-brand-dark">
                <Calendar className="w-4 h-4" />
                <span className="text-xs font-bold">일간 다운로드</span>
              </div>
              <input
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                className="w-full bg-white/60 border border-white/60 rounded-xl px-3 py-2 text-sm font-bold text-brand-dark focus:outline-none   mb-3 shadow-sm"
              />
              <button
                onClick={handleExportXLSX_Daily}
                className="w-full bg-emerald-600/90 hover:bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 border border-emerald-500/50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>데이터 다운로드</span>
              </button>
            </div>

            {/* Monthly Export Box */}
            <div className="flex-1 bg-white/40 border border-white/60 shadow-sm backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-3 text-brand-dark">
                <CalendarRange className="w-4 h-4" />
                <span className="text-xs font-bold">월간 전체(보고용)</span>
              </div>
              <input
                type="month"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className="w-full bg-white/60 border border-white/60 rounded-xl px-3 py-2 text-sm font-bold text-brand-dark focus:outline-none   mb-3 shadow-sm"
              />
              <button
                onClick={handleExportXLSX_Monthly}
                className="w-full bg-teal-600/90 hover:bg-teal-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 border border-teal-500/50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>월간 통합 다운로드</span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 relative overflow-hidden group">
          <h3 className="text-sm font-extrabold text-brand-dark mb-2 flex items-center tracking-tight">
            <Download className="w-5 h-5 mr-2 text-indigo-600" />
            시스템 데이터 백업 / 복구 (JSON)
          </h3>
          <p className="text-xs font-medium text-brand-muted mb-5 leading-relaxed">
            전체 데이터를 백업하거나 이전 백업 파일로 시스템을 복구합니다.<br/>
            <span className="text-indigo-700 font-bold flex items-center mt-1">
              정기적인 백업을 권장합니다.
            </span>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Backup Box */}
            <div className="flex-1 bg-white/40 border border-white/60 shadow-sm backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-3 text-brand-dark">
                <Download className="w-4 h-4" />
                <span className="text-xs font-bold">전체 데이터 백업</span>
              </div>
              <button
                onClick={handleBackupJSON}
                className="w-full bg-indigo-600/90 hover:bg-indigo-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center justify-center space-x-2 mt-auto border border-indigo-500/50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON 백업 파일 다운로드</span>
              </button>
            </div>

            {/* Restore Box */}
            <div className="flex-1 bg-white/40 border border-white/60 shadow-sm backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center space-x-2 mb-3 text-brand-dark">
                <Upload className="w-4 h-4" />
                <span className="text-xs font-bold">데이터 복구</span>
              </div>
              <label className={cn(
                "w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer",
                isImporting 
                  ? "bg-white/50 text-brand-muted cursor-not-allowed border border-white/60" 
                  : "bg-brand-dark hover:bg-brand-black text-white active:scale-95 border border-brand-dark/50"
              )}>
                <Upload className="w-3.5 h-3.5" />
                <span>{isImporting ? '복구 중...' : 'JSON 백업 파일 선택'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreJSON}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 relative overflow-hidden group">
          <h3 className="text-sm font-extrabold text-brand-dark mb-2 flex items-center tracking-tight">
            <FileUp className="w-5 h-5 mr-2 text-amber-600" />
            기존 데이터 가져오기 (XLSX/CSV)
          </h3>
          <p className="text-xs font-medium text-brand-muted mb-5 leading-relaxed">
            기존 엑셀 파일(.xlsx, .csv)을 업로드하여 데이터를 일괄 등록합니다.<br/>
            <span className="text-amber-700 font-bold flex items-center mt-1">
              <AlertTriangle className="w-3 h-3 mr-1" />
              다목적실1(무인자동차), 다목적실2(스낵헌터), 다목적실3(메디봇) 데이터가 자동으로 분류되어 감지됩니다.
            </span>
          </p>

          <label className={cn(
            "w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-md cursor-pointer",
            isImporting 
              ? "bg-white/50 text-brand-muted cursor-not-allowed border border-white/60" 
              : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white active:scale-[0.98]"
          )}>
            <Upload className="w-4 h-4" />
            <span>{isImporting ? '데이터 처리 중...' : '엑셀 파일 선택 및 업로드'}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
              disabled={isImporting}
              className="hidden"
            />
          </label>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 relative overflow-hidden group">
          <h3 className="text-sm font-extrabold text-brand-dark mb-2 flex items-center tracking-tight">
            <KeyRound className="w-5 h-5 mr-2 text-brand-dark" />
            보안 비밀번호 설정
          </h3>
          <p className="text-xs font-medium text-brand-muted mb-4 leading-relaxed">
            관리자 화면 접속에 필요한 보안 비밀번호(6자리 또는 8자리 숫자)를 변경할 수 있습니다.<br/>
          </p>
          
          <div className="bg-white/40 border border-white/60 shadow-sm backdrop-blur-sm rounded-2xl p-4">
            {user?.email !== 'wlgns1232356@gmail.com' ? (
              <div className="text-center py-4 text-xs font-bold text-rose-500">
                ⚠️ 최고 관리자 계정(wlgns1232356@gmail.com)만 비밀번호를 변경할 수 있습니다.
              </div>
            ) : !isPinEditing ? (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-brand-muted font-bold block mb-1">현재 비밀번호</span>
                  <span className="text-lg font-black tracking-widest text-brand-dark">******</span>
                </div>
                <button
                  onClick={() => setIsPinEditing(true)}
                  className="bg-white/80 border border-white hover:bg-white text-brand-dark px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  비밀번호 변경
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <span className="text-xs text-brand-muted font-bold block mb-1">새 비밀번호 (6자리 또는 8자리 숫자만)</span>
                  <input
                    type="password"
                    maxLength={8}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="새로운 6자리 또는 8자리 숫자"
                    className="w-full bg-white/80 border border-white rounded-xl px-3 py-2 text-sm tracking-widest font-bold text-brand-dark focus:outline-none   shadow-sm"
                    autoFocus
                  />
                </div>
                <div className="flex space-x-2 mt-5">
                  <button
                    onClick={() => {
                      setIsPinEditing(false);
                      setNewPin('');
                    }}
                    className="bg-white/60 border border-white/60 hover:bg-white/80 text-brand-muted px-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleUpdatePin}
                    disabled={newPin.length !== 6 && newPin.length !== 8}
                    className="bg-brand-dark hover:bg-brand-black disabled:opacity-50 disabled:bg-brand-dark disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 flex items-center space-x-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 relative overflow-hidden">
          <h3 className="text-sm font-extrabold text-brand-dark mb-4 flex items-center tracking-tight">
            <Cloud className="w-5 h-5 mr-2 text-brand-blue" />
            동기화 상태 (서버 연동)
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm bg-white/40 backdrop-blur-sm p-3.5 rounded-2xl border border-white/60 shadow-sm">
              <span className="text-brand-dark font-bold">네트워크 연결</span>
              {navigator.onLine ? (
                <div className="flex items-center space-x-2 bg-emerald-50/80 px-3 py-1.5 rounded-full border border-emerald-100/50 shadow-sm">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-emerald-800 font-bold text-xs">온라인</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 bg-rose-50/80 px-3 py-1.5 rounded-full border border-rose-100/50 shadow-sm">
                  <CloudOff className="w-3 h-3 text-rose-500" />
                  <span className="text-rose-800 font-bold text-xs">오프라인</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-sm bg-white/40 backdrop-blur-sm p-3.5 rounded-2xl border border-white/60 shadow-sm">
              <div className="flex flex-col">
                <span className="text-brand-dark font-bold">오프라인 대기열</span>
                <span className="text-[10px] font-medium text-brand-muted mt-0.5">서버로 전송되지 못한 데이터</span>
              </div>
              {pendingSyncCount > 0 ? (
                <div className="flex items-center space-x-1.5 bg-amber-50/80 border border-amber-100/50 px-3 py-1.5 rounded-xl shadow-sm">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-amber-800 font-black text-sm">{pendingSyncCount}건 대기중</span>
                </div>
              ) : (
                <div className="bg-white/50 text-brand-muted px-3 py-1.5 rounded-xl font-bold text-xs border border-white/60 shadow-sm">
                  모두 전송됨
                </div>
              )}
            </div>
          </div>

          <p className="text-[11px] font-medium text-brand-muted mt-4 leading-relaxed px-1">
            인터넷이 끊긴 오프라인 상태에서도 기기에 안전하게 임시 저장되며, 네트워크가 다시 복구되면 <strong className="text-brand-dark">서버로 자동 동기화</strong>됩니다.
          </p>
        </div>

        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 relative overflow-hidden">
          <h3 className="text-sm font-extrabold text-brand-dark mb-4 flex items-center tracking-tight">
            <Info className="w-5 h-5 mr-2 text-brand-muted" />
            앱 정보
          </h3>
          <div className="space-y-3 text-sm bg-white/40 backdrop-blur-sm p-4 rounded-2xl border border-white/60 shadow-sm">
            <div className="flex justify-between items-center">
              <span className="text-brand-muted font-bold">버전</span>
              <span className="text-brand-dark font-black bg-white/80 px-2 py-1 rounded-lg border border-white shadow-sm text-xs">1.9.0</span>
            </div>
            <div className="h-px bg-white/50 w-full" />
            <div className="flex justify-between items-center">
              <span className="text-brand-muted font-bold">개발</span>
              <span className="text-brand-dark font-black">김지훈</span>
            </div>
          </div>
          
          <div className="mt-4 space-y-3">
            <h4 className="font-bold text-brand-dark text-sm flex items-center mb-2">
              <History className="w-4 h-4 mr-2" />
              버전별 업데이트 내역
            </h4>
            
            <div className="space-y-2">
              {UPDATE_HISTORY.map((item) => (
                <div key={item.version} className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden">
                  <button 
                    onClick={() => toggleVersion(item.version)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-white/60 transition-colors"
                  >
                    <span className="font-bold text-brand-dark text-sm">v{item.version}</span>
                    {expandedVersions[item.version] ? (
                      <ChevronUp className="w-4 h-4 text-brand-muted" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-brand-muted" />
                    )}
                  </button>
                  {expandedVersions[item.version] && (
                    <div className="px-4 pb-4 pt-1">
                      <ul className="list-disc pl-4 space-y-1.5 leading-relaxed text-xs text-brand-muted">
                        {item.notes.map((note, index) => (
                          <li key={index}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="mt-12 flex flex-col items-center justify-center space-y-6 pb-6">
          <div className="flex flex-col items-center space-y-4">
            <img src="https://science.seoul.go.kr/RAIM/resource/www/img/footer_logo.png" alt="Seoul Robot & AI Museum" className="h-6 opacity-60" />
            <img src="https://science.seoul.go.kr/RAIM/resource/www/img/logo_wa.png" alt="Web Accessibility" className="h-8 opacity-50" />
          </div>
          <p className="text-xs font-bold text-brand-muted mt-2">© 2026 Seoul Robot & AI Museum</p>
        </div>
      </div>
    </div>
  );
}
