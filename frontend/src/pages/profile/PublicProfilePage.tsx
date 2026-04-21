import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { candidates as candidatesApi, jobs as jobsApi } from '../../services/api';
import { User, Mail, Briefcase, ArrowLeft, Shield, CheckCircle } from 'lucide-react';

export default function PublicProfilePage() {
  const { id } = useParams();
  const [recruiter, setRecruiter] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      Promise.all([
        candidatesApi.getRecruiter(id),
        jobsApi.list() // We'll filter this to show recruiter's jobs
      ]).then(([rRes, jRes]) => {
        setRecruiter(rRes.data);
        setJobs(jRes.data.filter((j: any) => j.created_by === id));
      }).catch(console.error).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="text-slate-400 text-center py-16">Loading profile...</div>;
  if (!recruiter) return <div className="text-red-400 text-center py-16">Recruiter not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Link to="/jobs" className="btn-ghost flex items-center gap-2 text-slate-400">
          <ArrowLeft size={16} /> Back to Jobs
        </Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Shield size={120} className="text-brand-400" />
        </div>

        <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
          <div className="w-24 h-24 rounded-3xl bg-brand-600/20 flex items-center justify-center text-4xl shadow-xl shadow-brand-600/10 border border-brand-500/20">
            🤝
          </div>
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white">{recruiter.first_name} {recruiter.last_name}</h1>
              <span className="px-2.5 py-0.5 bg-brand-500/20 text-brand-400 text-[10px] uppercase font-bold tracking-wider rounded-lg border border-brand-500/20 flex items-center gap-1">
                <CheckCircle size={10} /> Verified Recruiter
              </span>
            </div>
            <p className="text-slate-400 flex items-center justify-center md:justify-start gap-2 mb-4">
              <Mail size={16} className="text-brand-400" />
              {recruiter.email}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Open Positions</p>
                <p className="text-xl font-bold text-white">{jobs.length}</p>
              </div>
              <div className="px-4 py-2 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Experience</p>
                <p className="text-xl font-bold text-white">Senior Recruiter</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div>
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Briefcase className="text-brand-400" size={20} />
          Active Listings by {recruiter.first_name}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <Link key={job.id} to={`/jobs/${job.id}`} className="glass-card p-6 hover:border-brand-500/30 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white group-hover:text-brand-400 transition-colors">{job.title}</h3>
                <span className="badge-green">{job.status}</span>
              </div>
              <p className="text-slate-400 text-sm mb-4">{job.department}</p>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{job.location}</span>
                <span className="flex items-center gap-1">View Details <ArrowLeft size={12} className="rotate-180" /></span>
              </div>
            </Link>
          ))}
          {jobs.length === 0 && (
            <div className="col-span-2 glass-card p-12 text-center text-slate-500 italic">
              No active positions currently listed.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
