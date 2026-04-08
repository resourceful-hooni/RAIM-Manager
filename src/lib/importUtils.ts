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
  let currentRoom = '';
  let currentYear = new Date().getFullYear();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    
    // Detect date row: e.g., "4/1", "2024-04-01", or Excel serial number
    let dateVal = row[1];
    let isDateRow = false;
    let parsedDate = '';

    if (typeof dateVal === 'number') {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(dateVal);
      parsedDate = `${currentYear}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
      isDateRow = (row[2] === '계' || String(row[2]).includes('계'));
    } else if (typeof dateVal === 'string') {
      const trimmedDate = dateVal.trim();
      if (trimmedDate.includes('/') && (row[2] === '계' || String(row[2]).includes('계'))) {
        const parts = trimmedDate.split('/');
        parsedDate = `${currentYear}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        isDateRow = true;
      } else if (trimmedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        parsedDate = trimmedDate;
        isDateRow = true;
      }
    }

    if (isDateRow) {
      currentDate = parsedDate;
      currentRoom = ''; // Reset room on new date
      console.log('Detected Date:', currentDate);
      continue;
    }

    if (!currentDate) continue;

    const label = String(row[1] || '').trim();
    
    // Track which room block we are in
    if (label.includes('다목적실')) {
      currentRoom = label;
      // Also, 다목적실1 row itself might have a memo in column 13
      if (currentRoom === '다목적실1') {
        const roomMemo = String(row[13] || '').trim();
        if (roomMemo) {
          // We can store this memo somewhere, or just log it.
          // Currently, memos are per session. We'll attach it to '상시' or '단체' if needed, 
          // but usually it's a general memo. Let's just keep it in mind.
        }
      }
      continue;
    }

    // Only process sessions if we are in 다목적실1
    if (currentRoom !== '다목적실1') continue;
    
    // If we find a session label, parse it
    const mapping = SESSION_MAP[label];
    if (mapping) {
      console.log(`Parsing session: ${label} for date: ${currentDate}`);
      const counts: Counts = {
        adult_m: parseInt(String(row[3])) || 0,
        adult_f: parseInt(String(row[4])) || 0,
        youth_m: parseInt(String(row[5])) || 0,
        youth_f: parseInt(String(row[6])) || 0,
        child_m: parseInt(String(row[7])) || 0,
        child_f: parseInt(String(row[8])) || 0,
        infant_m: parseInt(String(row[9])) || 0,
        infant_f: parseInt(String(row[10])) || 0,
        noShow: mapping.type === 'reserved' ? (parseInt(String(row[11])) || 0) : 0,
      };

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const memo = String(row[13] || '').trim();

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

  return records;
};
