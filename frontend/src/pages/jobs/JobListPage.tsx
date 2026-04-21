import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobs as jobsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Briefcase, Plus, MapPin, DollarSign, Users, ChevronRight } from 'lucide-react';

export default function JobListPage() {
  const [jobList, setJobList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    jobsApi.list().then(r => setJobList(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const canManage = user?.role === 'admin' || user?.role === 'recruiter';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-header">Job Positions</h1>
          <p className="page-subtitle">{jobList.length} open positions</p>
        </div>
        {canManage && (
          <Link to="/jobs/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Position
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading jobs...</div>
      ) : jobList.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Briefcase className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-300 font-semibold mb-1">No job positions yet</p>
          {canManage && <Link to="/jobs/new" className="btn-primary mt-4 inline-flex items-center gap-2"><Plus size={16} />Create First Job</Link>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobList.map((job: any, i: number) => (
            <motion.div key={job.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link to={`/jobs/${job.id}`} className="glass-card p-6 block hover:border-brand-500/30 group transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
                      <Briefcase className="text-brand-400" size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">{job.title}</h3>
                      <p className="text-slate-400 text-sm">{job.department}</p>
                      {job.created_by_name && (
                        <Link to={`/profile/${job.created_by}`} className="text-slate-500 hover:text-brand-400 transition-colors text-[10px] mt-0.5 inline-block">
                          Posted by {job.created_by_name}
                        </Link>
                      )}
                    </div>
                  </div>
                  <span className={job.status === 'active' ? 'badge-green' : 'badge-gray'}>{job.status}</span>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4">
                  {job.location && <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>}
                  {(job.salary_min || job.salary_max) && (
                    <span className="flex items-center gap-1">
                      <DollarSign size={12} />
                      {job.salary_min && `$${(job.salary_min / 1000).toFixed(0)}k`}{job.salary_min && job.salary_max && ' - '}
                      {job.salary_max && `$${(job.salary_max / 1000).toFixed(0)}k`}
                    </span>
                  )}
                  <span className="flex items-center gap-1"><Users size={12} /> {job.applicant_count || 0} applicants</span>
                </div>

                {job.requirements?.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {job.requirements.skills.slice(0, 4).map((s: string) => (
                      <span key={s} className="px-2 py-0.5 bg-surface-700 text-slate-300 rounded-lg text-xs">{s}</span>
                    ))}
                    {job.requirements.skills.length > 4 && (
                      <span className="px-2 py-0.5 bg-surface-700 text-slate-500 rounded-lg text-xs">+{job.requirements.skills.length - 4} more</span>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
