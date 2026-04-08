import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { VisitorRecord } from '@/store/useStore';

export const exportToXLSX = (date: string, allRecords: VisitorRecord[]) => {
  try {
    const records = allRecords.filter(r => r.date === date);
    
    const wb = XLSX.utils.book_new();
    
    // Prepare data rows
    const data: any[][] = [
      ['서울 로봇AI 과학관 - 무인자동차 연구소 관람객 카운트'],
      [`날짜: ${date}`],
      [],
      ['유형', '회차', '성인(남)', '성인(여)', '청소년(남)', '청소년(여)', '어린이(남)', '어린이(여)', '유아(남)', '유아(여)', '노쇼', '남성 소계', '여성 소계', '성인 합계', '청소년 합계', '어린이 합계', '유아 합계', '유형별 총계', '메모']
    ];

    const getCountsFor = (type: 'autonomous' | 'reserved', session: string) => {
      const r = records.find(rec => rec.type === type && rec.session === session);
      return r?.counts || {
        adult_m: 0, adult_f: 0,
        youth_m: 0, youth_f: 0,
        child_m: 0, child_f: 0,
        infant_m: 0, infant_f: 0,
        noShow: 0
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
    let totalNoShow = 0;
    let totalAuto = 0, totalReserved = 0;

    const autonomousSessions = Array.from({ length: 8 }, (_, i) => `${10 + i}시`);
    const reservedSessions = ['1회차 (10:00)', '2회차 (10:30)', '3회차 (13:00)', '4회차 (13:30)', '5회차 (15:30)', '6회차 (16:00)'];

    const processType = (type: 'autonomous' | 'reserved', label: string, sessions: string[]) => {
      let typeTotal = 0;
      sessions.forEach((s, idx) => {
        const c = getCountsFor(type, s);
        const m = getMemoFor(type, s);
        
        const rowMale = (c.adult_m || 0) + (c.youth_m || 0) + (c.child_m || 0) + (c.infant_m || 0);
        const rowFemale = (c.adult_f || 0) + (c.youth_f || 0) + (c.child_f || 0) + (c.infant_f || 0);
        const rowAdult = (c.adult_m || 0) + (c.adult_f || 0);
        const rowYouth = (c.youth_m || 0) + (c.youth_f || 0);
        const rowChild = (c.child_m || 0) + (c.child_f || 0);
        const rowInfant = (c.infant_m || 0) + (c.infant_f || 0);
        const rowTotal = rowMale + rowFemale;

        totalAdultM += (c.adult_m || 0); totalAdultF += (c.adult_f || 0);
        totalYouthM += (c.youth_m || 0); totalYouthF += (c.youth_f || 0);
        totalChildM += (c.child_m || 0); totalChildF += (c.child_f || 0);
        totalInfantM += (c.infant_m || 0); totalInfantF += (c.infant_f || 0);
        totalNoShow += (c.noShow || 0);
        typeTotal += rowTotal;

        data.push([
          label,
          s,
          c.adult_m || 0, c.adult_f || 0,
          c.youth_m || 0, c.youth_f || 0,
          c.child_m || 0, c.child_f || 0,
          c.infant_m || 0, c.infant_f || 0,
          c.noShow || 0,
          rowMale, rowFemale,
          rowAdult, rowYouth, rowChild, rowInfant,
          idx === 0 ? typeTotal : '',
          m
        ]);
      });
      
      return typeTotal;
    };

    totalAuto = processType('autonomous', '자유관람', autonomousSessions);
    totalReserved = processType('reserved', '예약관람', reservedSessions);

    const grandTotalM = totalAdultM + totalYouthM + totalChildM + totalInfantM;
    const grandTotalF = totalAdultF + totalYouthF + totalChildF + totalInfantF;
    const grandTotal = grandTotalM + grandTotalF;

    data.push([
      '총계', '',
      totalAdultM, totalAdultF,
      totalYouthM, totalYouthF,
      totalChildM, totalChildF,
      totalInfantM, totalInfantF,
      totalNoShow,
      grandTotalM, grandTotalF,
      totalAdultM + totalAdultF,
      totalYouthM + totalYouthF,
      totalChildM + totalChildF,
      totalInfantM + totalInfantF,
      grandTotal,
      ''
    ]);

    data.push([]);
    data.push(['요약 정보']);
    data.push(['구분', '남', '여', '합계']);
    data.push(['성인', totalAdultM, totalAdultF, totalAdultM + totalAdultF]);
    data.push(['청소년', totalYouthM, totalYouthF, totalYouthM + totalYouthF]);
    data.push(['어린이', totalChildM, totalChildF, totalChildM + totalChildF]);
    data.push(['유아', totalInfantM, totalInfantF, totalInfantM + totalInfantF]);
    data.push(['전체', grandTotalM, grandTotalF, grandTotal]);
    
    data.push([]);
    data.push(['유형별 요약']);
    data.push(['유형', '인원', '비율']);
    data.push(['자유관람', totalAuto, grandTotal > 0 ? `${((totalAuto / grandTotal) * 100).toFixed(1)}%` : '0.0%']);
    data.push(['예약관람', totalReserved, grandTotal > 0 ? `${((totalReserved / grandTotal) * 100).toFixed(1)}%` : '0.0%']);
    data.push(['합계', grandTotal, '100.0%']);

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Column widths
    ws['!cols'] = [
      { wch: 12 }, { wch: 15 }, 
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, 
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, 
      { wch: 8 }, // No-show
      { wch: 10 }, { wch: 10 }, 
      { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, 
      { wch: 12 }, { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Visitor Data');
    
    // Generate buffer
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    const fileName = `${date.replace(/-/g, '')}_자율주행연구소_방문객수.xlsx`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Excel Export Error:', error);
  }
};

