import * as XLSX from 'xlsx';

/**
 * 예약현황조회(.xlsx) → 출석부 / 문자발송 명단 변환 로직.
 *
 * [개인정보 보호 원칙]
 * 이 모듈은 순수 함수만 제공하며 네트워크 요청·로그 출력을 일절 하지 않는다.
 * 신청자 이름과 휴대폰번호는 브라우저 메모리 안에서만 다루고,
 * 서버·Firestore·콘솔 어디에도 남기지 않는다.
 */

/** 예약 1건 (신청자 1명) */
export interface ReservationEntry {
  /** 신청자명 */
  applicantName: string;
  /** 하이픈이 들어간 휴대폰번호 (010-0000-0000) */
  phone: string;
  /** 숫자만 남긴 휴대폰번호 (중복 제거용) */
  phoneDigits: string;
  /** 인원수 */
  headcount: number;
  /** 참여 학생 이름 */
  studentNames: string;
  /** 참여 학생 나이 또는 학년 */
  studentGrades: string;
  adult: number;
  youth: number;
  child: number;
  /** 신청일시 (정렬용, "2026-09-19 14:38:25") */
  appliedAt: string;
  /** 예약신청상태명 (예약완료 / 예약취소) */
  status: string;
  /** 결제상태명 (결제완료 / 결제취소 / 미결제) */
  paymentStatus: string;
  /** 예약완료 + 결제완료 여부 */
  confirmed: boolean;
}

/** 회차(프로그램 + 이용일) 단위 묶음 */
export interface ReservationGroup {
  /** 묶음 식별자 */
  id: string;
  /** 원본 회차명 ("[8세 이상] 라임북스 : 움직이는 동화책") */
  sessionLabel: string;
  /** 연령 표기를 뺀 프로그램명 ("라임북스 : 움직이는 동화책") */
  programName: string;
  /** 파일명·시트명에 쓰는 짧은 이름 ("라임북스") */
  programShortName: string;
  /** 이용일 (2026-09-20) */
  useDate: string;
  /** 제목/파일명에 쓰는 MMDD (0920) */
  mmdd: string;
  /** 이용시간 ("10:00~12:00") */
  timeRange: string;
  /** 확정 건 (예약완료 + 결제완료) */
  entries: ReservationEntry[];
  /** 취소·미결제 등 제외된 건 */
  excludedEntries: ReservationEntry[];
  /** 확정 건 인원 합계 */
  totalHeadcount: number;
}

export type SortOrder = 'applied' | 'name';

export interface GroupOptions {
  /** 취소·미결제 건도 출석부에 포함할지 (기본 false) */
  includeCancelled?: boolean;
  /** 정렬 기준 (기본 신청일 순) */
  sortOrder?: SortOrder;
}

/** 셀 값을 문자열로 정규화 (숫자 셀·공백 셀 대응) */
const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const cellNumber = (value: unknown): number => {
  const parsed = parseInt(cellText(value).replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

/** 01012345678 → 010-1234-5678 (형식이 다르면 원본을 그대로 둔다) */
export const formatPhone = (raw: unknown): string => {
  const digits = cellText(raw).replace(/\D/g, '');
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return cellText(raw);
};

/** "[8세 이상] 라임북스 : 움직이는 동화책" → "라임북스 : 움직이는 동화책" */
export const stripAgePrefix = (sessionLabel: string): string =>
  cellText(sessionLabel).replace(/^\[[^\]]*\]\s*/, '');

/** "라임북스 : 움직이는 동화책" → "라임북스" (파일명·시트명용) */
export const toShortProgramName = (programName: string): string => {
  const head = programName.split(':')[0].trim();
  const safe = (head || programName).replace(/[\\/?*[\]]/g, ' ').trim();
  // 엑셀 시트명은 31자 제한
  return safe.slice(0, 31) || '프로그램';
};

/** "20260920~20260920" 또는 "2026-09-20" → "2026-09-20" */
export const parseUseDate = (raw: unknown): string => {
  const text = cellText(raw);
  const compact = text.match(/(\d{4})(\d{2})(\d{2})/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const dashed = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dashed) return `${dashed[1]}-${dashed[2]}-${dashed[3]}`;
  return '';
};

/** 성인/청소년/어린이 구성을 비고 문구로 ("성인1, 어린이2") */
export const buildCompositionNote = (entry: Pick<ReservationEntry, 'adult' | 'youth' | 'child'>): string =>
  ([
    ['성인', entry.adult],
    ['청소년', entry.youth],
    ['어린이', entry.child],
  ] as const)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${label}${count}`)
    .join(', ');

/** 출석부 제목 ("0920 위크앤드_라임북스 : 움직이는 동화책") */
export const buildAttendanceTitle = (group: ReservationGroup, label: string): string => {
  const trimmed = label.trim();
  return trimmed ? `${group.mmdd} ${trimmed}_${group.programName}` : `${group.mmdd}_${group.programName}`;
};

/** 헤더 행에서 컬럼 인덱스를 찾는다 (컬럼 순서가 바뀌어도 동작하도록) */
const findColumn = (header: string[], ...candidates: string[]): number =>
  header.findIndex((cell) => {
    const name = cellText(cell).replace(/\s+/g, '');
    return candidates.some((candidate) => name.startsWith(candidate.replace(/\s+/g, '')));
  });

const REQUIRED_COLUMNS = ['신청자명', '핸드폰번호', '회차명'] as const;

const sortEntries = (entries: ReservationEntry[], sortOrder: SortOrder): ReservationEntry[] =>
  entries.sort((a, b) =>
    sortOrder === 'name'
      ? a.applicantName.localeCompare(b.applicantName, 'ko')
      : a.appliedAt.localeCompare(b.appliedAt),
  );

/**
 * 화면/파일 생성에 쓸 최종 묶음을 만든다.
 * 파일을 다시 읽지 않고 옵션(취소 포함 여부·정렬)만 다시 적용하기 위한 함수다.
 */
export const resolveGroup = (group: ReservationGroup, options: GroupOptions = {}): ReservationGroup => {
  const { includeCancelled = false, sortOrder = 'applied' } = options;
  const entries = sortEntries(
    includeCancelled ? [...group.entries, ...group.excludedEntries] : [...group.entries],
    sortOrder,
  );
  const excludedEntries = includeCancelled ? [] : sortEntries([...group.excludedEntries], sortOrder);
  return {
    ...group,
    entries,
    excludedEntries,
    totalHeadcount: entries.reduce((sum, entry) => sum + entry.headcount, 0),
  };
};

export class ReservationParseError extends Error {}

/**
 * 예약현황조회 워크북을 회차별로 묶어 반환한다.
 * 한 파일에 여러 프로그램·날짜가 섞여 있어도 각각 분리된다.
 */
export const parseReservationWorkbook = (data: ArrayBuffer): ReservationGroup[] => {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(data);
  } catch {
    throw new ReservationParseError('엑셀 파일을 읽을 수 없습니다. 예약현황조회에서 내려받은 원본 파일인지 확인해 주세요.');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new ReservationParseError('엑셀 파일에 시트가 없습니다.');

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false });

  // 헤더 행 탐색 (보통 2행이지만 안전하게 앞쪽 몇 행을 훑는다)
  let headerIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 10); i += 1) {
    const row = (rows[i] || []).map(cellText);
    if (REQUIRED_COLUMNS.every((name) => row.some((cell) => cell.replace(/\s+/g, '').startsWith(name)))) {
      headerIndex = i;
      break;
    }
  }
  if (headerIndex === -1) {
    throw new ReservationParseError(
      '예약현황조회 양식이 아닙니다. 신청자명·핸드폰번호·회차명 항목이 있는 파일을 올려 주세요.',
    );
  }

  const header = (rows[headerIndex] || []).map(cellText);
  const col = {
    name: findColumn(header, '신청자명'),
    phone: findColumn(header, '핸드폰번호', '휴대폰번호'),
    status: findColumn(header, '예약신청상태명'),
    payment: findColumn(header, '결제상태명'),
    session: findColumn(header, '회차명'),
    useDate: findColumn(header, '이용일'),
    timeRange: findColumn(header, '이용시간'),
    headcount: findColumn(header, '인원수'),
    child: findColumn(header, '어린이'),
    youth: findColumn(header, '청소년'),
    adult: findColumn(header, '성인'),
    studentNames: findColumn(header, '참여 학생 이름'),
    studentGrades: findColumn(header, '참여 학생의 나이'),
    appliedAt: findColumn(header, '신청일'),
  };

  const at = (row: unknown[], index: number): unknown => (index >= 0 ? row[index] : '');

  const groups = new Map<string, ReservationGroup>();

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i] || [];
    const applicantName = cellText(at(row, col.name));
    const sessionLabel = cellText(at(row, col.session));
    if (!applicantName || !sessionLabel) continue;

    const status = cellText(at(row, col.status));
    const paymentStatus = cellText(at(row, col.payment));
    const confirmed = status === '예약완료' && paymentStatus === '결제완료';

    const entry: ReservationEntry = {
      applicantName,
      phone: formatPhone(at(row, col.phone)),
      phoneDigits: cellText(at(row, col.phone)).replace(/\D/g, ''),
      headcount: cellNumber(at(row, col.headcount)),
      studentNames: cellText(at(row, col.studentNames)),
      studentGrades: cellText(at(row, col.studentGrades)),
      adult: cellNumber(at(row, col.adult)),
      youth: cellNumber(at(row, col.youth)),
      child: cellNumber(at(row, col.child)),
      appliedAt: cellText(at(row, col.appliedAt)),
      status,
      paymentStatus,
      confirmed,
    };

    const useDate = parseUseDate(at(row, col.useDate));
    const programName = stripAgePrefix(sessionLabel);
    const id = `${useDate}__${sessionLabel}`;

    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        sessionLabel,
        programName,
        programShortName: toShortProgramName(programName),
        useDate,
        mmdd: useDate ? useDate.slice(5).replace('-', '') : '',
        timeRange: cellText(at(row, col.timeRange)),
        entries: [],
        excludedEntries: [],
        totalHeadcount: 0,
      };
      groups.set(id, group);
    }

    if (confirmed) {
      group.entries.push(entry);
    } else {
      group.excludedEntries.push(entry);
    }
  }

  const result = Array.from(groups.values());
  result.forEach((group) => {
    sortEntries(group.entries, 'applied');
    sortEntries(group.excludedEntries, 'applied');
    group.totalHeadcount = group.entries.reduce((sum, entry) => sum + entry.headcount, 0);
  });

  if (result.length === 0) {
    throw new ReservationParseError('예약 내역을 찾지 못했습니다. 파일 내용을 확인해 주세요.');
  }

  // 이용일 → 시간 → 프로그램명 순으로 정렬
  return result.sort(
    (a, b) =>
      a.useDate.localeCompare(b.useDate) ||
      a.timeRange.localeCompare(b.timeRange) ||
      a.programName.localeCompare(b.programName),
  );
};

/** 문자발송 명단 (같은 번호는 한 번만) */
export const buildSmsList = (entries: ReservationEntry[]): { phone: string; name: string }[] => {
  const seen = new Set<string>();
  const list: { phone: string; name: string }[] = [];
  entries.forEach((entry) => {
    const key = entry.phoneDigits || entry.phone;
    if (!key || seen.has(key)) return;
    seen.add(key);
    list.push({ phone: entry.phone, name: entry.applicantName });
  });
  return list;
};

/** 화면 표시용 번호 가리기 (010-1234-5678 → 010-****-5678) */
export const maskPhone = (phone: string): string =>
  phone.replace(/^(\d{2,3})-?(\d{3,4})-?(\d{4})$/, (_, head, _mid, tail) => `${head}-****-${tail}`);

/** 화면 표시용 이름 가리기 (홍길동 → 홍*동, 김철 → 김*) */
export const maskName = (name: string): string => {
  // 이모지 같은 서러게이트 쌍이 반 토막 나지 않도록 코드포인트 단위로 자른다
  const chars = Array.from(name.trim());
  if (chars.length <= 1) return chars.join('');
  if (chars.length === 2) return `${chars[0]}*`;
  return `${chars[0]}${'*'.repeat(chars.length - 2)}${chars[chars.length - 1]}`;
};

/** 여러 명이 적힌 칸 가리기 ("이한수, 이한나" → "이*수, 이*나") */
export const maskNameList = (names: string): string =>
  names
    .split(/([,/·]\s*|\s+)/)
    .map((part) => (/^[,/·\s]/.test(part) || part === '' ? part : maskName(part)))
    .join('');
