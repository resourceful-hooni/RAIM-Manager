import { useState, useMemo } from 'react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, Calendar, TrendingUp, AlertCircle, Download, CheckSquare, Square, BarChart2, FileText } from 'lucide-react';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];
const PIE_COLORS = ['#8b5cf6', '#0ea5e9'];

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [chartFilterType, setChartFilterType] = useState<'all' | 'autonomous' | 'reserved'>('all');
  const [chartDisplayMode, setChartDisplayMode] = useState<'total' | 'age' | 'gender' | 'detailed'>('age');
  const { getAllRecords } = useStore();

  const handleDownloadChart = async (chartId: string, filename: string) => {
    const chartElement = document.getElementById(chartId);
    if (chartElement) {
      try {
        // Temporarily set fixed dimensions to prevent ResponsiveContainer from collapsing
        const originalWidth = chartElement.style.width;
        const originalHeight = chartElement.style.height;
        chartElement.style.width = `${chartElement.offsetWidth}px`;
        chartElement.style.height = `${chartElement.offsetHeight}px`;

        const dataUrl = await toPng(chartElement, { 
          backgroundColor: '#ffffff', 
          pixelRatio: 2
        });
        
        // Restore original dimensions
        chartElement.style.width = originalWidth;
        chartElement.style.height = originalHeight;

        const res = await fetch(dataUrl);
        const blob = await res.blob();
        saveAs(blob, `${filename}.png`);
      } catch (error: any) {
        console.error("Error generating chart image:", error);
        alert(`차트 이미지 저장 중 오류가 발생했습니다: ${error.message || error}`);
      }
    }
  };

  const handleDownloadPDF = async () => {
    const dashboardElement = document.getElementById('dashboard-content');
    if (dashboardElement) {
      try {
        // Fix dimensions for all charts to prevent collapsing
        const pieChartContainer = document.getElementById('pie-chart-container');
        const mainChartContainer = document.getElementById('comprehensive-chart');
        
        const originalPieWidth = pieChartContainer?.style.width;
        const originalPieHeight = pieChartContainer?.style.height;
        const originalMainWidth = mainChartContainer?.style.width;
        const originalMainHeight = mainChartContainer?.style.height;

        if (pieChartContainer) {
          pieChartContainer.style.width = `${pieChartContainer.offsetWidth}px`;
          pieChartContainer.style.height = `${pieChartContainer.offsetHeight}px`;
        }
        if (mainChartContainer) {
          mainChartContainer.style.width = `${mainChartContainer.offsetWidth}px`;
          mainChartContainer.style.height = `${mainChartContainer.offsetHeight}px`;
        }

        const dataUrl = await toPng(dashboardElement, {
          pixelRatio: 2,
          backgroundColor: '#f8fafc'
        });
        
        // Restore dimensions
        if (pieChartContainer) {
          pieChartContainer.style.width = originalPieWidth || '';
          pieChartContainer.style.height = originalPieHeight || '';
        }
        if (mainChartContainer) {
          mainChartContainer.style.width = originalMainWidth || '';
          mainChartContainer.style.height = originalMainHeight || '';
        }

        const imgData = dataUrl;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        const img = new Image();
        img.src = imgData;
        await new Promise((resolve) => { img.onload = resolve; });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (img.height * pdfWidth) / img.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${date.replace(/-/g, '')}_방문객통계보고서.pdf`);
      } catch (error: any) {
        console.error('Failed to generate PDF', error);
        alert(`PDF 생성 중 오류가 발생했습니다: ${error.message || error}`);
      }
    }
  };

  const allRecords = getAllRecords();

  const filteredRecords = useMemo(() => {
    if (viewMode === 'daily') {
      return allRecords.filter(r => r.date === date);
    } else if (viewMode === 'weekly') {
      const start = subDays(new Date(date), 6);
      return allRecords.filter(r => {
        const d = new Date(r.date);
        return d >= start && d <= new Date(date);
      });
    } else if (viewMode === 'monthly') {
      const month = date.substring(0, 7); // YYYY-MM
      return allRecords.filter(r => r.date.startsWith(month));
    } else {
      const year = date.substring(0, 4); // YYYY
      return allRecords.filter(r => r.date.startsWith(year));
    }
  }, [date, allRecords, viewMode]);

  const prevFilteredRecords = useMemo(() => {
    if (viewMode === 'daily') {
      const prevDate = format(subDays(new Date(date), 1), 'yyyy-MM-dd');
      return allRecords.filter(r => r.date === prevDate);
    } else if (viewMode === 'weekly') {
      const end = subDays(new Date(date), 7);
      const start = subDays(new Date(date), 13);
      return allRecords.filter(r => {
        const d = new Date(r.date);
        return d >= start && d <= end;
      });
    } else if (viewMode === 'monthly') {
      const prevMonth = format(subMonths(new Date(date), 1), 'yyyy-MM');
      return allRecords.filter(r => r.date.startsWith(prevMonth));
    } else {
      const prevYear = format(subYears(new Date(date), 1), 'yyyy');
      return allRecords.filter(r => r.date.startsWith(prevYear));
    }
  }, [date, allRecords, viewMode]);

  const calculateStats = (records: any[]) => {
    let total = 0;
    let autonomous = 0;
    let reserved = 0;
    const breakdown = {
      '성인(남)': 0, '성인(여)': 0,
      '청소년(남)': 0, '청소년(여)': 0,
      '어린이(남)': 0, '어린이(여)': 0,
      '유아(남)': 0, '유아(여)': 0,
    };

    records.forEach(r => {
      const safeCounts = {
        adult_m: r.counts.adult_m || 0, adult_f: r.counts.adult_f || 0,
        youth_m: r.counts.youth_m || 0, youth_f: r.counts.youth_f || 0,
        child_m: r.counts.child_m || 0, child_f: r.counts.child_f || 0,
        infant_m: r.counts.infant_m || 0, infant_f: r.counts.infant_f || 0,
      };
      const sum = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
      total += sum;
      if (r.type === 'autonomous') autonomous += sum;
      else reserved += sum;

      breakdown['성인(남)'] += safeCounts.adult_m;
      breakdown['성인(여)'] += safeCounts.adult_f;
      breakdown['청소년(남)'] += safeCounts.youth_m;
      breakdown['청소년(여)'] += safeCounts.youth_f;
      breakdown['어린이(남)'] += safeCounts.child_m;
      breakdown['어린이(여)'] += safeCounts.child_f;
      breakdown['유아(남)'] += safeCounts.infant_m;
      breakdown['유아(여)'] += safeCounts.infant_f;
    });

    return { total, autonomous, reserved, breakdown };
  };

  const stats = useMemo(() => calculateStats(filteredRecords), [filteredRecords]);
  const prevStats = useMemo(() => calculateStats(prevFilteredRecords), [prevFilteredRecords]);

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}%`;
  };

  const chartData = useMemo(() => {
    const chartFilteredRecords = filteredRecords.filter(r => {
      if (chartFilterType === 'all') return true;
      return r.type === chartFilterType;
    });

    if (viewMode === 'daily') {
      const hourlyMap: Record<string, any> = {};
      // Initialize common hours
      for (let i = 10; i <= 17; i++) {
        hourlyMap[`${i}시`] = { 
          name: `${i}시`, 
          '총합계': 0,
          '성인': 0, '청소년': 0, '어린이': 0, '유아': 0,
          '남성': 0, '여성': 0,
          '성인(남)': 0, '성인(여)': 0,
          '청소년(남)': 0, '청소년(여)': 0,
          '어린이(남)': 0, '어린이(여)': 0,
          '유아(남)': 0, '유아(여)': 0,
        };
      }
      
      chartFilteredRecords.forEach(r => {
        let hourStr = '';
        if (r.session.includes('시')) {
          hourStr = r.session;
        } else if (r.session.includes('(')) {
          const match = r.session.match(/\((\d{2}):/);
          if (match) hourStr = `${parseInt(match[1])}시`;
        } else if (r.session === '단체') {
          hourStr = '단체';
        }
        
        if (!hourStr) return;
        
        if (!hourlyMap[hourStr]) {
          hourlyMap[hourStr] = { 
            name: hourStr, 
            '총합계': 0,
            '성인': 0, '청소년': 0, '어린이': 0, '유아': 0,
            '남성': 0, '여성': 0,
            '성인(남)': 0, '성인(여)': 0,
            '청소년(남)': 0, '청소년(여)': 0,
            '어린이(남)': 0, '어린이(여)': 0,
            '유아(남)': 0, '유아(여)': 0,
          };
        }
        
        const safeCounts = {
          adult_m: r.counts.adult_m || 0, adult_f: r.counts.adult_f || 0,
          youth_m: r.counts.youth_m || 0, youth_f: r.counts.youth_f || 0,
          child_m: r.counts.child_m || 0, child_f: r.counts.child_f || 0,
          infant_m: r.counts.infant_m || 0, infant_f: r.counts.infant_f || 0,
        };
        const total = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
        
        hourlyMap[hourStr]['총합계'] += total;
        hourlyMap[hourStr]['성인'] += safeCounts.adult_m + safeCounts.adult_f;
        hourlyMap[hourStr]['청소년'] += safeCounts.youth_m + safeCounts.youth_f;
        hourlyMap[hourStr]['어린이'] += safeCounts.child_m + safeCounts.child_f;
        hourlyMap[hourStr]['유아'] += safeCounts.infant_m + safeCounts.infant_f;

        hourlyMap[hourStr]['남성'] += safeCounts.adult_m + safeCounts.youth_m + safeCounts.child_m + safeCounts.infant_m;
        hourlyMap[hourStr]['여성'] += safeCounts.adult_f + safeCounts.youth_f + safeCounts.child_f + safeCounts.infant_f;
        
        hourlyMap[hourStr]['성인(남)'] += safeCounts.adult_m;
        hourlyMap[hourStr]['성인(여)'] += safeCounts.adult_f;
        hourlyMap[hourStr]['청소년(남)'] += safeCounts.youth_m;
        hourlyMap[hourStr]['청소년(여)'] += safeCounts.youth_f;
        hourlyMap[hourStr]['어린이(남)'] += safeCounts.child_m;
        hourlyMap[hourStr]['어린이(여)'] += safeCounts.child_f;
        hourlyMap[hourStr]['유아(남)'] += safeCounts.infant_m;
        hourlyMap[hourStr]['유아(여)'] += safeCounts.infant_f;
      });
      return Object.values(hourlyMap).map(item => {
        const cleanedItem: any = { name: item.name };
        Object.keys(item).forEach(key => {
          if (key !== 'name' && item[key] > 0) {
            cleanedItem[key] = item[key];
          }
        });
        return cleanedItem;
      }).sort((a, b) => {
        if (a.name === '단체') return 1;
        if (b.name === '단체') return -1;
        return parseInt(a.name) - parseInt(b.name);
      });
    }

    // Weekly/Monthly: Use Line Chart data
    const dailyMap: Record<string, any> = {};
    chartFilteredRecords.forEach(r => {
      const day = r.date;
      if (!dailyMap[day]) {
        dailyMap[day] = { 
          name: format(new Date(day), 'MM/dd'), 
          '총합계': 0,
          '성인': 0, '청소년': 0, '어린이': 0, '유아': 0,
          '남성': 0, '여성': 0,
          '성인(남)': 0, '성인(여)': 0,
          '청소년(남)': 0, '청소년(여)': 0,
          '어린이(남)': 0, '어린이(여)': 0,
          '유아(남)': 0, '유아(여)': 0,
        };
      }
      const safeCounts = {
        adult_m: r.counts.adult_m || 0, adult_f: r.counts.adult_f || 0,
        youth_m: r.counts.youth_m || 0, youth_f: r.counts.youth_f || 0,
        child_m: r.counts.child_m || 0, child_f: r.counts.child_f || 0,
        infant_m: r.counts.infant_m || 0, infant_f: r.counts.infant_f || 0,
      };
      const total = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
      
      dailyMap[day]['총합계'] += total;
      dailyMap[day]['성인'] += safeCounts.adult_m + safeCounts.adult_f;
      dailyMap[day]['청소년'] += safeCounts.youth_m + safeCounts.youth_f;
      dailyMap[day]['어린이'] += safeCounts.child_m + safeCounts.child_f;
      dailyMap[day]['유아'] += safeCounts.infant_m + safeCounts.infant_f;

      dailyMap[day]['남성'] += safeCounts.adult_m + safeCounts.youth_m + safeCounts.child_m + safeCounts.infant_m;
      dailyMap[day]['여성'] += safeCounts.adult_f + safeCounts.youth_f + safeCounts.child_f + safeCounts.infant_f;
      
      dailyMap[day]['성인(남)'] += safeCounts.adult_m;
      dailyMap[day]['성인(여)'] += safeCounts.adult_f;
      dailyMap[day]['청소년(남)'] += safeCounts.youth_m;
      dailyMap[day]['청소년(여)'] += safeCounts.youth_f;
      dailyMap[day]['어린이(남)'] += safeCounts.child_m;
      dailyMap[day]['어린이(여)'] += safeCounts.child_f;
      dailyMap[day]['유아(남)'] += safeCounts.infant_m;
      dailyMap[day]['유아(여)'] += safeCounts.infant_f;
    });
    return Object.values(dailyMap).map(item => {
      const cleanedItem: any = { name: item.name };
      Object.keys(item).forEach(key => {
        if (key !== 'name' && item[key] > 0) {
          cleanedItem[key] = item[key];
        }
      });
      return cleanedItem;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRecords, viewMode, chartFilterType]);
  const pieData = [
    { name: '남성', value: stats.breakdown['성인(남)'] + stats.breakdown['청소년(남)'] + stats.breakdown['어린이(남)'] + stats.breakdown['유아(남)'] },
    { name: '여성', value: stats.breakdown['성인(여)'] + stats.breakdown['청소년(여)'] + stats.breakdown['어린이(여)'] + stats.breakdown['유아(여)'] },
  ];

  // Predictive Logic
  const prediction = useMemo(() => {
    if (allRecords.length === 0) return null;

    // Group by session to find historical averages
    const sessionStats: Record<string, { total: number, count: number }> = {};
    
    allRecords.forEach(r => {
      const safeCounts = {
        adult_m: r.counts.adult_m || 0, adult_f: r.counts.adult_f || 0,
        youth_m: r.counts.youth_m || 0, youth_f: r.counts.youth_f || 0,
        child_m: r.counts.child_m || 0, child_f: r.counts.child_f || 0,
        infant_m: r.counts.infant_m || 0, infant_f: r.counts.infant_f || 0,
      };
      const sum = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
      if (!sessionStats[r.session]) {
        sessionStats[r.session] = { total: 0, count: 0 };
      }
      sessionStats[r.session].total += sum;
      sessionStats[r.session].count += 1;
    });

    let peakSession = '';
    let maxAvg = 0;

    Object.entries(sessionStats).forEach(([session, data]) => {
      const avg = data.count > 0 ? data.total / data.count : 0;
      if (avg > maxAvg) {
        maxAvg = avg;
        peakSession = session;
      }
    });

    if (!peakSession || maxAvg === 0) return null;

    return {
      session: peakSession,
      avg: Math.round(maxAvg)
    };
  }, [allRecords]);

  return (
    <div id="dashboard-content" className="p-4 space-y-6 max-w-2xl mx-auto">
      {/* Predictive Dashboard Card */}
      {prediction && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-blue-600" />
          </div>
          <div className="flex items-start space-x-3 relative z-10">
            <div className="bg-blue-100 p-2 rounded-xl text-blue-600 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-blue-900 mb-1">데이터 기반 예측 피크타임</h3>
              <p className="text-sm text-blue-800/80 leading-relaxed">
                지난 데이터 분석 결과, 보통 <strong className="text-blue-600">{prediction.session}</strong>에 가장 많은 관람객(평균 {prediction.avg}명)이 방문합니다. 스태프 배치 및 휴게 시간 조정에 참고해 주세요.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-4">
        <div className="flex bg-slate-50 rounded-xl p-1.5 border border-slate-100">
          {(['daily', 'monthly', 'yearly'] as const).map((mode) => (
            <button
              key={mode}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-lg transition-all active:scale-95",
                viewMode === mode ? "bg-white text-blue-600 shadow-sm border border-slate-200/60" : "text-slate-500 hover:text-slate-700"
              )}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'daily' ? '일별' : mode === 'monthly' ? '월별' : '연간'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
          <Calendar className="w-5 h-5 text-blue-500 ml-3" />
          <input
            type={viewMode === 'daily' ? 'date' : viewMode === 'monthly' ? 'month' : 'number'}
            value={viewMode === 'yearly' ? date.substring(0, 4) : viewMode === 'monthly' ? date.substring(0, 7) : date}
            onChange={(e) => {
              if (viewMode === 'yearly') setDate(`${e.target.value}-01-01`);
              else if (viewMode === 'monthly') setDate(`${e.target.value}-01`);
              else setDate(e.target.value);
            }}
            min={viewMode === 'yearly' ? "2024" : undefined}
            max={viewMode === 'yearly' ? "2030" : undefined}
            className="bg-transparent border-none px-2 py-2 text-slate-900 focus:outline-none flex-1 text-sm font-bold"
          />
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1 px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm"
            title="PDF 보고서 다운로드"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-500 opacity-90 transition-all group-hover:h-2" />
          <div className="flex items-center space-x-2 text-slate-500 mb-3 mt-1">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-bold">총 방문객</span>
          </div>
          <div className="flex items-end space-x-3">
            <span className="text-5xl font-black text-slate-900 tracking-tighter">{stats.total} <span className="text-xl text-slate-400 font-bold tracking-normal">명</span></span>
            <span className={cn(
              "text-xs font-bold px-2 py-1 rounded-lg mb-2",
              stats.total >= prevStats.total ? "bg-green-100 text-green-700" : "bg-rose-100 text-rose-700"
            )}>
              {viewMode === 'daily' ? '어제' : viewMode === 'weekly' ? '지난주' : viewMode === 'monthly' ? '지난달' : '작년'} 대비 {getPercentageChange(stats.total, prevStats.total)}
            </span>
          </div>
        </div>
        
        <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl p-5 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-indigo-500 opacity-90 transition-all group-hover:h-2" />
          <div id="pie-chart-container" className="h-28 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={45}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col space-y-2 text-[10px] font-bold mt-2">
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6] shadow-sm" />
              <span className="text-slate-600">남 {pieData[0].value}명</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0ea5e9] shadow-sm" />
              <span className="text-slate-600">여 {pieData[1].value}명</span>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-200" />
        <h3 className="text-sm font-extrabold text-slate-800 tracking-tight mb-4 flex items-center">
          <BarChart2 className="w-4 h-4 mr-2 text-blue-500" />
          상세 방문객 분포 (연령/성별)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(stats.breakdown).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-xs font-bold text-slate-600">{key}</span>
              <span className="text-sm font-black text-slate-900">{value}명</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-300 opacity-80" />
        <div className="flex justify-between items-center mb-5 pl-2">
          <h3 className="text-sm font-extrabold text-slate-800 tracking-tight">
            {viewMode === 'daily' ? '시간대별' : viewMode === 'monthly' ? '일별' : '월별'} 종합 방문객 추이
          </h3>
          <button 
            onClick={() => handleDownloadChart('comprehensive-chart', `${date.replace(/-/g, '')}_방문객추이`)}
            className="text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 p-2 rounded-xl transition-all border border-slate-100 shadow-sm active:scale-95"
            title="그래프 다운로드 (PNG)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3 mb-6 pl-2">
          {/* Main Visualizer Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-400 w-14 shrink-0">관람 유형</span>
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1 overflow-x-auto hide-scrollbar">
                {[
                  { value: 'all', label: '전체 관람' },
                  { value: 'autonomous', label: '자율 관람' },
                  { value: 'reserved', label: '예약 관람' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setChartFilterType(opt.value as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95",
                      chartFilterType === opt.value 
                        ? "bg-white text-blue-600 shadow-sm border border-slate-200/50" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="hidden sm:block w-px h-8 bg-slate-200"></div>
            
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-slate-400 w-14 shrink-0 sm:w-auto">표시 기준</span>
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 gap-1 overflow-x-auto hide-scrollbar">
                {[
                  { value: 'total', label: '총합계' },
                  { value: 'age', label: '연령별' },
                  { value: 'gender', label: '성별' },
                  { value: 'detailed', label: '상세(연령+성별)' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setChartDisplayMode(opt.value as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95",
                      chartDisplayMode === opt.value 
                        ? "bg-slate-800 text-white shadow-sm" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="comprehensive-chart" className="h-[320px] w-full bg-white p-2 rounded-xl">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'daily' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <Tooltip 
                    shared={false}
                    cursor={{ fill: '#f8fafc', opacity: 0.8 }}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                  {chartDisplayMode === 'total' && (
                    <Bar dataKey="총합계" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  )}
                  {chartDisplayMode === 'age' && (
                    <>
                      <Bar dataKey="성인" stackId="age" fill="#3b82f6" />
                      <Bar dataKey="청소년" stackId="age" fill="#10b981" />
                      <Bar dataKey="어린이" stackId="age" fill="#f59e0b" />
                      <Bar dataKey="유아" stackId="age" fill="#f43f5e" />
                    </>
                  )}
                  {chartDisplayMode === 'gender' && (
                    <>
                      <Bar dataKey="남성" stackId="gender" fill="#8b5cf6" />
                      <Bar dataKey="여성" stackId="gender" fill="#0ea5e9" />
                    </>
                  )}
                  {chartDisplayMode === 'detailed' && (
                    <>
                      <Bar dataKey="성인(남)" stackId="age_gender" fill="#1e3a8a" />
                      <Bar dataKey="성인(여)" stackId="age_gender" fill="#60a5fa" />
                      <Bar dataKey="청소년(남)" stackId="age_gender" fill="#064e3b" />
                      <Bar dataKey="청소년(여)" stackId="age_gender" fill="#34d399" />
                      <Bar dataKey="어린이(남)" stackId="age_gender" fill="#78350f" />
                      <Bar dataKey="어린이(여)" stackId="age_gender" fill="#fbbf24" />
                      <Bar dataKey="유아(남)" stackId="age_gender" fill="#881337" />
                      <Bar dataKey="유아(여)" stackId="age_gender" fill="#fb7185" />
                    </>
                  )}
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <Tooltip 
                    shared={false}
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#f1f5f9', borderRadius: '12px', color: '#0f172a', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                  {chartDisplayMode === 'total' && (
                    <Line type="monotone" dataKey="총합계" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  )}
                  {chartDisplayMode === 'age' && (
                    <>
                      <Line type="monotone" dataKey="성인" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="청소년" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="어린이" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="유아" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                    </>
                  )}
                  {chartDisplayMode === 'gender' && (
                    <>
                      <Line type="monotone" dataKey="남성" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="여성" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </>
                  )}
                  {chartDisplayMode === 'detailed' && (
                    <>
                      <Line type="monotone" dataKey="성인(남)" stroke="#1e3a8a" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="성인(여)" stroke="#60a5fa" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="청소년(남)" stroke="#064e3b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="청소년(여)" stroke="#34d399" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="어린이(남)" stroke="#78350f" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="어린이(여)" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="유아(남)" stroke="#881337" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="유아(여)" stroke="#fb7185" strokeWidth={2} dot={{ r: 3 }} />
                    </>
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm bg-slate-50 rounded-xl border border-slate-100 border-dashed">
              <BarChart2 className="w-8 h-8 mb-2 text-slate-300" />
              <span className="font-bold">데이터가 없습니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
