import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobs as jobsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { Briefcase, MapPin, DollarSign, Users, Edit, Trash2, ArrowLeft, Clock, Send, Loader2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ApplicationModal from '../../components/jobs/ApplicationModal';

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) jobsApi.get(id).then(r => setJob(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm('Delete this job?')) return;
    await jobsApi.delete(id);
    navigate('/jobs');
  };

  const handleApply = async (appData: { coverLetter: string; metaData: any }) => {
    if (!id) return;
    try {
      await jobsApi.apply(id, appData);
      toast.success('Application submitted successfully!');
      const r = await jobsApi.get(id);
      setJob(r.data);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit application');
      throw err;
    }
  };

  if (loading) return <div className="text-slate-400 text-center py-16">Loading...</div>;
  if (!job) return <div className="text-red-400 text-center py-16">Job not found</div>;

  const canManage = user?.role === 'admin' || user?.role === 'recruiter';

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/jobs" className="btn-ghost flex items-center gap-2 text-slate-400">
          <ArrowLeft size={16} /> Jobs
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-brand-600/20 flex items-center justify-center">
                  <Briefcase className="text-brand-400" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">{job.title}</h1>
                  <div className="flex items-center gap-3 text-slate-400 mt-1">
                    <span>{job.department}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    {job.created_by_name && (
                      <Link to={`/profile/${job.created_by}`} className="text-slate-500 hover:text-brand-400 transition-colors">
                        Posted by {job.created_by_name}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Link to={`/jobs/new?edit=${job.id}`} className="btn-secondary flex items-center gap-2">
                    <Edit size={14} /> Edit
                  </Link>
                  <button onClick={handleDelete} className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-6">
              {job.location && <span className="flex items-center gap-1.5"><MapPin size={14} /> {job.location}</span>}
              {job.salary_min && <span className="flex items-center gap-1.5"><DollarSign size={14} /> ${(job.salary_min / 1000).toFixed(0)}k - ${(job.salary_max / 1000).toFixed(0)}k</span>}
              <span className="flex items-center gap-1.5"><Users size={14} /> {job.applicant_count || 0} applicants</span>
            </div>

            {job.description && (
              <div>
                <h3 className="font-semibold text-white mb-3">Job Description</h3>
                <p className="text-slate-300 leading-relaxed">{job.description}</p>
              </div>
            )}
          </motion.div>

          {job.requirements?.skills?.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4">Required Skills</h3>
              <div className="flex flex-wrap gap-2">
                {job.requirements.skills.map((s: string) => (
                  <span key={s} className="px-3 py-1.5 bg-brand-600/20 text-brand-300 rounded-lg text-sm border border-brand-500/20">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {canManage && (
            <div className="glass-card p-6">
              <h3 className="font-semibold text-white mb-4">Assessment Config</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Agents:</span>
                  <span className="text-white capitalize">{(job.assessment_config?.agents || []).join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Difficulty:</span>
                  <span className="text-white capitalize">{job.assessment_config?.difficulty || 'medium'}</span>
                </div>
                {job.assessment_config?.timeLimit && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time limit:</span>
                    <span className="text-white flex items-center gap-1"><Clock size={12} /> {job.assessment_config.timeLimit} min</span>
                  </div>
                )}
              </div>
              <Link to="/assessments/schedule" className="btn-primary w-full mt-4 block text-center">
                Schedule Assessment
              </Link>
            </div>
          )}

          {user?.role === 'candidate' && (
            <div className="glass-card p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-600/10 flex items-center justify-center mx-auto mb-4 border border-brand-500/20">
                <Briefcase size={32} className="text-brand-400" />
              </div>
              <p className="text-white font-bold text-lg mb-1">Join the Team</p>
              <p className="text-slate-400 text-sm mb-6">Take the first step towards this exciting role in {job.department}.</p>
              
              <button 
                onClick={() => setShowApplyModal(true)} 
                className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base font-semibold shadow-lg shadow-brand-600/20"
              >
                <Send size={18} />
                Apply Now
              </button>
              
              <p className="text-[10px] text-slate-500 mt-4 px-4 leading-tight">
                By applying, your profile details and resume will be shared with the hiring team.
              </p>
            </div>
          )}
        </div>
      </div>

      <ApplicationModal 
        isOpen={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onApply={handleApply}
        jobTitle={job.title}
      />
    </div>
  );
}
