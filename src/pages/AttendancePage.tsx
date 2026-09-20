import { useMemo, useState, type ChangeEvent } from 'react';
import { toast } from 'sonner';
import {
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  MessageSquare,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ReservationGroup,
  ReservationParseError,
  SortOrder,
  buildAttendanceTitle,
  buildCompositionNote,
  buildSmsList,
  maskName,
  maskNameList,
  maskPhone,
  parseReservationWorkbook,
  resolveGroup,
} from '@/lib/reservationUtils';
import { CsvEncoding, attendanceFileName, smsFileName } from '@/lib/attendanceExport';
import { downloadAttendanceXlsx, downloadSmsCsv } from '@/lib/attendanceDownload';

/**
 * 예약현황조회(.xlsx) → 출석부(.xlsx) + 문자발송 명단(.csv) 변환 페이지.
 *
 * [개인정보 보호]
 * 업로드한 파일은 브라우저 밖으로 나가지 않는다. 서버 전송·Firestore 저장·콘솔 출력이 없고,
 * 신청자 정보는 이 페이지의 로컬 상태에만 머물다가 초기화하면 사라진다.
 * 화면에는 기본적으로 이름·번호를 가려서 보여준다.
 */

const CARD = 'bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-3xl p-6 relative overflow-hidden';
const CARD_HEADING = 'text-sm font-extrabold text-brand-dark mb-2 flex items-center tracking-tight';
const CARD_DESC = 'text-xs font-medium text-brand-muted mb-5 leading-relaxed';
const SUB_PANEL = 'bg-white/40 border border-white/60 shadow-sm backdrop-blur-sm rounded-2xl p-4';
const PILL = 'px-3 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 border focus:outline-none';
const PILL_ON = 'bg-white/80 text-brand-blue border-white shadow-sm';
const PILL_OFF = 'bg-transparent text-brand-muted border-transparent hover:text-brand-dark';

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'applied', label: '신청일 순' },
  { value: 'name', label: '이름 순 (가나다)' },
];

const ENCODING_OPTIONS: { value: CsvEncoding; label: string }[] = [
  { value: 'cp949', label: 'CP949 (문자발송 프로그램)' },
  { value: 'utf8', label: 'UTF-8 (엑셀에서 열기)' },
];

export default function AttendancePage() {
  const [rawGroups, setRawGroups] = useState<ReservationGroup[]>([]);
  const [label, setLabel] = useState('위크앤드');
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('applied');
  const [csvEncoding, setCsvEncoding] = useState<CsvEncoding>('cp949');
  const [showPersonalData, setShowPersonalData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const groups = useMemo(
    () => rawGroups.map((group) => resolveGroup(group, { includeCancelled, sortOrder })),
    [rawGroups, includeCancelled, sortOrder],
  );

  const totalEntries = groups.reduce((sum, group) => sum + group.entries.length, 0);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    const files: File[] = [];
    for (let index = 0; index < (fileList?.length ?? 0); index += 1) {
      const file = fileList?.item(index);
      if (file) files.push(file);
    }
    if (files.length === 0) return;

    try {
      setIsProcessing(true);
      const parsed: ReservationGroup[] = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        parsed.push(...parseReservationWorkbook(buffer));
      }

      // 같은 회차를 다시 올리면 최신 파일 기준으로 대체한다
      const merged = new Map<string, ReservationGroup>();
      [...rawGroups, ...parsed].forEach((group) => merged.set(group.id, group));
      setRawGroups(
        Array.from(merged.values()).sort(
          (a, b) =>
            a.useDate.localeCompare(b.useDate) ||
            a.timeRange.localeCompare(b.timeRange) ||
            a.programName.localeCompare(b.programName),
        ),
      );
      toast.success(`${parsed.length}개 회차를 불러왔습니다.`);
    } catch (error) {
      // 오류 메시지에 예약자 정보가 섞이지 않도록 안내 문구만 노출한다
      toast.error(
        error instanceof ReservationParseError
          ? error.message
          : '엑셀 파일을 읽는 중 오류가 발생했습니다. 파일 형식을 확인해 주세요.',
      );
    } finally {
      setIsProcessing(false);
      event.target.value = '';
    }
  };

  const handleDownloadAttendance = async (group: ReservationGroup) => {
    if (group.entries.length === 0) {
      toast.warning('명단이 비어 있어 출석부를 만들 수 없습니다.');
      return;
    }
    try {
      setIsProcessing(true);
      toast.info('파일 생성 중...');
      await downloadAttendanceXlsx(group, label);
      toast.success(`출석부를 내려받았습니다. (${group.entries.length}건 / ${group.totalHeadcount}명)`);
    } catch {
      toast.error('출석부를 만드는 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSms = async (group: ReservationGroup) => {
    if (group.entries.length === 0) {
      toast.warning('명단이 비어 있어 문자발송 파일을 만들 수 없습니다.');
      return;
    }
    try {
      setIsProcessing(true);
      const { count, unsupportedCount } = await downloadSmsCsv(group, csvEncoding);
      toast.success(`문자발송 명단을 내려받았습니다. (${count}건)`);
      if (unsupportedCount > 0) {
        toast.warning(`${unsupportedCount}건은 CP949로 표현할 수 없는 글자가 있어 ?로 바뀌었습니다.`);
      }
    } catch {
      toast.error('문자발송 파일을 만드는 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = async () => {
    const targets = groups.filter((group) => group.entries.length > 0);
    if (targets.length === 0) {
      toast.warning('내려받을 명단이 없습니다.');
      return;
    }
    try {
      setIsProcessing(true);
      toast.info('파일 생성 중...');
      for (const group of targets) {
        await downloadAttendanceXlsx(group, label);
        await downloadSmsCsv(group, csvEncoding);
      }
      toast.success(`${targets.length}개 회차의 출석부와 문자발송 파일을 내려받았습니다.`);
    } catch {
      toast.error('파일을 만드는 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setRawGroups([]);
    setShowPersonalData(false);
    toast.success('불러온 예약 정보를 지웠습니다.');
  };

  return (
    <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
      <h2 className="text-xl font-extrabold mb-6 text-brand-dark tracking-tight ml-1">출석부 변환 (Attendance)</h2>

      {/* 업로드 */}
      <div className={CARD}>
        <h3 className={CARD_HEADING}>
          <Upload className="w-5 h-5 mr-2 text-emerald-600" />
          예약현황조회 업로드
        </h3>
        <p className={CARD_DESC}>
          예약 시스템에서 내려받은 <strong>예약현황조회(.xlsx)</strong> 파일을 올리면 회차별 출석부와 문자발송 명단을 만들어 드립니다.
          여러 프로그램 파일을 한 번에 올릴 수 있습니다.
        </p>

        <label
          className={cn(
            'w-full flex items-center justify-center space-x-2 py-3.5 rounded-2xl text-sm font-bold transition-all shadow-md cursor-pointer',
            isProcessing
              ? 'bg-white/50 text-brand-muted cursor-not-allowed border border-white/60'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white active:scale-[0.98]',
          )}
        >
          <Upload className="w-4 h-4" />
          <span>{isProcessing ? '처리 중...' : '예약현황조회 파일 선택'}</span>
          <input
            type="file"
            accept=".xlsx,.xls"
            multiple
            onChange={handleUpload}
            disabled={isProcessing}
            className="hidden"
          />
        </label>

        <div className="mt-4 flex items-start space-x-2 text-[11px] font-medium text-brand-muted leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-px" />
          <span>
            업로드한 파일은 <strong>브라우저 안에서만</strong> 변환됩니다. 신청자 이름과 연락처는 서버나 데이터베이스에 저장되지 않고,
            페이지를 벗어나거나 초기화하면 사라집니다.
          </span>
        </div>
      </div>

      {groups.length > 0 && (
        <>
          {/* 옵션 */}
          <div className={CARD}>
            <h3 className={CARD_HEADING}>
              <ClipboardList className="w-5 h-5 mr-2 text-brand-blue" />
              출력 설정
            </h3>

            <div className="space-y-3">
              <div className={SUB_PANEL}>
                <label className="block text-xs font-bold text-brand-dark mb-2">제목 문구</label>
                <input
                  type="text"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  placeholder="위크앤드"
                  className="w-full bg-white/70 border border-white rounded-xl px-3 py-2 text-sm font-medium text-brand-dark placeholder:text-brand-muted/60"
                />
                <p className="text-[11px] font-medium text-brand-muted mt-2 leading-relaxed">
                  출석부 제목은 <span className="font-bold">{buildAttendanceTitle(groups[0], label)}</span> 형태로 들어갑니다.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className={cn(SUB_PANEL, 'flex-1')}>
                  <p className="text-xs font-bold text-brand-dark mb-2">정렬</p>
                  <div className="flex flex-wrap gap-1">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSortOrder(option.value)}
                        className={cn(PILL, sortOrder === option.value ? PILL_ON : PILL_OFF)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={cn(SUB_PANEL, 'flex-1')}>
                  <p className="text-xs font-bold text-brand-dark mb-2">문자발송 파일 인코딩</p>
                  <div className="flex flex-wrap gap-1">
                    {ENCODING_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCsvEncoding(option.value)}
                        className={cn(PILL, csvEncoding === option.value ? PILL_ON : PILL_OFF)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => setIncludeCancelled((prev) => !prev)}
                  className={cn(SUB_PANEL, 'flex-1 text-left active:scale-[0.99] transition-all')}
                >
                  <p className="text-xs font-bold text-brand-dark">취소·미결제 건 포함</p>
                  <p className="text-[11px] font-medium text-brand-muted mt-1">
                    {includeCancelled ? '포함 — 전체 예약 건을 출석부에 넣습니다.' : '제외 — 예약완료 + 결제완료 건만 넣습니다.'}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setShowPersonalData((prev) => !prev)}
                  className={cn(SUB_PANEL, 'flex-1 text-left active:scale-[0.99] transition-all')}
                >
                  <p className="text-xs font-bold text-brand-dark flex items-center">
                    {showPersonalData ? <Eye className="w-4 h-4 mr-1.5" /> : <EyeOff className="w-4 h-4 mr-1.5" />}
                    화면에 이름·연락처 표시
                  </p>
                  <p className="text-[11px] font-medium text-brand-muted mt-1">
                    {showPersonalData ? '표시 중 — 확인이 끝나면 다시 가려 주세요.' : '가림 — 내려받는 파일에는 원본이 그대로 들어갑니다.'}
                  </p>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center space-x-2 bg-brand-dark hover:bg-brand-black text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>전체 내려받기 ({groups.length}개 회차)</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={isProcessing}
                className="flex items-center justify-center space-x-2 bg-white/80 border border-white hover:bg-white text-brand-dark py-3 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>불러온 정보 지우기</span>
              </button>
            </div>
          </div>

          {/* 회차별 결과 */}
          {groups.map((group) => (
            <div key={group.id} className={CARD}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-base font-extrabold text-brand-dark tracking-tight">{group.programName}</h3>
                  <p className="text-xs font-medium text-brand-muted mt-1">
                    {group.useDate} {group.timeRange && `· ${group.timeRange}`}
                  </p>
                </div>
                <div className="text-xs font-bold text-brand-blue bg-white/60 border border-white rounded-xl px-3 py-2 shrink-0">
                  {group.entries.length}건 · {group.totalHeadcount}명
                  {group.excludedEntries.length > 0 && (
                    <span className="text-brand-muted font-medium"> (제외 {group.excludedEntries.length}건)</span>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-xs select-text">
                  <thead>
                    <tr className="text-brand-muted font-bold border-b border-white/80">
                      <th className="text-left py-2 pr-2 font-bold">#</th>
                      <th className="text-left py-2 pr-2 font-bold">신청자</th>
                      <th className="text-left py-2 pr-2 font-bold">연락처</th>
                      <th className="text-left py-2 pr-2 font-bold">인원</th>
                      <th className="text-left py-2 pr-2 font-bold">학생</th>
                      <th className="text-left py-2 pr-2 font-bold">학년</th>
                      <th className="text-left py-2 font-bold">비고</th>
                    </tr>
                  </thead>
                  <tbody className="text-brand-dark font-medium">
                    {group.entries.map((entry, index) => (
                      <tr key={`${group.id}-${index}`} className="border-b border-white/50 last:border-0">
                        <td className="py-2 pr-2 text-brand-muted">{index + 1}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {showPersonalData ? entry.applicantName : maskName(entry.applicantName)}
                          {!entry.confirmed && <span className="ml-1 text-[10px] text-rose-500 font-bold">{entry.status}</span>}
                        </td>
                        <td className="py-2 pr-2 whitespace-nowrap">
                          {showPersonalData ? entry.phone : maskPhone(entry.phone)}
                        </td>
                        <td className="py-2 pr-2">{entry.headcount}</td>
                        <td className="py-2 pr-2">
                          {showPersonalData ? entry.studentNames : maskNameList(entry.studentNames)}
                        </td>
                        <td className="py-2 pr-2">{entry.studentGrades}</td>
                        <td className="py-2 text-brand-muted">{buildCompositionNote(entry)}</td>
                      </tr>
                    ))}
                    {group.entries.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-brand-muted font-medium">
                          확정된 예약이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <button
                  type="button"
                  onClick={() => handleDownloadAttendance(group)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600/90 hover:bg-emerald-600 border border-emerald-500/50 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>출석부 XLSX</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadSms(group)}
                  disabled={isProcessing}
                  className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600/90 hover:bg-indigo-600 border border-indigo-500/50 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>문자발송 CSV ({buildSmsList(group.entries).length}건)</span>
                </button>
              </div>

              <p className="text-[11px] font-medium text-brand-muted mt-3 leading-relaxed">
                파일명: {attendanceFileName(group, label)} · {smsFileName(group)}
              </p>
            </div>
          ))}
        </>
      )}

      {groups.length === 0 && (
        <div className="bg-white/40 backdrop-blur-2xl rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] py-16 text-center">
          <ClipboardList className="w-8 h-8 mx-auto mb-3 text-brand-muted/70" />
          <p className="text-sm font-bold text-brand-dark">아직 불러온 예약이 없습니다</p>
          <p className="text-xs font-medium text-brand-muted mt-1">예약현황조회 파일을 올리면 이곳에 회차별 명단이 표시됩니다.</p>
        </div>
      )}

      {totalEntries > 0 && <div className="pb-10" />}
    </div>
  );
}
