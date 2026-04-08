import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { VisitorRecord } from '@/store/useStore';
import { format } from 'date-fns';

export const exportToXLSX = (date: string, allRecords: VisitorRecord[]) => {
  try {
    const records = allRecords.filter(r => r.date === date);
    const wb = XLSX.utils.book_new();
    
    // Calculate Room 1 Totals for the top summary
    const room1Totals = {
      total: 0, adult_m: 0, adult_f: 0, youth_m: 0, youth_f: 0, child_m: 0, child_f: 0, infant_m: 0, infant_f: 0, noShow: 0
    };

    const getCountsFor = (session: string) => {
      const r = records.find(rec => rec.session === session);
      return r?.counts || {
        adult_m: 0, adult_f: 0,
        youth_m: 0, youth_f: 0,
        child_m: 0, child_f: 0,
        infant_m: 0, infant_f: 0,
        noShow: 0
      };
    };

    const getMemoFor = (session: string) => {
      const r = records.find(rec => rec.session === session);
      return r?.memo || '';
    };

    const sessions = [
      { label: '단체', session: '단체' },
      { label: '상시', session: '10시' },
      { label: '1회차', session: '1회차 (10:00)' },
      { label: '2회차', session: '2회차 (10:30)' },
      { label: '3회차', session: '3회차 (13:00)' },
      { label: '4회차', session: '4회차 (13:30)' },
      { label: '5회차', session: '5회차 (15:30)' },
      { label: '6회차', session: '6회차 (16:00)' },
    ];

    const room1Rows: any[][] = [];
    sessions.forEach(s => {
      const c = getCountsFor(s.session);
      const m = getMemoFor(s.session);
      const rowTotal = (c.adult_m || 0) + (c.adult_f || 0) + (c.youth_m || 0) + (c.youth_f || 0) + (c.child_m || 0) + (c.child_f || 0) + (c.infant_m || 0) + (c.infant_f || 0);
      
      room1Totals.total += rowTotal;
      room1Totals.adult_m += (c.adult_m || 0); room1Totals.adult_f += (c.adult_f || 0);
      room1Totals.youth_m += (c.youth_m || 0); room1Totals.youth_f += (c.youth_f || 0);
      room1Totals.child_m += (c.child_m || 0); room1Totals.child_f += (c.child_f || 0);
      room1Totals.infant_m += (c.infant_m || 0); room1Totals.infant_f += (c.infant_f || 0);
      room1Totals.noShow += (c.noShow || 0);

      room1Rows.push([
        '', s.label, rowTotal || 0,
        c.adult_m || '', c.adult_f || '',
        c.youth_m || '', c.youth_f || '',
        c.child_m || '', c.child_f || '',
        c.infant_m || '', c.infant_f || '',
        c.noShow || '', '', m
      ]);
    });

    // Prepare final data structure
    const data: any[][] = [
      ['총', '교육', '자유관람', '다목적실1', '다목적실2', '다목적실3'],
      [room1Totals.total, 0, room1Totals.total, room1Totals.total, 0, 0],
      [],
      ['', format(new Date(date), 'M/d'), '계', '성인', '', '청소년', '', '어린이', '', '유아', '', '노쇼', '운영 횟수', '특이사항'],
      ['', '', '', '남', '여', '남', '여', '남', '여', '남', '여', '', '', '']
    ];

    // Add Room 1 Block
    data.push([
      '', '다목적실1', room1Totals.total,
      room1Totals.adult_m || '', room1Totals.adult_f || '',
      room1Totals.youth_m || '', room1Totals.youth_f || '',
      room1Totals.child_m || '', room1Totals.child_f || '',
      room1Totals.infant_m || '', room1Totals.infant_f || '',
      room1Totals.noShow || '', '', ''
    ]);
    data.push(...room1Rows);

    // Placeholder for Room 2 and 3
    data.push(['', '다목적실2', 0, '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['', '단체', 0]);
    data.push(['', '상시', 0]);
    data.push(['', '다목적실3', 0, '', '', '', '', '', '', '', '', '', '', '']);
    data.push(['', '단체', 0]);
    data.push(['', '상시', 0]);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 8 }, 
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, 
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, 
      { wch: 8 }, { wch: 10 }, { wch: 30 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Visitor Report');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `${date.replace(/-/g, '')}_방문객집계표.xlsx`);
  } catch (error) {
    console.error('Excel Export Error:', error);
  }
};
