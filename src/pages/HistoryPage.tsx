import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { FileText, Calendar, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const PROGRAM_FILTERS = ['all', '무인자동차', '스낵헌터', '메디봇'] as const;

/* 프로그램 색은 기존 색조를 그대로 둔다(대비 때문에 더 어둡게 바꾸지 않는다).
   테두리·그림자만 걷어내고 옅은 배경으로 구분한다. */
function programChipClass(program: string) {
  if (program === '스낵헌터') return 'text-amber-700 bg-amber-100/70';
  if (program === '메디봇') return 'text-teal-700 bg-teal-100/70';
  return 'text-brand-dark bg-white/70';
}

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
    <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 max-w-5xl mx-auto w-full">
      <div className="space-y-2.5">
        <h2 className="text-xl font-extrabold text-brand-dark tracking-tight ml-1">전체 기록 (History)</h2>

        {/* 필터는 보조 컨트롤이라 얇게 유지한다(44px 금지). 390px부터는 네 개가
            한 줄에 들어가고, 그보다 좁으면 들쭉날쭉 줄바꿈되는 대신 2열로 선다. */}
        <div className="grid grid-cols-2 gap-1 min-[390px]:flex min-[390px]:flex-wrap p-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/60">
          {PROGRAM_FILTERS.map((prog) => (
            <button
              key={prog}
              type="button"
              aria-pressed={programFilter === prog}
              className={cn(
                "inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5 text-xs sm:text-sm font-bold rounded-xl transition-colors active:scale-95",
                programFilter === prog
                  ? "bg-white/90 text-brand-blue shadow-sm"
                  : "text-brand-muted hover:text-brand-dark hover:bg-white/60"
              )}
              onClick={() => setProgramFilter(prog as any)}
            >
              {prog === 'all' ? '전체 통합 데이터' : prog}
            </button>
          ))}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-brand-muted" aria-hidden="true" />
          </div>
          <input
            type="text"
            aria-label="메모 내용 검색"
            placeholder="메모 내용으로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-11 bg-white/55 backdrop-blur-sm border border-white/70 rounded-2xl pl-10 pr-4 py-2 text-sm font-medium text-brand-dark placeholder-brand-muted transition-colors"
          />
        </div>
      </div>

      {groupedRecords.length === 0 ? (
        <div className="flex flex-col items-center text-center px-6 py-14 bg-white/40 backdrop-blur-2xl rounded-[2rem] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)]">
          <div className="w-12 h-12 rounded-2xl bg-white/70 flex items-center justify-center mb-3">
            <FileText className="w-5 h-5 text-brand-muted" aria-hidden="true" />
          </div>
          <p className="font-bold text-sm text-brand-dark">일치하는 기록이 없습니다.</p>
          <p className="mt-1.5 text-xs font-medium text-brand-muted leading-relaxed max-w-[20rem]">
            {searchTerm
              ? '검색어를 지우거나 다른 프로그램을 선택해 주세요.'
              : programFilter === 'all'
                ? '카운터 화면에서 기록을 저장하면 이곳에 표시됩니다.'
                : `${programFilter} 프로그램의 기록이 아직 없습니다. 다른 프로그램을 선택해 주세요.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4 pb-10">
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
                  aria-expanded={isExpanded}
                  className="w-full min-h-11 flex items-center justify-between gap-3 px-4 py-3 text-left bg-white/40 hover:bg-white/60 transition-colors active:bg-white/80"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Calendar className="w-4 h-4 text-brand-blue shrink-0" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-sm font-extrabold text-brand-dark tracking-tight tnum text-selectable">{date}</span>
                      <span className="block text-2xs font-bold text-brand-muted mt-0.5 tnum">기록 {records.length}건</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0 text-brand-muted">
                    <span className="text-2xs font-bold">합계</span>
                    <span className="text-sm font-black text-brand-blue tnum text-selectable">{dailyTotal}명</span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4" aria-hidden="true" />
                      : <ChevronDown className="w-4 h-4" aria-hidden="true" />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-white/50 divide-y divide-white/50">
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
                      const program = (record as any).program || '무인자동차';
                      const breakdown = [
                        { label: '성인', m: safeCounts.adult_m, f: safeCounts.adult_f },
                        { label: '청소년', m: safeCounts.youth_m, f: safeCounts.youth_f },
                        { label: '어린이', m: safeCounts.child_m, f: safeCounts.child_f },
                        { label: '유아', m: safeCounts.infant_m, f: safeCounts.infant_f },
                      ];

                      return (
                        <div key={record.id} className="px-4 py-3.5 sm:px-5 sm:py-4 hover:bg-white/30 transition-colors">
                          {/* 좁은 화면: 신원 → 합계 → 내역 순으로 쌓고,
                              넓은 화면에서는 같은 줄에 펼쳐 빈 공간을 쓴다. */}
                          <div className="md:flex md:items-center md:gap-5">
                            <div className="flex items-start justify-between gap-3 md:flex-1 md:items-center">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
                                <span className="text-sm font-black text-brand-dark tracking-tight tnum text-selectable">{record.session}</span>
                                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-md", programChipClass(program))}>
                                  {program}
                                </span>
                                <span className={cn(
                                  "text-xs font-bold px-2 py-0.5 rounded-md bg-white/70",
                                  record.type === 'autonomous' ? "text-brand-blue" : "text-brand-cyan"
                                )}>
                                  {record.type === 'autonomous' ? '자율관람' : '예약관람'}
                                </span>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-black text-brand-dark tracking-tight whitespace-nowrap tnum text-selectable">총 {total}명</div>
                                <div className="text-2xs font-bold text-brand-muted mt-0.5 whitespace-nowrap tnum text-selectable">남 {maleTotal} · 여 {femaleTotal}</div>
                              </div>
                            </div>

                            {/* 연령·성별 내역: 칸 네 개로 나누면 390px에서 글자가 눌려
                                읽기 어려웠다. 숫자를 세로로 맞춘 표 한 덩어리로 묶는다. */}
                            <div className="mt-3 md:mt-0 md:w-80 md:shrink-0 bg-white/45 rounded-2xl px-3 py-1.5">
                              <table className="w-full table-fixed">
                                <caption className="sr-only">{record.session} 회차 연령·성별 인원</caption>
                                <thead>
                                  <tr className="text-2xs font-bold text-brand-muted">
                                    <th scope="col" className="w-[34%] text-left font-bold py-1">연령</th>
                                    <th scope="col" className="w-[22%] text-right font-bold py-1">계</th>
                                    <th scope="col" className="w-[22%] text-right font-bold py-1">남</th>
                                    <th scope="col" className="w-[22%] text-right font-bold py-1">여</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-white/60">
                                  {breakdown.map(group => {
                                    const groupTotal = group.m + group.f;
                                    const empty = groupTotal === 0;
                                    return (
                                      <tr key={group.label}>
                                        <th scope="row" className="text-left text-xs font-bold text-brand-muted py-1 whitespace-nowrap">{group.label}</th>
                                        <td className={cn(
                                          "text-right text-sm font-black tracking-tight py-1 tnum text-selectable",
                                          empty ? "text-brand-muted/55" : "text-brand-dark"
                                        )}>{groupTotal}</td>
                                        <td className={cn(
                                          "text-right text-xs font-bold py-1 tnum text-selectable",
                                          empty ? "text-brand-muted/55" : "text-brand-muted"
                                        )}>{group.m}</td>
                                        <td className={cn(
                                          "text-right text-xs font-bold py-1 tnum text-selectable",
                                          empty ? "text-brand-muted/55" : "text-brand-muted"
                                        )}>{group.f}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {record.memo && (
                            <div className="flex items-start gap-2 mt-3 pt-2.5 border-t border-white/50">
                              <FileText className="w-3.5 h-3.5 text-brand-muted shrink-0 mt-0.5" aria-hidden="true" />
                              <p className="whitespace-pre-wrap text-sm font-medium text-brand-dark leading-relaxed text-selectable">{record.memo}</p>
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
