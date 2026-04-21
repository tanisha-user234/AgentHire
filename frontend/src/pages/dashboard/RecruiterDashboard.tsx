import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Users, Briefcase, ClipboardList, TrendingUp, ArrowRight, CheckCircle, Clock, XCircle, Star } from 'lucide-react';
import { analytics } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { useAuthStore } from '../../store/authStore';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const recColors: Record<string, string> = {
  strong_hire: 'badge-green', hire: 'badge-blue', maybe: 'badge-yellow', no_hire: 'badge-red',
};

function StatCard({ icon: Icon, label, value, color, sub }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon size={20} className="text-white" />
        </div>
      </div>
    </motion.div>
  );
}

export default function RecruiterDashboard() {
  const [data, setData] = useState<any>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    analytics.overview().then(r => setData(r.data)).catch(console.error);
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400">Loading dashboard...</div>
    </div>
  );

  const recData = data.recommendations || [];
  const pieData = recData.map((r: any) => ({ name: r.recommendation?.replace('_', ' '), value: r.count }));

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-header">Welcome back, {user?.firstName}! 👋</h1>
          <p className="page-subtitle">Here's your hiring pipeline overview</p>
        </div>
        <Link to="/assessments/schedule" className="btn-primary flex items-center gap-2">
          <ClipboardList size={16} />
          Schedule Assessment
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Total Candidates" value={data.totalCandidates} color="bg-brand-600" sub="Active in system" />
        <StatCard icon={Briefcase} label="Active Jobs" value={data.totalJobs} color="bg-emerald-600" sub="Open positions" />
        <StatCard icon={ClipboardList} label="Assessments" value={data.totalAssessments} color="bg-cyan-600" sub={`${data.completedAssessments} completed`} />
        <StatCard icon={BarChart3} label="Avg Score" value={`${data.avgScore}%`} color="bg-amber-600" sub="Across all completed" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Monthly chart */}
        <div className="glass-card p-6 col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Monthly Assessments</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.monthlyData}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
              <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendations pie */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-center text-slate-500 py-12">No completed assessments yet</div>}
          <div className="space-y-1 mt-2">
            {pieData.map((item: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-slate-400 capitalize">{item.name}</span>
                </div>
                <span className="text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Assessments */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Assessments</h3>
          <Link to="/assessments" className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="space-y-3">
          {(data.recentAssessments || []).map((a: any) => (
            <div key={a.id} className="p-4 rounded-xl hover:bg-white/5 transition-colors border border-white/5 hover:border-white/10">
              <Link to={a.status === 'completed' ? `/assessments/${a.id}/report` : `/assessments/${a.id}/interview`}
                className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-sm">
                    {a.candidate_name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{a.candidate_name}</p>
                    <p className="text-slate-500 text-xs">{a.job_title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {a.overall_score && <span className="text-slate-300 font-semibold text-sm">{Math.round(a.overall_score)}%</span>}
                  <span className={recColors[a.recommendation] || (a.status === 'in_progress' ? 'badge-yellow' : 'badge-gray')}>
                    {a.status === 'completed' ? (a.recommendation?.replace('_', ' ') || '—') : a.status.replace('_', ' ')}
                  </span>
                </div>
              </Link>
              {a.status === 'in_progress' && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500">Progress</span>
                    <span className="text-amber-500">{a.progress || 0}%</span>
                  </div>
                  <div className="h-1 bg-surface-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${a.progress || 0}%` }}
                      className="h-full bg-amber-500 rounded-full" />
                  </div>
                </div>
              )}
            </div>
          ))}
          {(!data.recentAssessments || data.recentAssessments.length === 0) && (
            <div className="text-center text-slate-500 py-8">No assessments yet. <Link to="/assessments/schedule" className="text-brand-400">Schedule one!</Link></div>
          )}
        </div>
      </div>
    </div>
  );
}
