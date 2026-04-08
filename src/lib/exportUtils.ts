import * as XLSX from 'xlsx-js-style';
import { VisitorRecord, Counts } from '@/store/useStore';

export const exportToXLSX = (date: string, allRecords: VisitorRecord[]) => {
  const records = allRecords.filter(r => r.date === date);
  
  const wb = XLSX.utils.book_new();
  
  // Prepare data rows
  const data: any[][] = [
    ['서울 로봇AI 과학관 - 무인자동차 연구소 관람객 카운트'],
    [`날짜:`, `'${date}`],
    [],
    ['유형', '회차', '성인', '', '청소년', '', '어린이', '', '유아', '', '성별소계', '', '연령대별 합계', '', '', '', '유형별 총계', '메모'],
    ['', '', '남', '여', '남', '여', '남', '여', '남', '여', '남', '여', '성인', '청소년', '어린이', '유아', '', '']
  ];

  const getCountsFor = (type: 'autonomous' | 'reserved', session: string) => {
    const r = records.find(rec => rec.type === type && rec.session === session);
    return r?.counts || {
      adult_m: 0, adult_f: 0,
      youth_m: 0, youth_f: 0,
      child_m: 0, child_f: 0,
      infant_m: 0, infant_f: 0
    };
  };

  const getMemoFor = (type: 'autonomous' | 'reserved', session: string) => {
    const r = records.find(rec => rec.type === type && rec.session === session);
    return r?.memo || '';
  };

  let totalAdultM = 0, totalAdultF = 0;
  let totalYouthM = 0, totalYouthF = 0;
  let totalChildM = 0, totalChildF = 0;
  let totalInfantM = 0, totalInfantF = 0;
  let totalAuto = 0, totalReserved = 0;

  const autonomousSessions = Array.from({ length: 8 }, (_, i) => `${10 + i}시`);
  const reservedSessions = ['1회차 (10:00)', '2회차 (10:30)', '3회차 (13:00)', '4회차 (13:30)', '5회차 (15:30)', '6회차 (16:00)'];

  const processType = (type: 'autonomous' | 'reserved', label: string, sessions: string[]) => {
    let typeTotal = 0;
    sessions.forEach((s, idx) => {
      const c = getCountsFor(type, s);
      const m = getMemoFor(type, s);
      
      const rowMale = c.adult_m + c.youth_m + c.child_m + c.infant_m;
      const rowFemale = c.adult_f + c.youth_f + c.child_f + c.infant_f;
      const rowAdult = c.adult_m + c.adult_f;
      const rowYouth = c.youth_m + c.youth_f;
      const rowChild = c.child_m + c.child_f;
      const rowInfant = c.infant_m + c.infant_f;
      const rowTotal = rowMale + rowFemale;

      totalAdultM += c.adult_m; totalAdultF += c.adult_f;
      totalYouthM += c.youth_m; totalYouthF += c.youth_f;
      totalChildM += c.child_m; totalChildF += c.child_f;
      totalInfantM += c.infant_m; totalInfantF += c.infant_f;
      typeTotal += rowTotal;

      data.push([
        idx === 0 ? label : '',
        s.split(' ')[0],
        c.adult_m, c.adult_f,
        c.youth_m, c.youth_f,
        c.child_m, c.child_f,
        c.infant_m, c.infant_f,
        rowMale, rowFemale,
        rowAdult, rowYouth, rowChild, rowInfant,
        idx === 0 ? 'PENDING_TOTAL' : '',
        m
      ]);
    });
    
    // Update the first row of the type with the total
    const firstRowIdx = data.length - sessions.length;
    data[firstRowIdx][16] = typeTotal;
    return typeTotal;
  };

  totalAuto = processType('autonomous', '자유관람', autonomousSessions);
  totalReserved = processType('reserved', '예약관람', reservedSessions);

  const grandTotalM = totalAdultM + totalYouthM + totalChildM + totalInfantM;
  const grandTotalF = totalAdultF + totalYouthF + totalChildF + totalInfantF;
  const grandTotal = grandTotalM + grandTotalF;

  // Grand Total Row
  data.push([
    '총계', '',
    totalAdultM, totalAdultF,
    totalYouthM, totalYouthF,
    totalChildM, totalChildF,
    totalInfantM, totalInfantF,
    grandTotalM, grandTotalF,
    totalAdultM + totalAdultF,
    totalYouthM + totalYouthF,
    totalChildM + totalChildF,
    totalInfantM + totalInfantF,
    grandTotal,
    ''
  ]);

  data.push([]);
  data.push(['요약 정보', '', '', '', '', '유형별 요약']);
  data.push(['구분', '남', '여', '합계', '', '유형', '인원', '비율']);
  
  const addSummaryRow = (label: string, m: number, f: number) => {
    data.push([label, m, f, m + f]);
  };

  addSummaryRow('성인', totalAdultM, totalAdultF);
  addSummaryRow('청소년', totalYouthM, totalYouthF);
  addSummaryRow('어린이', totalChildM, totalChildF);
  addSummaryRow('유아', totalInfantM, totalInfantF);
  addSummaryRow('전체', grandTotalM, grandTotalF);

  // Add Type Summary to the same rows
  const typeSummaryStart = data.length - 5;
  data[typeSummaryStart][5] = '자유관람';
  data[typeSummaryStart][6] = totalAuto;
  data[typeSummaryStart][7] = grandTotal > 0 ? `${((totalAuto / grandTotal) * 100).toFixed(1)}%` : '0.0%';

  data[typeSummaryStart + 1][5] = '예약관람';
  data[typeSummaryStart + 1][6] = totalReserved;
  data[typeSummaryStart + 1][7] = grandTotal > 0 ? `${((totalReserved / grandTotal) * 100).toFixed(1)}%` : '0.0%';

  data[typeSummaryStart + 2][5] = '합계';
  data[typeSummaryStart + 2][6] = grandTotal;
  data[typeSummaryStart + 2][7] = grandTotal > 0 ? '100.0%' : '0.0%';

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Styling
  const borderAll = {
    top: { style: 'thin', color: { rgb: "000000" } },
    bottom: { style: 'thin', color: { rgb: "000000" } },
    left: { style: 'thin', color: { rgb: "000000" } },
    right: { style: 'thin', color: { rgb: "000000" } }
  };

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" } },
    fill: { fgColor: { rgb: "4472C4" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: borderAll
  };

  const dataStyle = {
    alignment: { horizontal: "center", vertical: "center" },
    border: borderAll
  };
  
  const totalStyle = {
    font: { bold: true },
    fill: { fgColor: { rgb: "FFC000" } },
    alignment: { horizontal: "center", vertical: "center" },
    border: borderAll
  };

  const titleStyle = {
    font: { bold: true, sz: 16 },
    alignment: { horizontal: "center", vertical: "center" }
  };

  // Apply styles
  for (let R = 0; R < data.length; ++R) {
    for (let C = 0; C < 18; ++C) {
      const cellAddress = { c: C, r: R };
      const cellRef = XLSX.utils.encode_cell(cellAddress);
      if (!ws[cellRef]) continue;

      if (R === 0) {
        ws[cellRef].s = titleStyle;
      } else if (R === 3 || R === 4) {
        // Headers
        ws[cellRef].s = headerStyle;
      } else if (R >= 5 && R <= 5 + autonomousSessions.length + reservedSessions.length - 1) {
        // Data rows
        ws[cellRef].s = dataStyle;
        if (C === 0) {
          if (R < 5 + autonomousSessions.length) {
            ws[cellRef].s = { ...dataStyle, fill: { fgColor: { rgb: "DDEBF7" } } }; // Light blue
          } else {
            ws[cellRef].s = { ...dataStyle, fill: { fgColor: { rgb: "E2EFDA" } } }; // Light green
          }
        }
      } else if (R === 5 + autonomousSessions.length + reservedSessions.length) {
        // Grand total
        ws[cellRef].s = totalStyle;
      } else if (R >= data.length - 6) {
        // Summary tables
        if (R === data.length - 6) {
           ws[cellRef].s = { font: { bold: true } };
        } else if (R === data.length - 5) {
           if (C <= 3 || (C >= 5 && C <= 7)) {
             ws[cellRef].s = headerStyle;
           }
        } else {
           if (C <= 3 || (C >= 5 && C <= 7)) {
             ws[cellRef].s = dataStyle;
           }
           if (R === data.length - 1) {
             if (C <= 3 || (C >= 5 && C <= 7)) {
               ws[cellRef].s = totalStyle;
             }
           }
        }
      }
    }
  }

  // Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } }, // Title
    // Header merges
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } }, // 유형
    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } }, // 회차
    { s: { r: 3, c: 2 }, e: { r: 3, c: 3 } }, // 성인
    { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } }, // 청소년
    { s: { r: 3, c: 6 }, e: { r: 3, c: 7 } }, // 어린이
    { s: { r: 3, c: 8 }, e: { r: 3, c: 9 } }, // 유아
    { s: { r: 3, c: 10 }, e: { r: 3, c: 11 } }, // 성별소계
    { s: { r: 3, c: 12 }, e: { r: 3, c: 15 } }, // 연령대별 합계
    { s: { r: 3, c: 16 }, e: { r: 4, c: 16 } }, // 유형별 총계
    { s: { r: 3, c: 17 }, e: { r: 4, c: 17 } }, // 메모
    // Data merges for "자유관람" and "예약관람" labels
    { s: { r: 5, c: 0 }, e: { r: 5 + autonomousSessions.length - 1, c: 0 } },
    { s: { r: 5 + autonomousSessions.length, c: 0 }, e: { r: 5 + autonomousSessions.length + reservedSessions.length - 1, c: 0 } },
    // Data merges for type totals
    { s: { r: 5, c: 16 }, e: { r: 5 + autonomousSessions.length - 1, c: 16 } },
    { s: { r: 5 + autonomousSessions.length, c: 16 }, e: { r: 5 + autonomousSessions.length + reservedSessions.length - 1, c: 16 } },
  ];

  // Column widths
  ws['!cols'] = [
    { wch: 12 }, // 유형
    { wch: 10 }, // 회차
    { wch: 6 }, { wch: 6 }, // 성인
    { wch: 6 }, { wch: 6 }, // 청소년
    { wch: 6 }, { wch: 6 }, // 어린이
    { wch: 6 }, { wch: 6 }, // 유아
    { wch: 6 }, { wch: 6 }, // 성별소계
    { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, // 연령대별 합계
    { wch: 12 }, // 유형별 총계
    { wch: 30 }, // 메모
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Visitor Data');
  XLSX.writeFile(wb, `${date.replace(/-/g, '')}_자율주행연구소_방문객수.xlsx`);
};
