import { saveAs } from 'file-saver';
import {
  AttendanceZipOptions,
  AttendanceZipResult,
  CsvEncoding,
  XLSX_MIME,
  buildAttendanceFile,
  buildAttendanceZip,
  buildSmsCsvFile,
  buildSmsMessageFile,
} from './attendanceExport';
import { ReservationGroup } from './reservationUtils';

/**
 * 브라우저 다운로드 래퍼.
 *
 * 파일 생성 로직(attendanceExport.ts)과 분리해 둔 이유는 두 가지다.
 * 1. file-saver는 브라우저 전용이라, 생성 로직만 Node에서 그대로 검증할 수 있게 하려고.
 * 2. 개인정보가 담긴 Blob이 만들어지는 지점을 한 파일로 좁혀 두려고.
 *
 * 여기서도 네트워크 요청·로그 출력은 하지 않는다.
 */

/** 출석부 xlsx 내려받기 */
export const downloadAttendanceXlsx = async (
  group: ReservationGroup,
  label: string,
  withTime = false,
): Promise<string> => {
  const { fileName, data } = await buildAttendanceFile(group, label, withTime);
  saveAs(new Blob([data], { type: XLSX_MIME }), fileName);
  return fileName;
};

/** 문자발송 CSV 내려받기 */
export const downloadSmsCsv = async (
  group: ReservationGroup,
  encoding: CsvEncoding = 'cp949',
  withTime = false,
): Promise<{ fileName: string; count: number; unsupportedCount: number }> => {
  const { fileName, data, count, unsupportedCount } = await buildSmsCsvFile(group, encoding, withTime);
  // Blob 생성 시 브라우저가 문자열로 재해석하지 않도록 바이트 그대로 넘긴다
  saveAs(new Blob([data], { type: 'text/csv' }), fileName);
  return { fileName, count, unsupportedCount };
};

/** 문자 내용 txt 내려받기 (문자 양식이 없는 회차면 null) */
export const downloadSmsMessageTxt = (group: ReservationGroup, withTime = false): string | null => {
  const file = buildSmsMessageFile(group, withTime);
  if (!file) return null;
  saveAs(new Blob([file.data], { type: 'text/plain;charset=utf-8' }), file.fileName);
  return file.fileName;
};

/** 여러 회차를 ZIP 하나로 내려받기 (담은 파일이 없으면 저장하지 않는다) */
export const downloadAttendanceZip = async (
  groups: ReservationGroup[],
  options: AttendanceZipOptions,
): Promise<AttendanceZipResult> => {
  const result = await buildAttendanceZip(groups, options);
  if (result.bytes) saveAs(new Blob([result.bytes], { type: 'application/zip' }), result.fileName);
  return result;
};
