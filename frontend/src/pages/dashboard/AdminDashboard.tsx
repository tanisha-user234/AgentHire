import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { analytics } from '../../services/api';
import { Users, Briefcase, ClipboardList, Shield, TrendingUp, ArrowRight } from 'lucide-react';

const recColors: Record<string, string> = {
  strong_hire: 'badge-green', hire: 'badge-blue', maybe: 'badge-yellow', no_hire: 'badge-red',
};

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'recruiters'>('overview');
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    analytics.overview().then(r => setData(r.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (activeTab === 'recruiters') {
      setLoadingRecs(true);
      analytics.recruiters().then(r => setRecruiters(r.data)).finally(() => setLoadingRecs(false));
    }
  }, [activeTab]);

  const stats = data ? [
    { label: 'Total Candidates', value: data.totalCandidates, icon: Users, color: 'bg-brand-600' },
    { label: 'Total Recruiters', value: data.totalRecruiters, icon: Shield, color: 'bg-purple-600' },
    { label: 'Active Jobs', value: data.totalJobs, icon: Briefcase, color: 'bg-emerald-600' },
    { label: 'Total Assessments', value: data.totalAssessments, icon: ClipboardList, color: 'bg-cyan-600' },
  ] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-header">Admin Dashboard</h1>
          <p className="page-subtitle">System-wide overview and management</p>
        </div>
        <div className="flex bg-surface-800 p-1 rounded-xl border border-white/5">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'overview' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Overview
          </button>
          <button 
            onClick={() => setActiveTab('recruiters')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'recruiters' ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Recruiters
          </button>
        </div>
      </div>

      {activeTab === 'overview' ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((s) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="stat-card">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">{s.label}</p>
                    <p className="text-3xl font-bold text-white mt-1">{s.value}</p>
                  </div>
                  <div className={`p-3 rounded-xl ${s.color}`}><s.icon size={20} className="text-white" /></div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'Manage Jobs', desc: 'Create and edit jobs', icon: Briefcase, link: '/jobs', color: 'brand' },
                  { title: 'Candidates', desc: 'View profiles', icon: Users, link: '/candidates', color: 'emerald' },
                  { title: 'Assessments', desc: 'Monitor sessions', icon: ClipboardList, link: '/assessments', color: 'cyan' },
                ].map(item => (
                  <Link key={item.link} to={item.link} className="glass-card p-5 hover:border-brand-500/30 transition-all group">
                    <div className={`w-10 h-10 rounded-xl bg-surface-700/50 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                      <item.icon className="text-brand-400" size={18} />
                    </div>
                    <h3 className="font-semibold text-white text-sm mb-1">{item.title}</h3>
                    <p className="text-slate-400 text-[10px]">{item.desc}</p>
                  </Link>
                ))}
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
                  {(data?.recentAssessments || []).map((a: any) => (
                    <div key={a.id} className="p-4 rounded-xl hover:bg-white/5 transition-colors border border-white/5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-xs">
                            {a.candidate_name?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-white font-medium text-xs">{a.candidate_name}</p>
                            <p className="text-slate-500 text-[10px]">{a.job_title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {a.status === 'in_progress' ? (
                            <div className="flex items-center gap-2">
                              <span className="text-amber-500 text-[10px] font-medium">{a.progress || 0}%</span>
                              <div className="w-16 h-1 bg-surface-700 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500" style={{ width: `${a.progress || 0}%` }} />
                              </div>
                            </div>
                          ) : (
                            <span className={recColors[a.recommendation] || 'badge-gray'}>
                              {a.status === 'completed' ? (a.recommendation?.replace('_', ' ') || 'Completed') : a.status}
                            </span>
                          )}
                          <Link to={a.status === 'completed' ? `/assessments/${a.id}/report` : `/assessments/${a.id}/interview`} className="text-slate-400 hover:text-white">
                            <ArrowRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-brand-400" />
                  System Info
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Avg Candidate Score</span>
                    <span className="text-white font-bold">{data?.avgScore || 0}%</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Completed Interviews</span>
                    <span className="text-white font-bold">{data?.completedAssessments || 0}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">Currently Active</span>
                    <span className="text-amber-500 font-bold">{data?.inProgress || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Recruiter</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Jobs Posted</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Applicants</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recruiters.map(r => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold">
                          {r.first_name?.[0]}{r.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-white font-medium">{r.first_name} {r.last_name}</p>
                          <p className="text-slate-500 text-xs">{r.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-white/5 rounded-full text-white text-sm font-bold border border-white/5">
                        {r.job_count || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-slate-400 text-sm">{r.total_applicants || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/profile/${r.id}`} className="text-brand-400 hover:text-brand-300 text-sm font-bold flex items-center justify-end gap-1 group-hover:gap-2 transition-all">
                        View Profile <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
                {loadingRecs && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">Loading recruiters...</td>
                  </tr>
                )}
                {!loadingRecs && recruiters.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">No recruiters found in the system.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
