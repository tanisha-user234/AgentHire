import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { analytics } from '../../services/api';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, BarChart3, Award } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsDashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [candidates, setCandidates] = useState<any>(null);

  useEffect(() => {
    analytics.overview().then(r => setOverview(r.data));
    analytics.candidates().then(r => setCandidates(r.data));
  }, []);

  if (!overview) return <div className="text-center text-slate-400 py-16">Loading analytics...</div>;

  const pipelineData = candidates?.pipeline || [];
  const scoresByJob = overview.scoresByJob || [];
  const monthlyData = overview.monthlyData || [];
  const recData = (overview.recommendations || []).map((r: any) => ({
    name: r.recommendation?.replace('_', ' ') || 'unknown',
    value: r.count,
  }));

  return (
    <div>
      <h1 className="page-header">Analytics</h1>
      <p className="page-subtitle">Comprehensive hiring metrics and insights</p>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Users, label: 'Total Candidates', value: overview.totalCandidates, color: 'bg-brand-600' },
          { icon: BarChart3, label: 'Assessments', value: overview.totalAssessments, color: 'bg-cyan-600' },
          { icon: TrendingUp, label: 'Avg Score', value: `${overview.avgScore}%`, color: 'bg-emerald-600' },
          { icon: Award, label: 'Completed', value: overview.completedAssessments, color: 'bg-amber-600' },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="stat-card">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-400 text-sm">{s.label}</p>
                <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${s.color}`}><s.icon className="text-white" size={20} /></div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly trend */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Assessment Trend (Last 6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
              <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 5 }} activeDot={{ r: 7 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendations donut */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Hiring Recommendations</h3>
          {recData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={recData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {recData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
                <Legend iconType="circle" iconSize={8} formatter={(value: string) => <span style={{ color: '#94a3b8', fontSize: 12, textTransform: 'capitalize' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="text-center text-slate-500 py-16">No completed assessments yet</div>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scores by job */}
        {scoresByJob.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Avg Score by Position</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoresByJob} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="title" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0' }} />
                <Bar dataKey="avg_score" fill="#6366f1" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Candidate pipeline */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Assessment Pipeline</h3>
          <div className="space-y-3">
            {pipelineData.map((p: any) => {
              const total = pipelineData.reduce((a: number, b: any) => a + b.count, 0);
              const pct = total > 0 ? (p.count / total) * 100 : 0;
              const colorMap: Record<string, string> = { scheduled: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444' };
              return (
                <div key={p.status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400 capitalize">{p.status.replace('_', ' ')}</span>
                    <span className="text-white font-medium">{p.count}</span>
                  </div>
                  <div className="h-2 bg-surface-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                      className="h-full rounded-full" style={{ background: colorMap[p.status] || '#6366f1' }} />
                  </div>
                </div>
              );
            })}
            {pipelineData.length === 0 && <div className="text-slate-500 text-center py-8">No data yet</div>}
          </div>
        </div>

        {/* Top candidates */}
        {candidates?.topCandidates?.length > 0 && (
          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="font-semibold text-white mb-4">Top Candidates by Score</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-white/5">
                    <th className="text-left py-2 pr-4">Candidate</th>
                    <th className="text-left py-2 pr-4">Position</th>
                    <th className="text-left py-2 pr-4">Score</th>
                    <th className="text-left py-2">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.topCandidates.map((c: any, i: number) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/3">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-600/20 text-brand-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                            {c.name?.charAt(0)}
                          </div>
                          <span className="text-white">{c.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-400">{c.job_title}</td>
                      <td className="py-3 pr-4">
                        <span className="text-brand-400 font-bold">{Math.round(c.overall_score)}%</span>
                      </td>
                      <td className="py-3">
                        <span className={`badge capitalize ${
                          c.recommendation === 'strong_hire' ? 'badge-green' :
                          c.recommendation === 'hire' ? 'badge-blue' :
                          c.recommendation === 'maybe' ? 'badge-yellow' : 'badge-red'
                        }`}>{c.recommendation?.replace('_', ' ')}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
