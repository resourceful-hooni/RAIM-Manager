import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useStore } from '@/store/useStore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { Users, Calendar, TrendingUp, AlertCircle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f43f5e'];
const PIE_COLORS = ['#8b5cf6', '#0ea5e9'];

export default function DashboardPage() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { getAllRecords } = useStore();

  const allRecords = getAllRecords();

  const dailyRecords = useMemo(() => {
    return allRecords.filter(r => r.date === date);
  }, [date, allRecords]);

  const stats = useMemo(() => {
    let total = 0;
    let autonomous = 0;
    let reserved = 0;

    dailyRecords.forEach(r => {
      const sum = r.counts.adult + r.counts.youth + r.counts.child + r.counts.infant;
      total += sum;
      if (r.type === 'autonomous') autonomous += sum;
      else reserved += sum;
    });

    return { total, autonomous, reserved };
  }, [dailyRecords]);

  const chartData = useMemo(() => {
    const data: any[] = [];
    dailyRecords.forEach(r => {
      data.push({
        name: r.session.split(' ')[0],
        성인: r.counts.adult,
        청소년: r.counts.youth,
        어린이: r.counts.child,
        유아: r.counts.infant,
        type: r.type
      });
    });
    return data.sort((a, b) => a.name.localeCompare(b.name));
  }, [dailyRecords]);

  const pieData = [
    { name: '자율관람', value: stats.autonomous },
    { name: '예약관람', value: stats.reserved },
  ];

  // Predictive Logic
  const prediction = useMemo(() => {
    if (allRecords.length === 0) return null;

    // Group by session to find historical averages
    const sessionStats: Record<string, { total: number, count: number }> = {};
    
    allRecords.forEach(r => {
      const sum = r.counts.adult + r.counts.youth + r.counts.child + r.counts.infant;
      if (!sessionStats[r.session]) {
        sessionStats[r.session] = { total: 0, count: 0 };
      }
      sessionStats[r.session].total += sum;
      sessionStats[r.session].count += 1;
    });

    let peakSession = '';
    let maxAvg = 0;

    Object.entries(sessionStats).forEach(([session, data]) => {
      const avg = data.total / data.count;
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
    <div className="p-4 space-y-6 max-w-2xl mx-auto">
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

      <div className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
        <Calendar className="w-5 h-5 text-slate-400 ml-2" />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-transparent border-none px-2 py-1 text-slate-900 focus:outline-none flex-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 flex flex-col justify-center">
          <div className="flex items-center space-x-2 text-slate-500 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">총 방문객</span>
          </div>
          <span className="text-4xl font-bold text-slate-900 tracking-tight">{stats.total} <span className="text-lg text-slate-500 font-normal">명</span></span>
        </div>
        
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4 flex items-center justify-center">
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={25}
                  outerRadius={40}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                  itemStyle={{ color: '#0f172a' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col space-y-1 text-xs">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-[#8b5cf6]" />
              <span className="text-slate-600">자율 {stats.autonomous}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-[#0ea5e9]" />
              <span className="text-slate-600">예약 {stats.reserved}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-4">
        <h3 className="text-sm font-medium text-slate-700 mb-4">세션별 방문객 추이</h3>
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="성인" stackId="a" fill={COLORS[0]} radius={[0, 0, 4, 4]} />
                <Bar dataKey="청소년" stackId="a" fill={COLORS[1]} />
                <Bar dataKey="어린이" stackId="a" fill={COLORS[2]} />
                <Bar dataKey="유아" stackId="a" fill={COLORS[3]} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
