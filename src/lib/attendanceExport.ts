import ExcelJS from 'exceljs';
import { ATTENDANCE_TEMPLATE_BASE64 } from './attendanceTemplateBase64';
import {
  ReservationGroup,
  buildAttendanceTitle,
  buildCompositionNote,
  buildSmsList,
} from './reservationUtils';
import { base64ToArrayBuffer } from './utils';

/**
 * 출석부(xlsx) · 문자발송 명단(csv) 생성.
 *
 * [개인정보 보호 원칙]
 * 파일 생성은 전부 브라우저 안에서 끝난다. 서버로 보내는 요청도, 콘솔 출력도 없다.
 * 오류 메시지에도 신청자 이름·번호를 절대 포함하지 않는다.
 *
 * [양식 유지 원칙 - AGENTS.md 1번 규칙]
 * 워크북을 새로 만들지 않고, 인라인된 출석부 템플릿(public/sheets/출석부양식.xlsx)을
 * ExcelJS로 읽어 데이터만 채운다. 데이터 행은 템플릿 3행의 서식을 복제해서 늘린다.
 */

/** 템플릿 열 위치 (B~L) */
const COLUMN = {
  no: 2,
  applicantName: 3,
  phone: 4,
  headcount: 5,
  studentNames: 6,
  studentGrades: 7,
  // 8~11: 성인(남)/성인(여)/어린이(남)/어린이(여) — 예약 데이터에 성별이 없어 비워 둔다
  note: 12,
} as const;

const TITLE_CELL = 'B1';
const FIRST_DATA_ROW = 3;

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type CsvEncoding = 'cp949' | 'utf8';

export interface SmsCsvResult {
  bytes: Uint8Array;
  /** CP949로 표현할 수 없어 '?'로 바뀐 항목 수 (이름 자체는 담지 않는다) */
  unsupportedCount: number;
}

/** 윈도우 파일명에 못 쓰는 문자 제거 */
const sanitizeFileName = (name: string): string => name.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();

/** 같은 날 같은 프로그램이 두 회차 이상이면 이름이 겹치므로 시작 시각을 덧붙인다 */
const sessionSuffix = (group: ReservationGroup): string => {
  const start = group.timeRange.match(/(\d{1,2}):(\d{2})/);
  return start ? ` ${start[1].padStart(2, '0')}${start[2]}` : '';
};

export const attendanceFileName = (group: ReservationGroup, label: string, withTime = false): string => {
  const trimmed = label.trim();
  const head = trimmed ? `${group.mmdd} ${trimmed} 출석부` : `${group.mmdd} 출석부`;
  const tail = `${group.programShortName}${withTime ? sessionSuffix(group) : ''}`;
  return `${sanitizeFileName(`${head}_${tail}`)}.xlsx`;
};

export const smsFileName = (group: ReservationGroup, withTime = false): string =>
  `${sanitizeFileName(`${group.mmdd} 문자발송_${group.programShortName}${withTime ? sessionSuffix(group) : ''}`)}.csv`;

/**
 * 템플릿을 읽어 출석부 워크북을 만든다.
 * (브라우저·Node 양쪽에서 쓸 수 있도록 다운로드와 분리해 둔다)
 */
export const buildAttendanceWorkbook = async (
  group: ReservationGroup,
  label: string,
  templateData: ArrayBuffer = base64ToArrayBuffer(ATTENDANCE_TEMPLATE_BASE64),
  withTime = false,
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(templateData);
  } catch {
    throw new Error('출석부 양식을 여는 데 실패했습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');
  }

  // 양식 파일에 남아 있을 수 있는 작성자 정보가 배포되는 출석부마다 따라가지 않도록 고정한다
  workbook.creator = '서울로봇인공지능과학관';
  workbook.lastModifiedBy = '서울로봇인공지능과학관';
  workbook.lastPrinted = undefined;

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error('출석부 양식에 시트가 없습니다.');
  sheet.name = `${group.programShortName}${withTime ? sessionSuffix(group) : ''}`.slice(0, 31);

  const entries = group.entries;
  const rowCount = Math.max(entries.length, 1);

  // 템플릿의 빈 데이터 행(3행) 서식을 그대로 복제해 필요한 만큼 늘린다
  if (rowCount > 1) sheet.duplicateRow(FIRST_DATA_ROW, rowCount - 1, true);

  sheet.getCell(TITLE_CELL).value = buildAttendanceTitle(group, label, withTime);

  entries.forEach((entry, index) => {
    const row = sheet.getRow(FIRST_DATA_ROW + index);
    row.getCell(COLUMN.no).value = index + 1;
    row.getCell(COLUMN.applicantName).value = entry.applicantName;
    row.getCell(COLUMN.phone).value = entry.phone;
    row.getCell(COLUMN.headcount).value = entry.headcount;
    row.getCell(COLUMN.studentNames).value = entry.studentNames;
    row.getCell(COLUMN.studentGrades).value = entry.studentGrades;
    row.getCell(COLUMN.note).value = buildCompositionNote(entry);
  });

  const totalRow = FIRST_DATA_ROW + rowCount;
  // 합계 행도 데이터 행과 같은 높이로 맞춘다
  sheet.getRow(totalRow).height = sheet.getRow(FIRST_DATA_ROW).height;
  sheet.getCell(`E${totalRow}`).value = {
    formula: `SUM(E${FIRST_DATA_ROW}:E${totalRow - 1})`,
    result: group.totalHeadcount,
  };
  // ExcelJS는 시작/끝 앞에만 '$'를 붙이므로, 행에도 '$'를 직접 넣어 절대참조로 만든다
  // ('$A$1:$L$8' 형태여야 엑셀이 인쇄영역으로 인식한다)
  sheet.pageSetup.printArea = `A$1:L$${totalRow}`;

  return workbook;
};

/** 한 글자 → CP949 코드 (예: '홍' → 0xC8AB) */
type Cp949EncodeTable = Record<string, number | undefined>;

/** 코드페이지 테이블(약 470KB)은 CSV를 만드는 순간에만 지연 로딩한다 */
let codepagePromise: Promise<Cp949EncodeTable | null> | null = null;
const loadCp949Table = async (): Promise<Cp949EncodeTable | null> => {
  if (!codepagePromise) {
    codepagePromise = import('xlsx/dist/cpexcel.full.mjs')
      .then((mod: any) => {
        const source = mod?.cptable ? mod : mod?.default;
        return (source?.cptable?.[949]?.enc as Cp949EncodeTable) ?? null;
      })
      .catch(() => null);
  }
  return codepagePromise;
};

/**
 * 한 줄을 CP949 바이트로 바꾼다.
 *
 * 코드포인트 단위로 직접 변환하는 이유: 라이브러리의 일괄 변환 함수는 CP949에 없는 글자
 * (이모지 등)를 NUL(0x00) 바이트로 흘려보내 문자발송 파일을 망가뜨린다.
 * 여기서는 변환할 수 없는 글자를 '?'로 바꾸고 그 사실을 함께 알린다.
 */
const encodeCp949Line = (text: string, enc: Cp949EncodeTable): { bytes: number[]; unsupported: number } => {
  const bytes: number[] = [];
  let unsupported = 0;
  for (const char of text) {
    const code = enc[char];
    if (typeof code !== 'number') {
      bytes.push(0x3f); // '?'
      unsupported += 1;
      continue;
    }
    if (code > 0xff) bytes.push((code >> 8) & 0xff, code & 0xff);
    else bytes.push(code & 0xff);
  }
  return { bytes, unsupported };
};

/**
 * 문자발송 CSV 바이트 생성.
 * 기본은 문자발송 프로그램이 쓰는 CP949(EUC-KR), CRLF 줄바꿈, 헤더 없음.
 */
export const buildSmsCsvBytes = async (
  list: { phone: string; name: string }[],
  encoding: CsvEncoding = 'cp949',
): Promise<SmsCsvResult> => {
  const lines = list.map(({ phone, name }) => `${phone},${name}`);

  if (encoding === 'utf8') {
    const text = lines.length ? `${lines.join('\r\n')}\r\n` : '';
    // 엑셀이 UTF-8 CSV를 깨뜨리지 않도록 BOM을 붙인다
    return { bytes: new TextEncoder().encode(`﻿${text}`), unsupportedCount: 0 };
  }

  const enc = await loadCp949Table();
  if (!enc) {
    throw new Error('CP949 변환 모듈을 불러오지 못했습니다. UTF-8로 내려받은 뒤 문자발송 프로그램에서 인코딩을 확인해 주세요.');
  }

  const bytes: number[] = [];
  let unsupportedCount = 0;
  lines.forEach((line) => {
    const encoded = encodeCp949Line(`${line}\r\n`, enc);
    if (encoded.unsupported > 0) unsupportedCount += 1;
    for (const byte of encoded.bytes) bytes.push(byte);
  });

  return { bytes: Uint8Array.from(bytes), unsupportedCount };
};
