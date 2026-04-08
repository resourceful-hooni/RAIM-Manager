import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { VisitorRecord } from '@/store/useStore';
import { format } from 'date-fns';

export const exportToXLSX = (currentDateStr: string, allRecords: VisitorRecord[]) => {
  try {
    const wb = XLSX.utils.book_new();
    
    // Get all unique dates in the store, sorted, filtered by the current month
    const currentMonthPrefix = currentDateStr.substring(0, 7); // e.g., "2024-04"
    const uniqueDates = Array.from(new Set(allRecords.map(r => r.date)))
      .filter(date => date.startsWith(currentMonthPrefix))
      .sort();
    
    // If no records, just use the current date
    if (uniqueDates.length === 0) {
      uniqueDates.push(currentDateStr);
    }

    // Calculate grand total for the month
    let grandTotalRoom1 = 0;
    uniqueDates.forEach(date => {
      const records = allRecords.filter(r => r.date === date);
      records.forEach(r => {
        if (r.counts) {
          grandTotalRoom1 += (r.counts.adult_m || 0) + (r.counts.adult_f || 0) + 
                             (r.counts.youth_m || 0) + (r.counts.youth_f || 0) + 
                             (r.counts.child_m || 0) + (r.counts.child_f || 0) + 
                             (r.counts.infant_m || 0) + (r.counts.infant_f || 0);
        }
      });
    });

    // Prepare final data structure with the top header
    const data: any[][] = [
      ['총', '교육', '자유관람', '다목적실1', '다목적실2', '다목적실3'],
      [grandTotalRoom1, 0, grandTotalRoom1, grandTotalRoom1, 0, 0], // Grand totals
      [],
      []
    ];

    uniqueDates.forEach(date => {
      const records = allRecords.filter(r => r.date === date);
      
      const room1Totals = {
        total: 0, adult_m: 0, adult_f: 0, youth_m: 0, youth_f: 0, child_m: 0, child_f: 0, infant_m: 0, infant_f: 0, noShow: 0
      };

      const getCountsFor = (session: string) => {
        const r = records.find(rec => rec.session === session);
        return r?.counts || {
          adult_m: 0, adult_f: 0, youth_m: 0, youth_f: 0,
          child_m: 0, child_f: 0, infant_m: 0, infant_f: 0, noShow: 0
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

      sessions.forEach(s => {
        const c = getCountsFor(s.session);
        const rowTotal = (c.adult_m || 0) + (c.adult_f || 0) + (c.youth_m || 0) + (c.youth_f || 0) + (c.child_m || 0) + (c.child_f || 0) + (c.infant_m || 0) + (c.infant_f || 0);
        
        room1Totals.total += rowTotal;
        room1Totals.adult_m += (c.adult_m || 0); room1Totals.adult_f += (c.adult_f || 0);
        room1Totals.youth_m += (c.youth_m || 0); room1Totals.youth_f += (c.youth_f || 0);
        room1Totals.child_m += (c.child_m || 0); room1Totals.child_f += (c.child_f || 0);
        room1Totals.infant_m += (c.infant_m || 0); room1Totals.infant_f += (c.infant_f || 0);
        room1Totals.noShow += (c.noShow || 0);
      });

      const dayOfWeek = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][new Date(date).getDay()];
      const formattedDate = format(new Date(date), 'M/d');

      // Add Date Block Header
      data.push(
        ['', formattedDate, '계', '성인', '', '청소년', '', '어린이', '', '유아', '', '노쇼', '운영 횟수', '특이사항', '* 계산용 표시', '일자', '단체명'],
        ['', '', '', '남', '여', '남', '여', '남', '여', '남', '여', '', '', '', '', '', ''],
        [dayOfWeek, '합계', room1Totals.total, 
          room1Totals.adult_m || '-', room1Totals.adult_f || '-',
          room1Totals.youth_m || '-', room1Totals.youth_f || '-',
          room1Totals.child_m || '-', room1Totals.child_f || '-',
          room1Totals.infant_m || '-', room1Totals.infant_f || '-',
          room1Totals.noShow || 0, 0, '', '', '', ''
        ],
        ['', '다목적실1', room1Totals.total,
          room1Totals.adult_m || '-', room1Totals.adult_f || '-',
          room1Totals.youth_m || '-', room1Totals.youth_f || '-',
          room1Totals.child_m || '-', room1Totals.child_f || '-',
          room1Totals.infant_m || '-', room1Totals.infant_f || '-',
          room1Totals.noShow || 0, '', '', '', '', ''
        ]
      );

      sessions.forEach(s => {
        const c = getCountsFor(s.session);
        const m = getMemoFor(s.session);
        const rowTotal = (c.adult_m || 0) + (c.adult_f || 0) + (c.youth_m || 0) + (c.youth_f || 0) + (c.child_m || 0) + (c.child_f || 0) + (c.infant_m || 0) + (c.infant_f || 0);
        
        data.push([
          '', s.label, rowTotal || 0,
          c.adult_m || '', c.adult_f || '',
          c.youth_m || '', c.youth_f || '',
          c.child_m || '', c.child_f || '',
          c.infant_m || '', c.infant_f || '',
          c.noShow || '', '', m, '', '', `다목적실1-${s.label === '상시' ? '상시' : s.label === '단체' ? '단체' : s.label.replace('회차', '')}`
        ]);
      });

      // Placeholder for Room 2 and 3
      data.push(['', '다목적실2', 0, '', '', '', '', '', '', '', '', 0, '', '', '', '', '']);
      data.push(['', '단체', 0, '', '', '', '', '', '', '', '', '', '', '', '', '', '다목적실2-단체']);
      data.push(['', '상시', 0, '', '', '', '', '', '', '', '', '', '', '', '', '', '다목적실2-상시']);
      data.push(['', '다목적실3', 0, '', '', '', '', '', '', '', '', 0, '', '', '', '', '']);
      data.push(['', '단체', 0, '', '', '', '', '', '', '', '', '', '', '', '', '', '다목적실3-단체']);
      data.push(['', '상시', 0, '', '', '', '', '', '', '', '', '', '', '', '', '', '다목적실3-상시']);
      
      // Add empty row between dates
      data.push([]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 10 }, { wch: 12 }, { wch: 8 }, 
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, 
      { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, 
      { wch: 8 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 12 }, { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Visitor Report');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    // If exporting multiple dates, name it by month or range
    const fileNameDate = uniqueDates.length > 1 ? `${uniqueDates[0].substring(0, 7)}_월간` : currentDateStr.replace(/-/g, '');
    saveAs(blob, `${fileNameDate}_방문객집계표.xlsx`);
  } catch (error) {
    console.error('Excel Export Error:', error);
  }
};
