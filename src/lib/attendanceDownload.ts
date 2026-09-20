import { saveAs } from 'file-saver';
import {
  CsvEncoding,
  XLSX_MIME,
  attendanceFileName,
  buildAttendanceWorkbook,
  buildSmsCsvBytes,
  smsFileName,
} from './attendanceExport';
import { ReservationGroup, buildSmsList } from './reservationUtils';

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
  const workbook = await buildAttendanceWorkbook(group, label, undefined, withTime);
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = attendanceFileName(group, label, withTime);
  saveAs(new Blob([buffer], { type: XLSX_MIME }), fileName);
  return fileName;
};

/** 문자발송 CSV 내려받기 */
export const downloadSmsCsv = async (
  group: ReservationGroup,
  encoding: CsvEncoding = 'cp949',
  withTime = false,
): Promise<{ fileName: string; count: number; unsupportedCount: number }> => {
  const list = buildSmsList(group.entries);
  const { bytes, unsupportedCount } = await buildSmsCsvBytes(list, encoding);
  const fileName = smsFileName(group, withTime);
  // Blob 생성 시 브라우저가 문자열로 재해석하지 않도록 바이트 그대로 넘긴다
  saveAs(new Blob([bytes], { type: 'text/csv' }), fileName);
  return { fileName, count: list.length, unsupportedCount };
};
