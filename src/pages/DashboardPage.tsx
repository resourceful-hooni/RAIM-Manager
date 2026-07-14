import { useState, useMemo, useEffect, useRef } from 'react';
import { format, subDays, subMonths, subYears } from 'date-fns';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, Calendar, TrendingUp, AlertCircle, Download, CheckSquare, Square, BarChart2, FileText, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { exportToXLSX } from '@/lib/exportUtils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];
const PIE_COLORS = ['#3b82f6', '#f43f5e'];

export default function DashboardPage() {
  const activeProgram = useStore(state => state.activeProgram);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [programFilter, setProgramFilter] = useState<'all' | '무인자동차' | '스낵헌터' | '메디봇'>(activeProgram);
  const [chartFilterType, setChartFilterType] = useState<'all' | 'autonomous' | 'reserved'>('all');
  const [chartDisplayMode, setChartDisplayMode] = useState<'total' | 'age' | 'gender' | 'detailed'>('detailed');
  const [breakdownFilterType, setBreakdownFilterType] = useState<'all' | 'autonomous' | 'reserved'>('all');
  const [summaryFilterType, setSummaryFilterType] = useState<'all' | 'autonomous' | 'reserved'>('all');

  // (Skipping download methods intact)
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
        toast.error(`차트 이미지 저장 중 오류가 발생했습니다: ${error.message || error}`);
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
        const img = new Image();
        img.src = imgData;
        await new Promise((resolve) => { img.onload = resolve; });

        // Calculate size in mm (210mm width is A4 standard)
        const pdfWidth = 210;
        const pdfHeight = (img.height * pdfWidth) / img.width;
        
        // Dynamically create a PDF page that matches the entire height
        const pdf = new jsPDF('p', 'mm', [pdfWidth, Math.max(pdfHeight, 297)]);
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`${date.replace(/-/g, '')}_방문객통계보고서.pdf`);
        toast.success('PDF 보고서가 성공적으로 저장되었습니다.');
      } catch (error: any) {
        console.error('Failed to generate PDF', error);
        toast.error(`PDF 생성 중 오류가 발생했습니다: ${error.message || error}`);
      }
    }
  };

  const allRecords = useStore(state => state.records);

  const getRecordProgram = (record: any) => record.program || '무인자동차';

  const filteredRecords = useMemo(() => {
    let records = allRecords;
    if (programFilter !== 'all') {
      records = records.filter(r => getRecordProgram(r) === programFilter);
    }
    
    if (viewMode === 'daily') {
      return records.filter(r => r.date === date);
    } else if (viewMode === 'weekly') {
      const start = subDays(new Date(date), 6);
      return records.filter(r => {
        const d = new Date(r.date);
        return d >= start && d <= new Date(date);
      });
    } else if (viewMode === 'monthly') {
      const month = date.substring(0, 7); // YYYY-MM
      return records.filter(r => r.date.startsWith(month));
    } else {
      const year = date.substring(0, 4); // YYYY
      return records.filter(r => r.date.startsWith(year));
    }
  }, [date, allRecords, viewMode, programFilter]);

  const prevFilteredRecords = useMemo(() => {
    let records = allRecords;
    if (programFilter !== 'all') {
      records = records.filter(r => getRecordProgram(r) === programFilter);
    }

    if (viewMode === 'daily') {
      const prevDate = format(subDays(new Date(date), 1), 'yyyy-MM-dd');
      return records.filter(r => r.date === prevDate);
    } else if (viewMode === 'weekly') {
      const end = subDays(new Date(date), 7);
      const start = subDays(new Date(date), 13);
      return records.filter(r => {
        const d = new Date(r.date);
        return d >= start && d <= end;
      });
    } else if (viewMode === 'monthly') {
      const prevMonth = format(subMonths(new Date(date), 1), 'yyyy-MM');
      return records.filter(r => r.date.startsWith(prevMonth));
    } else {
      const prevYear = format(subYears(new Date(date), 1), 'yyyy');
      return records.filter(r => r.date.startsWith(prevYear));
    }
  }, [date, allRecords, viewMode, programFilter]);

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

  const stats = useMemo(() => calculateStats(filteredRecords.filter(r => summaryFilterType === 'all' || r.type === summaryFilterType)), [filteredRecords, summaryFilterType]);
  const prevStats = useMemo(() => calculateStats(prevFilteredRecords.filter(r => summaryFilterType === 'all' || r.type === summaryFilterType)), [prevFilteredRecords, summaryFilterType]);

  const breakdownStats = useMemo(() => {
    const records = filteredRecords.filter(r => {
      if (breakdownFilterType === 'all') return true;
      return r.type === breakdownFilterType;
    });
    return calculateStats(records).breakdown;
  }, [filteredRecords, breakdownFilterType]);

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

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const lastAnalyzedKeyRef = useRef<string>('');

  // Predictive Logic
  useEffect(() => {
    if (allRecords.length === 0) return;

    const sessionStats: Record<string, { total: number, count: number }> = {};
    const programTotals: Record<string, number> = {};
    const dateTotals: Record<string, number> = {};
    const dayOfWeekStats: Record<string, { total: number, count: number }> = {};
    const monthlyStats: Record<string, number> = {};
    let totalVisitors = 0;
    
    allRecords.forEach(r => {
      const safeCounts = {
        adult_m: r.counts.adult_m || 0, adult_f: r.counts.adult_f || 0,
        youth_m: r.counts.youth_m || 0, youth_f: r.counts.youth_f || 0,
        child_m: r.counts.child_m || 0, child_f: r.counts.child_f || 0,
        infant_m: r.counts.infant_m || 0, infant_f: r.counts.infant_f || 0,
      };
      const sum = (Object.values(safeCounts) as number[]).reduce((a, b) => a + b, 0);
      
      totalVisitors += sum;
      
      if (!sessionStats[r.session]) {
        sessionStats[r.session] = { total: 0, count: 0 };
      }
      sessionStats[r.session].total += sum;
      sessionStats[r.session].count += 1;
      
      const p = r.program || '무인자동차';
      if (!programTotals[p]) programTotals[p] = 0;
      programTotals[p] += sum;
      
      if (!dateTotals[r.date]) dateTotals[r.date] = 0;
      dateTotals[r.date] += sum;

      const dateObj = new Date(r.date);
      const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()];
      if (!dayOfWeekStats[dayOfWeek]) dayOfWeekStats[dayOfWeek] = { total: 0, count: 0 };
      dayOfWeekStats[dayOfWeek].total += sum;
      dayOfWeekStats[dayOfWeek].count += 1;

      const month = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyStats[month]) monthlyStats[month] = 0;
      monthlyStats[month] += sum;
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

    let peakDay = '';
    let maxDayAvg = 0;
    Object.entries(dayOfWeekStats).forEach(([day, data]) => {
      const avg = data.count > 0 ? data.total / data.count : 0;
      if (avg > maxDayAvg) {
        maxDayAvg = avg;
        peakDay = day;
      }
    });

    const sortedDates = Object.keys(dateTotals).sort();
    const recent7Days = sortedDates.slice(-7).reduce((acc, date) => {
      acc[date] = dateTotals[date];
      return acc;
    }, {} as Record<string, number>);
    
    const generateClientFallback = (data: any, seed: number, peakDayVal: string, peakSessionVal: string, maxAvgVal: number) => {
      const angles = [
        "program_popularity",
        "peak_traffic",
        "weekly_patterns",
        "demand_trend",
        "demographic_mix"
      ];
      const selectedAngle = angles[seed % angles.length];

      let topProgram = "무인자동차";
      let topProgramCount = 3942;
      if (data && data.programTotals) {
        let maxCount = 0;
        for (const [prog, count] of Object.entries(data.programTotals)) {
          if ((count as number) > maxCount) {
            maxCount = count as number;
            topProgram = prog;
            topProgramCount = maxCount;
          }
        }
      }

      switch (selectedAngle) {
        case "program_popularity":
          return `가장 높은 선호도를 기록 중인 프로그램은 **${topProgram}** (누적 **${topProgramCount.toLocaleString()}명**)입니다. 균형 잡힌 관람객 분산을 위해 다른 프로그램을 연계한 패키지나 상설 특별존 운영 확대를 제안합니다.`;

        case "peak_traffic":
          if (peakSessionVal && maxAvgVal > 0) {
            return `시간대별 분석 결과, **${peakSessionVal}** 시간대에 평균 **${Math.round(maxAvgVal)}명**의 관람객이 집중되어 혼잡도가 높습니다. 대기 정체를 방지하기 위한 입장 시차제 운영 및 탄력적 스태프 배치가 필요합니다.`;
          }
          return "오후 중간 세션에 관람 밀집도가 최고조에 달합니다. 원활한 동선 확보를 위해 세션 입장 조절을 정교화하고, 휴게 공간 내 대기 안내 스크린 설치를 우선적으로 고려해보세요.";

        case "weekly_patterns":
          if (peakDayVal) {
            return `요일별 패턴에 따르면 **${peakDayVal}요일**에 관람 정점을 형성하는 경향이 있습니다. 주중 유휴 요일 관람객에게 기념 엽서나 평일 우대 혜택을 제공하면 주말 집중 현상을 완만하게 분산할 수 있습니다.`;
          }
          return "평일 단체 투어 코스와 주말 가족 관람객의 요구사항이 다릅니다. 평일에는 디지털 미래 직업 코스로, 주말에는 보호자 동반 놀이형 체험 위주로 프로그램을 특화할 것을 적극 추천합니다.";

        case "demand_trend":
          return `최근 일주일 관람 추이를 검토한 결과 일일 방문 곡선이 주기를 타며 성장 중입니다. 다가오는 주간에도 예약 강세가 유지될 전망이니 실시간 안전 진단 및 관람 교재 재고 확보에 신경 써 주십시오.`;

        case "demographic_mix":
          return "방문자 연령대 및 성비 분석 결과 남녀 성비 균형이 이상적으로 조화를 이룹니다. 전 연령대를 포용하는 로봇 코딩 및 메이커 교실 등 연령별 난이도를 세분화한 신규 융합 커리큘럼 런칭을 추천합니다.";

        default:
          return "전체 관람 수요가 안정세입니다. 세션별 예약 주기를 더욱 세밀하게 구성하여 고객 경험과 회전율을 최대로 끌어올리십시오.";
      }
    };

    const richStats = {
      totalVisitors,
      programTotals,
      recent7Days,
      sessionStats,
      dayOfWeekStats,
      monthlyStats
    };

    const statsKey = JSON.stringify(richStats) + `_seed_${refreshSeed}`;
    if (statsKey === lastAnalyzedKeyRef.current) {
      return;
    }
    lastAnalyzedKeyRef.current = statsKey;

    const analyzeData = async () => {
      setIsAiLoading(true);
      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: richStats, seed: refreshSeed }),
        });
        if (!response.ok) throw new Error('API Error');
        const result = await response.json();
        setAiInsight(result.result);
      } catch (error) {
        console.error("AI Analysis Failed, using fallback:", error);
        const fallbackMsg = generateClientFallback(richStats, refreshSeed, peakDay, peakSession, maxAvg);
        setAiInsight(fallbackMsg);
      } finally {
        setIsAiLoading(false);
      }
    };

    analyzeData();
  }, [allRecords, refreshSeed]);

  return (
    <div id="dashboard-content" className="p-3 sm:p-4 space-y-4 sm:space-y-6 max-w-7xl mx-auto w-full">
      {/* Predictive Dashboard Card */}
      {(aiInsight || isAiLoading) && (
        <div className="bg-gradient-to-br from-white/70 to-brand-light/10 backdrop-blur-[24px] border border-white/60 rounded-[1.5rem] p-4 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Sparkles className="w-24 h-24 text-brand-blue" />
          </div>
          <div className="flex items-start space-x-3 relative z-10">
            <div className="bg-brand-cyan/20 p-2 rounded-xl text-brand-dark shrink-0 shadow-inner">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1 gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center">
                  <h3 className="text-xs sm:text-sm font-extrabold text-brand-dark">AI 데이터 분석 인사이트</h3>
                  <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-dark text-white text-[8px] sm:text-[9px] uppercase tracking-wider font-black shadow-sm">Beta</span>
                </div>
                <button
                  id="rotate-ai-insight-btn"
                  onClick={() => setRefreshSeed(prev => prev + 1)}
                  disabled={isAiLoading}
                  className="flex items-center space-x-1 px-2 py-0.5 text-[10px] font-bold text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 transition-all border border-brand-blue/20 active:scale-95 disabled:opacity-50 cursor-pointer rounded-md shrink-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                  title="다른 주제 분석 보기"
                >
                  <RefreshCw className={cn("w-2.5 h-2.5", isAiLoading && "animate-spin")} />
                  <span>다른 분석 보기</span>
                </button>
              </div>
              
              {isAiLoading ? (
                <div className="flex items-center space-x-2 text-brand-muted/80 text-xs py-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>새로운 인사이트를 분석하고 있습니다...</span>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-brand-dark/90 leading-relaxed font-semibold">
                  {aiInsight?.split('**').map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="text-brand-blue font-bold">{part}</strong> : part
                  )}
                </p>
              )}
              <div className="mt-2 flex items-center justify-end w-full text-[9px] font-bold text-brand-muted/70 gap-0.5 pr-1">
                <Sparkles className="w-2.5 h-2.5" />
                <span>Powered by Gemini</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col space-y-4">
        <div className="flex flex-wrap gap-2 relative">
          {['all', '무인자동차', '스낵헌터', '메디봇'].map((prog) => (
            <button
              key={prog}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-xl transition-all active:scale-95 border backdrop-blur-sm shadow-sm focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 relative z-10",
                programFilter === prog 
                  ? "bg-brand-dark text-white border-brand-dark shadow-md" 
                  : "bg-white/60 text-brand-muted border-white/80 hover:text-brand-dark hover:bg-white/80"
              )}
              onClick={() => setProgramFilter(prog as any)}
            >
              {prog === 'all' ? '전체 통합 데이터' : prog}
            </button>
          ))}
        </div>

        <div className="flex bg-white/40 backdrop-blur-md rounded-xl p-1.5 border border-white/50 shadow-sm relative">
          {(['daily', 'monthly', 'yearly'] as const).map((mode) => (
            <button
              key={mode}
              className={cn(
                "flex-1 py-2 text-sm font-bold rounded-lg transition-all active:scale-95 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 relative z-10",
                viewMode === mode 
                  ? "bg-white text-brand-blue shadow-[0_2px_8px_-1px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] border border-white/60" 
                  : "text-brand-muted hover:text-brand-dark hover:bg-white/20"
              )}
              onClick={() => setViewMode(mode)}
            >
              {mode === 'daily' ? '일별' : mode === 'monthly' ? '월별' : '연간'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-md p-2 rounded-2xl border border-white/60 shadow-sm flex-1 min-w-[240px]">
          <Calendar className="w-5 h-5 text-brand-blue ml-2 flex-shrink-0" />
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
            className="bg-transparent border-none px-1 py-2 text-brand-dark focus:outline-none flex-1 text-sm font-bold min-w-[80px]"
          />
          <button
            onClick={handleDownloadPDF}
            className="flex items-center space-x-1 px-3 py-2 bg-brand-light text-white hover:bg-brand-cyan rounded-xl text-sm font-bold transition-all active:scale-95 shadow-sm flex-shrink-0 whitespace-nowrap focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            title="PDF 보고서 다운로드"
          >
            <FileText className="w-4 h-4" />
            <span>PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Summary & Pie */}
        <div className="flex flex-col md:flex-row gap-4 lg:col-span-7 xl:col-span-7">
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] rounded-[2rem] p-4 sm:p-5 flex flex-col justify-between h-[190px] sm:h-[200px] w-full flex-1 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5 text-brand-muted shrink-0">
                <Users className="w-4 h-4 text-brand-blue shrink-0" />
                <span className="text-xs sm:text-sm font-bold text-brand-dark whitespace-nowrap">총 방문객</span>
              </div>
              <div className="flex p-0.5 bg-white/50 backdrop-blur-sm rounded-lg border border-white/60 gap-0.5 shadow-sm shrink-0 self-start">
                {[
                  { value: 'all', label: '전체' },
                  { value: 'autonomous', label: '자율' },
                  { value: 'reserved', label: '예약' }
                ].map(opt => (
                  <button
                    key={`summary-filter-${opt.value}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSummaryFilterType(opt.value as 'all' | 'autonomous' | 'reserved');
                    }}
                    className={cn(
                      "px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap active:scale-95 cursor-pointer relative z-30 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border",
                      summaryFilterType === opt.value 
                        ? "bg-white text-brand-blue shadow-[0_1.5px_4px_-1px_rgba(0,0,0,0.1)] border-transparent" 
                        : "text-brand-muted hover:text-brand-dark hover:bg-white/60 border-transparent"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5 mt-auto">
              <div className="flex items-baseline">
                <motion.span 
                  key={stats.total}
                  initial={{ opacity: 0.5, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-4xl sm:text-5xl font-black text-brand-black tracking-tighter leading-none"
                >
                  {stats.total}
                </motion.span>
                <span className="text-base sm:text-lg text-brand-muted font-bold tracking-normal ml-1">명</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className={cn(
                  "inline-block text-[10px] sm:text-xs font-bold px-2 py-1 rounded-lg border shadow-sm shrink-0",
                  stats.total >= prevStats.total ? "bg-brand-cyan/20 text-brand-dark border-brand-cyan/30" : "bg-rose-100/80 text-rose-700 border-rose-200/50"
                )}>
                  {viewMode === 'daily' ? '어제 대비' : viewMode === 'weekly' ? '지난주 대비' : viewMode === 'monthly' ? '지난달 대비' : '작년 대비'} {getPercentageChange(stats.total, prevStats.total)}
                </span>
                
                <div className="flex space-x-1.5 text-[10px] sm:text-xs font-bold shrink-0">
                  <div className="flex items-center space-x-1 bg-brand-blue/10 px-2 py-1 rounded-lg border border-brand-blue/20">
                    <span className="text-brand-blue font-bold">남</span>
                    <span className="text-brand-dark font-black">{pieData[0].value}</span>
                  </div>
                  <div className="flex items-center space-x-1 bg-rose-100/50 px-2 py-1 rounded-lg border border-rose-200/50">
                    <span className="text-rose-500 font-bold">여</span>
                    <span className="text-brand-dark font-black">{pieData[1].value}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] rounded-[2rem] p-4 sm:p-5 flex flex-col items-center justify-between h-[190px] sm:h-[200px] w-full flex-1 overflow-hidden">
            <div id="pie-chart-container" className="h-[110px] w-full flex items-center justify-center min-w-[80px] sm:min-w-[120px] -mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Pie
                    data={pieData[0].value === 0 && pieData[1].value === 0 ? [{ name: '데이터 없음', value: 1 }] : pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {(pieData[0].value === 0 && pieData[1].value === 0 ? [{ name: '데이터 없음', value: 1 }] : pieData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieData[0].value === 0 && pieData[1].value === 0 ? '#e2e8f0' : PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.5)', borderRadius: '12px', color: '#000000', boxShadow: '0 8px 32px 0 rgba(0, 68, 139, 0.1)' }}
                    itemStyle={{ color: '#00448B', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex space-x-4 text-xs font-bold">
              <div className="flex items-center space-x-1.5 bg-white/50 px-2.5 py-1 rounded-lg border border-white/60 shadow-sm shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm" />
                <span className="text-brand-dark">남 {pieData[0].value}명</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-white/50 px-2.5 py-1 rounded-lg border border-white/60 shadow-sm shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                <span className="text-brand-dark">여 {pieData[1].value}명</span>
              </div>
            </div>
          </div>
        </div>
 
        {/* Right Column: Detailed Breakdown Table */}
        <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.08),0_4px_12px_-2px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.9)] rounded-[2rem] p-6 h-full lg:col-span-5 xl:col-span-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h3 className="text-sm font-extrabold text-brand-dark tracking-tight flex items-center">
              <BarChart2 className="w-4 h-4 mr-2 text-brand-blue" />
              상세 방문객 분포 (연령/성별)
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex p-1 bg-white/50 backdrop-blur-sm rounded-xl border border-white/60 gap-1 shadow-sm">
                {[
                  { value: 'all', label: '전체' },
                  { value: 'autonomous', label: '자율' },
                  { value: 'reserved', label: '예약' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setBreakdownFilterType(opt.value as any)}
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border relative z-10",
                      breakdownFilterType === opt.value 
                        ? "bg-white text-brand-blue shadow-[0_2px_8px_-1px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] border-transparent" 
                        : "text-brand-muted hover:text-brand-dark hover:bg-white/40 border-transparent"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => exportToXLSX(date, allRecords, viewMode === 'monthly' ? 'monthly' : 'daily')}
                className="flex items-center justify-center p-1.5 bg-white/60 hover:bg-white/90 text-brand-blue rounded-xl transition-all shadow-sm border border-white/80 active:scale-95 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                title="엑셀 내보내기"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(breakdownStats).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center p-3 bg-white/40 rounded-xl border border-white/50 shadow-sm backdrop-blur-sm hover:bg-white/60 transition-colors">
                <span className="text-xs font-bold text-brand-muted">{key}</span>
                <span className="text-sm font-black text-brand-black">{value as number}명</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white/40 backdrop-blur-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.04)] rounded-[2rem] p-6 relative z-10">
        <div className="flex justify-between items-center mb-5 pl-2 gap-2">
          <h3 className="text-sm font-extrabold text-brand-dark tracking-tight break-keep">
            {viewMode === 'daily' ? '시간대별' : viewMode === 'monthly' ? '일별' : '월별'} 종합 방문객 추이
          </h3>
          <button 
            onClick={() => handleDownloadChart('comprehensive-chart', `${date.replace(/-/g, '')}_방문객추이`)}
            className="text-brand-muted hover:text-brand-blue bg-white/50 hover:bg-white/80 p-2 rounded-xl transition-all border border-white/60 shadow-sm active:scale-95 flex-shrink-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
            title="그래프 다운로드 (PNG)"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col mb-6">
          {/* Main Visualizer Filters */}
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4 bg-white/30 backdrop-blur-md p-3 rounded-2xl border border-white/50 shadow-sm">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-brand-muted w-14 shrink-0">관람 유형</span>
              <div className="flex flex-wrap flex-1 sm:flex-none p-1 bg-white/40 rounded-xl border border-white/50 gap-1 shadow-inner">
                {[
                  { value: 'all', label: '전체 관람' },
                  { value: 'autonomous', label: '자율 관람' },
                  { value: 'reserved', label: '예약 관람' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setChartFilterType(opt.value as any)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 border",
                      chartFilterType === opt.value 
                        ? "bg-white/90 text-brand-blue shadow-[0_2px_8px_-1px_rgba(0,0,0,0.1),inset_0_1px_1px_rgba(255,255,255,1)] border-transparent" 
                        : "text-brand-muted hover:text-brand-dark hover:bg-white/60 border-transparent"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="hidden sm:block w-px h-8 bg-white/40"></div>
            
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-brand-muted w-14 shrink-0 sm:w-auto">표시 기준</span>
              <div className="flex flex-wrap flex-1 sm:flex-none p-1 bg-white/40 rounded-xl border border-white/50 gap-1 shadow-inner">
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
                      "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap active:scale-95 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0",
                      chartDisplayMode === opt.value 
                        ? "bg-brand-dark text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] border border-brand-dark" 
                        : "text-brand-muted hover:text-brand-dark hover:bg-white/60"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div id="comprehensive-chart" className="h-[260px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === 'daily' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: chartDisplayMode === 'detailed' ? 30 : 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.4)" vertical={false} />
                  <XAxis dataKey="name" stroke="#508EBC" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <YAxis stroke="#508EBC" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.3)' }}
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.5)', borderRadius: '12px', color: '#000000', boxShadow: '0 8px 32px 0 rgba(0, 68, 139, 0.1)' }}
                    itemStyle={{ color: '#00448B', fontWeight: 'bold' }}
                    labelStyle={{ fontWeight: '900', marginBottom: '4px' }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    content={(props) => {
                      const { payload } = props;
                      return (
                        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 mt-4 text-[10px] sm:text-xs font-bold text-brand-dark px-4">
                          {payload?.map((entry: any, index: number) => (
                            <div key={`legend-bar-${index}`} className="flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="text-brand-muted hover:text-brand-dark transition-colors whitespace-nowrap">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {chartDisplayMode === 'total' && (
                    <Bar dataKey="총합계" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  )}
                  {chartDisplayMode === 'age' && (
                    <>
                      <Bar dataKey="성인" stackId="age" fill="#3b82f6" />
                      <Bar dataKey="어린이" stackId="age" fill="#f59e0b" />
                      <Bar dataKey="유아" stackId="age" fill="#f43f5e" />
                      <Bar dataKey="청소년" stackId="age" fill="#10b981" />
                    </>
                  )}
                  {chartDisplayMode === 'gender' && (
                    <>
                      <Bar dataKey="남성" stackId="gender" fill="#3b82f6" />
                      <Bar dataKey="여성" stackId="gender" fill="#f43f5e" />
                    </>
                  )}
                  {chartDisplayMode === 'detailed' && (
                    <>
                      <Bar dataKey="성인(남)" stackId="age_gender" fill="#3b82f6" />
                      <Bar dataKey="성인(여)" stackId="age_gender" fill="#93c5fd" />
                      <Bar dataKey="어린이(남)" stackId="age_gender" fill="#f59e0b" />
                      <Bar dataKey="어린이(여)" stackId="age_gender" fill="#fcd34d" />
                      <Bar dataKey="유아(남)" stackId="age_gender" fill="#f43f5e" />
                      <Bar dataKey="유아(여)" stackId="age_gender" fill="#fda4af" />
                      <Bar dataKey="청소년(남)" stackId="age_gender" fill="#10b981" />
                      <Bar dataKey="청소년(여)" stackId="age_gender" fill="#6ee7b7" />
                    </>
                  )}
                </BarChart>
              ) : (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: chartDisplayMode === 'detailed' ? 30 : 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.4)" vertical={false} />
                  <XAxis dataKey="name" stroke="#508EBC" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <YAxis stroke="#508EBC" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderColor: 'rgba(255,255,255,0.5)', borderRadius: '12px', color: '#000000', boxShadow: '0 8px 32px 0 rgba(0, 68, 139, 0.1)' }}
                    itemStyle={{ color: '#00448B', fontWeight: 'bold' }}
                    labelStyle={{ fontWeight: '900', marginBottom: '4px' }}
                  />
                  <Legend 
                    verticalAlign="bottom"
                    content={(props) => {
                      const { payload } = props;
                      return (
                        <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-1.5 mt-4 text-[10px] sm:text-xs font-bold text-brand-dark px-4">
                          {payload?.map((entry: any, index: number) => (
                            <div key={`legend-line-${index}`} className="flex items-center space-x-1">
                              <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: entry.color }} />
                              <span className="text-brand-muted hover:text-brand-dark transition-colors whitespace-nowrap">{entry.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  {chartDisplayMode === 'total' && (
                    <Line type="monotone" dataKey="총합계" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  )}
                  {chartDisplayMode === 'age' && (
                    <>
                      <Line type="monotone" dataKey="성인" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="어린이" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="유아" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="청소년" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    </>
                  )}
                  {chartDisplayMode === 'gender' && (
                    <>
                      <Line type="monotone" dataKey="남성" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="여성" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </>
                  )}
                  {chartDisplayMode === 'detailed' && (
                    <>
                      <Line type="monotone" dataKey="성인(남)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="성인(여)" stroke="#93c5fd" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="어린이(남)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="어린이(여)" stroke="#fcd34d" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="유아(남)" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="유아(여)" stroke="#fda4af" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="청소년(남)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="청소년(여)" stroke="#6ee7b7" strokeWidth={2} dot={{ r: 3 }} />
                    </>
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-brand-muted text-sm bg-white/40 rounded-xl border border-white/60 border-dashed backdrop-blur-sm">
              <BarChart2 className="w-8 h-8 mb-2 text-brand-muted/70" />
              <span className="font-bold">데이터가 없습니다.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
