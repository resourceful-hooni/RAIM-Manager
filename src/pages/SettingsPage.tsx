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
    version: '1.9.5',
    notes: [
      '앱 업데이트 시 캐시가 강제로 비워지지 않던 현상 수정 (자동 새로고침 적용)',
      '앱 정보의 버전 표시가 과거 버전으로 고정되어 있던 문제 해결',
    ]
  },
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

/* ──────────────────────────────────────────────────────────────
   화면 정돈용 클래스 토큰.
   카드 안에 또 카드를 넣지 않고, 섹션 카드 하나 + 얇은 구분선으로 된
   "한 동작 = 한 줄" 구조를 만든다.

   CARD vs CARD_BLUR: 진한 단색 버튼이 들어가는 카드에는 backdrop-blur를
   쓰지 않는다. 크로뮴이 그 색을 카드 전체에 번지게 칠하는 문제가 있어서다.
   채도 높은 자식이 없는 카드만 blur를 유지한다.
   ────────────────────────────────────────────────────────────── */
const CARD = 'rounded-3xl border border-white/70 bg-white/55 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] sm:p-5';
const CARD_BLUR = 'rounded-3xl border border-white/60 bg-white/40 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.04)] backdrop-blur-2xl sm:p-5';

const SECTION_TITLE = 'flex items-center gap-2 text-sm font-extrabold tracking-tight text-brand-dark';
const SECTION_HELP = 'mt-1 text-2xs font-medium leading-relaxed text-brand-muted';

/** 라벨 + 입력 + 버튼이 한 줄. 420px 미만에서만 라벨이 위로 접힌다. */
const ROW = 'flex flex-wrap items-center gap-2 py-3 min-[420px]:flex-nowrap min-[420px]:gap-3';
/** 라벨이 남는 가로 공간을 먹어, 입력·버튼은 오른쪽에 모인다. */
const ROW_LABEL = 'w-full min-[420px]:min-w-0 min-[420px]:flex-1';
const ROW_TITLE = 'flex items-center gap-1.5 text-xs font-bold text-brand-dark';
const ROW_SUB = 'mt-0.5 block text-3xs font-medium leading-relaxed text-brand-muted';
const DIVIDER = 'h-px bg-white/70';
const STATUS_ROW = 'flex items-center justify-between gap-3 py-3';

const FIELD_BASE = 'h-11 min-w-0 flex-1 rounded-xl border border-white/70 bg-white/70 px-3 text-sm font-bold text-brand-dark shadow-sm tnum';
/** 좁은 화면에서는 버튼과 한 줄을 나눠 쓰고, 그 위로는 필요한 만큼만 차지한다. */
const FIELD = `${FIELD_BASE} basis-40 min-[420px]:w-36 min-[420px]:flex-none sm:w-44`;

/** 동작 버튼은 44px 높이를 지키되, 줄 자체는 뚱뚱해지지 않게 한다. */
const BTN = 'inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all active:scale-95';
const BTN_DARK = 'border border-brand-dark/50 bg-brand-dark text-white shadow-md hover:bg-brand-black';
const BTN_GREEN = 'border border-emerald-800/50 bg-emerald-700 text-white shadow-md hover:bg-emerald-800';
const BTN_SOFT = 'border border-white bg-white/80 text-brand-dark shadow-sm hover:bg-white';
const BTN_WARN = 'border border-amber-200 bg-white/80 text-amber-700 shadow-sm hover:bg-white';
const BTN_OFF = 'cursor-not-allowed border border-white/60 bg-white/50 text-brand-muted active:scale-100';
const FILE_PICK = 'cursor-pointer has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-blue has-[:focus-visible]:outline-offset-2';

/** 상태 표시용 작은 칩 — 세로로 부풀리지 않는다(py-1.5 고정). */
const CHIP = 'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-2xs font-bold shadow-sm';

/** 되돌릴 수 없는 작업 전에, 영향을 받는 기간을 사람이 읽을 수 있게 덧붙인다. */
const describeRange = (records: unknown[]): string => {
  const dates = records
    .map(r => (r as { date?: unknown } | null)?.date)
    .filter((d): d is string => typeof d === 'string' && d.length > 0)
    .sort();
  if (dates.length === 0) return '';
  const first = dates[0];
  const last = dates[dates.length - 1];
  return first === last ? ` (${first})` : ` (${first} ~ ${last})`;
};

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
  const [expandedVersions, setExpandedVersions] = useState<Record<string, boolean>>({});
  const [showAllHistory, setShowAllHistory] = useState(false);

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

      const currentCount = getAllRecords().length;
      const confirmMessage = [
        '[복구 확인] 아래 내용대로 데이터를 복구합니다.',
        '',
        `· 불러올 기록: ${records.length}건${describeRange(records)}`,
        `· 현재 기기에 보관 중인 기록: ${currentCount}건`,
        '· 같은 기록(날짜·관람유형·회차·프로그램)은 백업 파일의 내용으로 덮어써집니다.',
        '· 백업 파일에 없는 기존 기록은 그대로 남습니다.',
        '· 덮어쓴 내용은 되돌릴 수 없으니, 먼저 현재 데이터를 백업해 주세요.',
        '',
        '복구를 진행하시겠습니까?',
      ].join('\n');

      if (window.confirm(confirmMessage)) {
        await setAllRecords(records); // We need to add setAllRecords to useStore
        toast.success('데이터 복구가 완료되었습니다.');
      }
    } catch {
      // 파일 내용이 그대로 콘솔에 남지 않도록, 원본 오류 객체는 기록하지 않는다
      console.error('Restore failed');
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

      const confirmMessage = [
        '[가져오기 확인] 아래 내용대로 데이터를 등록합니다.',
        '',
        `· 불러올 기록: ${records.length}건${describeRange(records)}`,
        '· 같은 기록(날짜·관람유형·회차·프로그램)은 파일의 내용으로 덮어써집니다.',
        '· 파일에 없는 기존 기록은 그대로 남습니다.',
        '',
        '데이터를 가져오시겠습니까?',
      ].join('\n');

      if (window.confirm(confirmMessage)) {
        await importRecords(records);
        toast.success('데이터를 성공적으로 가져왔습니다.');
      }
    } catch {
      // 파일 내용이 그대로 콘솔에 남지 않도록, 원본 오류 객체는 기록하지 않는다
      console.error('Import failed');
      toast.error('데이터를 가져오는 중 오류가 발생했습니다.');
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };
  return (
    <div className="mx-auto w-full max-w-4xl p-3 sm:p-4">
      <h2 className="mb-3 ml-1 text-xl font-extrabold tracking-tight text-brand-dark sm:mb-4">설정 (Settings)</h2>

      {/* 넓은 화면에서는 서로 독립적인 섹션을 2열로 흘려 세로 스크롤을 줄인다. */}
      <div className="grid grid-cols-1 items-start gap-3 sm:gap-4 lg:grid-cols-2">

        {/* ── 데이터 내보내기 (엑셀) ───────────────────────────── */}
        <section className={CARD}>
          <h3 className={SECTION_TITLE}>
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
            데이터 내보내기 (XLSX)
          </h3>
          <p className={SECTION_HELP}>고른 날짜 또는 달의 방문객 데이터를 엑셀 파일로 내려받습니다.</p>

          <div className="mt-1">
            <div className={ROW}>
              <div className={ROW_LABEL}>
                <span className={ROW_TITLE}>
                  <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  일간
                </span>
                <span className={ROW_SUB}>하루 전체</span>
              </div>
              <input
                type="date"
                aria-label="내보낼 날짜"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
                className={FIELD}
              />
              <button
                onClick={handleExportXLSX_Daily}
                className={cn(BTN, BTN_GREEN)}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>내려받기</span>
              </button>
            </div>

            <div className={DIVIDER} />

            <div className={ROW}>
              <div className={ROW_LABEL}>
                <span className={ROW_TITLE}>
                  <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  월간
                </span>
                <span className={ROW_SUB}>보고용 통합</span>
              </div>
              <input
                type="month"
                aria-label="내보낼 달"
                value={exportMonth}
                onChange={(e) => setExportMonth(e.target.value)}
                className={FIELD}
              />
              <button
                onClick={handleExportXLSX_Monthly}
                className={cn(BTN, BTN_SOFT)}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>내려받기</span>
              </button>
            </div>
          </div>
        </section>

        {/* ── 백업과 복구 (JSON) ───────────────────────────────── */}
        <section className={CARD}>
          <h3 className={SECTION_TITLE}>
            <Download className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
            백업과 복구 (JSON)
          </h3>
          <p className={SECTION_HELP}>전체 데이터를 파일 하나로 보관하고, 필요할 때 그 파일로 되돌립니다. 정기적인 백업을 권장합니다.</p>

          <div className="mt-1">
            <div className={ROW}>
              <div className={ROW_LABEL}>
                <span className={ROW_TITLE}>전체 데이터 백업</span>
                <span className={ROW_SUB}>지금까지 쌓인 기록 전부</span>
              </div>
              <button
                onClick={handleBackupJSON}
                className={cn(BTN, BTN_DARK)}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>백업 파일 저장</span>
              </button>
            </div>

            <div className={DIVIDER} />

            <div className={ROW}>
              <div className={ROW_LABEL}>
                <span className={ROW_TITLE}>데이터 복구</span>
                <span className="mt-0.5 block text-3xs font-medium leading-relaxed text-amber-700">
                  같은 날짜·관람유형·회차·프로그램의 기존 기록은 백업 파일의 내용으로 덮어써집니다.
                </span>
              </div>
              <label className={cn(BTN, FILE_PICK, isImporting ? BTN_OFF : BTN_WARN)}>
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isImporting ? '복구 중...' : '백업 파일 선택'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreJSON}
                  disabled={isImporting}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </section>

        {/* ── 기존 데이터 가져오기 (XLSX/CSV) ──────────────────── */}
        <section className={CARD}>
          <h3 className={SECTION_TITLE}>
            <FileUp className="h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
            기존 데이터 가져오기 (XLSX/CSV)
          </h3>
          <p className={SECTION_HELP}>기존 엑셀 파일(.xlsx, .csv)을 올려 데이터를 일괄 등록합니다.</p>

          <div className={ROW}>
            <div className={ROW_LABEL}>
              <span className={ROW_TITLE}>파일로 일괄 등록</span>
              <span className={ROW_SUB}>다목적실1(무인자동차), 다목적실2(스낵헌터), 다목적실3(메디봇) 데이터가 자동으로 분류되어 감지됩니다.</span>
            </div>
            <label className={cn(BTN, FILE_PICK, isImporting ? BTN_OFF : BTN_DARK)}>
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{isImporting ? '처리 중...' : '엑셀 파일 선택'}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleImportFile}
                disabled={isImporting}
                className="sr-only"
              />
            </label>
          </div>
        </section>

        {/* ── 보안 (PIN) ───────────────────────────────────────── */}
        <section className={CARD}>
          <h3 className={SECTION_TITLE}>
            <KeyRound className="h-4 w-4 shrink-0 text-brand-dark" aria-hidden="true" />
            보안 비밀번호
          </h3>
          <p className={SECTION_HELP}>관리자 화면 접속에 필요한 6자리 또는 8자리 숫자입니다.</p>

          {user?.email !== 'wlgns1232356@gmail.com' ? (
            <p className="mt-3 flex items-start gap-1.5 rounded-2xl border border-rose-100/60 bg-rose-50/70 px-3 py-2.5 text-2xs font-bold leading-relaxed text-rose-700">
              <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>최고 관리자 계정(wlgns1232356@gmail.com)만 비밀번호를 변경할 수 있습니다.</span>
            </p>
          ) : !isPinEditing ? (
            <div className={ROW}>
              <div className={ROW_LABEL}>
                <span className={ROW_TITLE}>현재 비밀번호</span>
                <span className="mt-0.5 block text-base font-black tracking-widest text-brand-dark" aria-hidden="true">******</span>
              </div>
              <button
                onClick={() => setIsPinEditing(true)}
                className={cn(BTN, BTN_SOFT)}
              >
                비밀번호 변경
              </button>
            </div>
          ) : (
            <div className="py-3">
              <label htmlFor="settings-new-pin" className={ROW_TITLE}>새 비밀번호</label>
              <span className={ROW_SUB}>6자리 또는 8자리 숫자만</span>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id="settings-new-pin"
                  type="password"
                  maxLength={8}
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="숫자 6자리 또는 8자리"
                  className={cn(FIELD_BASE, 'tracking-widest')}
                  autoFocus
                />
                <button
                  onClick={() => {
                    setIsPinEditing(false);
                    setNewPin('');
                  }}
                  className="shrink-0 rounded-xl border border-white/60 bg-white/60 px-3 py-2 text-xs font-bold text-brand-muted transition-all hover:bg-white/80 hover:text-brand-dark active:scale-95"
                >
                  취소
                </button>
                <button
                  onClick={handleUpdatePin}
                  disabled={newPin.length !== 6 && newPin.length !== 8}
                  className={cn(BTN, BTN_DARK, 'px-3 disabled:cursor-not-allowed disabled:bg-brand-dark disabled:opacity-50')}
                >
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>저장</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ── 동기화 상태 ──────────────────────────────────────── */}
        <section className={CARD}>
          <h3 className={SECTION_TITLE}>
            <Cloud className="h-4 w-4 shrink-0 text-brand-blue" aria-hidden="true" />
            동기화 상태 (서버 연동)
          </h3>
          <p className={SECTION_HELP}>
            오프라인에서도 기기에 안전하게 임시 저장되며, 네트워크가 복구되면 <strong className="font-bold text-brand-dark">서버로 자동 동기화</strong>됩니다.
          </p>

          <div className="mt-1">
            <div className={STATUS_ROW}>
              <span className="text-xs font-bold text-brand-dark">네트워크 연결</span>
              {navigator.onLine ? (
                <span className={cn(CHIP, 'border-emerald-100/50 bg-emerald-50/80 text-emerald-800')}>
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-700" aria-hidden="true" />
                  온라인
                </span>
              ) : (
                <span className={cn(CHIP, 'border-rose-100/50 bg-rose-50/80 text-rose-800')}>
                  <CloudOff className="h-3 w-3 text-rose-700" aria-hidden="true" />
                  오프라인
                </span>
              )}
            </div>

            <div className={DIVIDER} />

            <div className={STATUS_ROW}>
              <div className="min-w-0">
                <span className="text-xs font-bold text-brand-dark">오프라인 대기열</span>
                <span className={ROW_SUB}>서버로 전송되지 못한 데이터</span>
              </div>
              {pendingSyncCount > 0 ? (
                <span className={cn(CHIP, 'border-amber-100/50 bg-amber-50/80 text-amber-800')}>
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-700" aria-hidden="true" />
                  <span className="tnum">{pendingSyncCount}건 대기중</span>
                </span>
              ) : (
                <span className={cn(CHIP, 'border-white/60 bg-white/60 text-brand-muted')}>모두 전송됨</span>
              )}
            </div>
          </div>
        </section>

        {/* ── 앱 정보 (진한 단색 자식이 없어 blur 유지) ─────────── */}
        <section className={CARD_BLUR}>
          <h3 className={SECTION_TITLE}>
            <Info className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden="true" />
            앱 정보
          </h3>

          <div className="mt-1">
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-xs font-bold text-brand-muted">버전</span>
              <span className="text-xs font-black text-brand-dark tnum text-selectable">v{UPDATE_HISTORY[0].version}</span>
            </div>
            <div className={DIVIDER} />
            <div className="flex items-center justify-between gap-3 py-2.5">
              <span className="text-xs font-bold text-brand-muted">개발</span>
              <a
                href="https://kimjihoon.me"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-black text-brand-dark hover:underline"
              >
                김지훈
              </a>
            </div>
          </div>

          <h4 className="mt-4 flex items-center gap-1.5 text-2xs font-extrabold tracking-tight text-brand-muted">
            <History className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            버전별 업데이트 내역
          </h4>

          <div className="mt-0.5">
            {(showAllHistory ? UPDATE_HISTORY : UPDATE_HISTORY.slice(0, 3)).map((item, i) => (
              <div key={item.version} className={i > 0 ? 'border-t border-white/60' : undefined}>
                <button
                  onClick={() => toggleVersion(item.version)}
                  aria-expanded={!!expandedVersions[item.version]}
                  className="flex min-h-11 w-full items-center justify-between gap-2 text-left transition-colors hover:text-brand-blue"
                >
                  <span className="text-xs font-bold text-brand-dark tnum text-selectable">v{item.version}</span>
                  {expandedVersions[item.version] ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-brand-muted" aria-hidden="true" />
                  )}
                </button>
                {expandedVersions[item.version] && (
                  <ul className="list-disc space-y-1.5 pb-3 pl-5 text-2xs leading-relaxed text-brand-muted">
                    {item.notes.map((note, index) => (
                      <li key={index}>{note}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {!showAllHistory && UPDATE_HISTORY.length > 3 && (
              <button
                onClick={() => setShowAllHistory(true)}
                className="flex w-full items-center justify-center gap-1 border-t border-white/60 py-2 text-2xs font-bold text-brand-muted transition-colors hover:text-brand-dark"
              >
                <span>과거 내역 더보기</span>
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
          </div>
        </section>
      </div>

      {/* 조용한 푸터 */}
      <footer className="mt-6 flex flex-col items-center gap-1.5 pb-4">
        <img src="/raim_logo.png" alt="Seoul Robot & AI Museum" className="h-6 object-contain opacity-50" />
        <p className="text-3xs font-bold text-brand-muted">© 2026 Seoul Robot &amp; AI Museum · v{UPDATE_HISTORY[0].version}</p>
      </footer>
    </div>
  );
}
