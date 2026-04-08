import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { VisitorRecord, RecordType, Counts } from '@/store/useStore';

const SESSION_MAP: Record<string, { type: RecordType; session: string }> = {
  '상시': { type: 'autonomous', session: '10시' },
  '1회차': { type: 'reserved', session: '1회차 (10:00)' },
  '2회차': { type: 'reserved', session: '2회차 (10:30)' },
  '3회차': { type: 'reserved', session: '3회차 (13:00)' },
  '4회차': { type: 'reserved', session: '4회차 (13:30)' },
  '5회차': { type: 'reserved', session: '5회차 (15:30)' },
  '6회차': { type: 'reserved', session: '6회차 (16:00)' },
  '단체': { type: 'reserved', session: '단체' },
};

export const parseVisitorFile = async (file: File): Promise<VisitorRecord[]> => {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let rows: string[][] = [];

  if (extension === 'csv') {
    const text = await file.text();
    const results = Papa.parse(text, { skipEmptyLines: true });
    rows = results.data as string[][];
  } else if (extension === 'xlsx' || extension === 'xls') {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
  }

  const records: VisitorRecord[] = [];
  let currentDate = '';
  let currentYear = new Date().getFullYear();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    
    // Detect date row: e.g., ",4/1,계,성인,,청소년,,어린이,,유아,,노쇼,운영 횟수,특이사항"
    // Sometimes row[1] is a number (Excel date) or a string "4/1"
    let dateVal = String(row[1] || '');
    if (dateVal.includes('/') && (row[2] === '계' || String(row[2]).includes('계'))) {
      const dateParts = dateVal.split('/');
      const month = dateParts[0].padStart(2, '0');
      const day = dateParts[1].padStart(2, '0');
      currentDate = `${currentYear}-${month}-${day}`;
      continue;
    }

    if (!currentDate) continue;

    // We are looking for "다목적실1" block
    if (String(row[1]).trim() === '다목적실1') {
      // The rows following "다목적실1" are: 단체, 상시, 1회차, 2회차, 3회차, 4회차, 5회차, 6회차
      // We process the next 8 rows
      for (let j = 1; j <= 8; j++) {
        const dataRow = rows[i + j];
        if (!dataRow) break;
        
        const label = String(dataRow[1]).trim();
        const mapping = SESSION_MAP[label];
        
        if (mapping) {
          const counts: Counts = {
            adult_m: parseInt(String(dataRow[3])) || 0,
            adult_f: parseInt(String(dataRow[4])) || 0,
            youth_m: parseInt(String(dataRow[5])) || 0,
            youth_f: parseInt(String(dataRow[6])) || 0,
            child_m: parseInt(String(dataRow[7])) || 0,
            child_f: parseInt(String(dataRow[8])) || 0,
            infant_m: parseInt(String(dataRow[9])) || 0,
            infant_f: parseInt(String(dataRow[10])) || 0,
            noShow: mapping.type === 'reserved' ? (parseInt(String(dataRow[11])) || 0) : 0,
          };

          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          const memo = String(dataRow[13] || '').trim();

          if (total > 0 || memo) {
            records.push({
              id: `${currentDate}-${mapping.type}-${mapping.session}`,
              date: currentDate,
              type: mapping.type,
              session: mapping.session,
              counts,
              memo,
              updatedAt: Date.now(),
            });
          }
        }
      }
      i += 8;
    }
  }

  return records;
};
