import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { VisitorRecord, RecordType, Counts, ProgramType } from '@/store/useStore';

export const getImportSessionMapping = (program: ProgramType, label: string): { type: RecordType; session: string } | null => {
  // Normalize label
  const cleanLabel = label.replace(/\s+/g, '').trim();

  if (cleanLabel === '상시' || cleanLabel.includes('상시')) {
    return { type: 'autonomous', session: '10시' };
  }
  if (cleanLabel === '단체' || cleanLabel.includes('단체')) {
    return { type: 'reserved', session: '단체' };
  }

  const sessionIndexMap: Record<string, number> = {
    '1회차': 0,
    '2회차': 1,
    '3회차': 2,
    '4회차': 3,
    '5회차': 4,
  };

  // Extract 회차 name (e.g. "1회차 (11:00)" -> "1회차", "4px (14:30)" -> "4회차" as fallback, etc.)
  let matchedKey = '';
  for (const key of Object.keys(sessionIndexMap)) {
    if (cleanLabel.includes(key)) {
      matchedKey = key;
      break;
    }
  }

  // Fallbacks for special cases like "4px (14:30)"
  if (!matchedKey) {
    if (cleanLabel.includes('4px') || cleanLabel.includes('4회')) {
      matchedKey = '4회차';
    }
  }

  const idx = sessionIndexMap[matchedKey];
  if (idx === undefined) return null;

  if (program === '무인자동차') {
    const sessions = ['1회차 (10:30)', '2회차 (13:00)', '3회차 (13:30)', '4회차 (15:30)', '5회차 (16:00)'];
    return { type: 'reserved', session: sessions[idx] };
  } else if (program === '스낵헌터') {
    const sessions = ['1회차 (11:00)', '2회차 (11:30)', '3회차 (14:00)', '4회차 (14:30)', '5회차 (16:30)'];
    return { type: 'reserved', session: sessions[idx] };
  } else if (program === '메디봇') {
    const sessions = ['1회차 (11:00)', '2회차 (13:30)', '3회차 (14:30)', '4회차 (15:30)', '5회차 (16:30)'];
    return { type: 'reserved', session: sessions[idx] };
  }

  return null;
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
      continue;
    }

    let mappedProgram: ProgramType | null = null;
    if (currentRoom.includes('다목적실1')) {
      mappedProgram = '무인자동차';
    } else if (currentRoom.includes('다목적실2')) {
      mappedProgram = '스낵헌터';
    } else if (currentRoom.includes('다목적실3')) {
      mappedProgram = '메디봇';
    }

    if (!mappedProgram) continue;
    
    // If we find a session label, parse it
    const mapping = getImportSessionMapping(mappedProgram, label);
    if (mapping) {
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
        cancelled: mapping.type === 'reserved' ? (parseInt(String(row[12])) || 0) : 0,
      };

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      const memo = String(row[13] || '').trim();

      if (total > 0 || memo) {
        records.push({
          id: `${currentDate}-${mapping.type}-${mapping.session}-${mappedProgram}`,
          date: currentDate,
          type: mapping.type,
          session: mapping.session,
          program: mappedProgram,
          counts,
          memo,
          updatedAt: Date.now(),
        });
      }
    }
  }

  return records;
};
