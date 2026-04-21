import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { assessments as assessmentApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { ClipboardList, Plus, Play, FileText, Calendar, Brain, User } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const statusConfig: Record<string, { badge: string; label: string }> = {
  applied: { badge: 'badge-purple', label: 'Applied' },
  scheduled: { badge: 'badge-blue', label: 'Scheduled' },
  in_progress: { badge: 'badge-yellow', label: 'In Progress' },
  completed: { badge: 'badge-green', label: 'Completed' },
  cancelled: { badge: 'badge-red', label: 'Cancelled' },
};

export default function AssessmentListPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    assessmentApi.list().then(r => setList(r.data)).finally(() => setLoading(false));
  }, []);

  const canManage = user?.role === 'admin' || user?.role === 'recruiter';

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await assessmentApi.updateStatus(id, status);
      setList(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast.success(`Assessment moved to ${status}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-header">Assessments</h1>
          <p className="page-subtitle">{list.length} total assessments</p>
        </div>
        {canManage && (
          <Link to="/assessments/schedule" className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Schedule Assessment
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading...</div>
      ) : list.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <ClipboardList className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">No assessments yet</p>
          {canManage && <Link to="/assessments/schedule" className="btn-primary mt-4 inline-flex items-center gap-2"><Plus size={16} />Schedule one</Link>}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((a: any, i: number) => {
            const status = statusConfig[a.status] || { badge: 'badge-gray', label: a.status };
            return (
              <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card p-5 flex items-center justify-between hover:border-white/20 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
                    <ClipboardList className="text-brand-400" size={18} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">
                        {canManage ? a.candidate_name : a.job_title}
                      </p>
                      <span className={status.badge}>{status.label}</span>
                      {a.screening_score !== null && (
                        <span className="px-2 py-0.5 bg-brand-500/10 text-brand-400 text-[10px] font-bold rounded-lg border border-brand-500/20 flex items-center gap-1">
                          <Brain size={10} /> AI Match: {Math.round(a.screening_score)}%
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">{canManage ? a.job_title : a.department}</p>
                    <div className="flex items-center gap-4 mt-1">
                      {a.scheduled_at && (
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Calendar size={11} />{format(new Date(a.scheduled_at), 'MMM d, yyyy')}
                        </p>
                      )}
                      {user?.role === 'admin' && a.recruiter_name && (
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <User size={11} /> Recruiter: {a.recruiter_name}
                        </p>
                      )}
                    </div>
                    {a.status === 'in_progress' && (
                      <div className="mt-2 w-32">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-slate-500">Progress</span>
                          <span className="text-amber-500">{a.progress || 0}%</span>
                        </div>
                        <div className="h-1 bg-surface-700 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${a.progress || 0}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {a.overall_score && <span className="text-brand-400 font-bold">{Math.round(a.overall_score)}%</span>}
                  
                  {canManage && a.status === 'applied' && (
                    <button onClick={() => handleStatusUpdate(a.id, 'scheduled')} className="btn-primary flex items-center gap-1.5 py-2 text-sm">
                      <Calendar size={13} /> Schedule
                    </button>
                  )}

                  {a.status === 'scheduled' && (
                    <Link to={`/assessments/${a.id}/interview`} className="btn-primary flex items-center gap-1.5 py-2 text-sm">
                      <Play size={13} /> Start
                    </Link>
                  )}
                  {a.status === 'in_progress' && (
                    <Link to={`/assessments/${a.id}/interview`} className="btn-secondary flex items-center gap-1.5 py-2 text-sm">
                      <Play size={13} /> Resume
                    </Link>
                  )}
                  {a.status === 'completed' && (
                    <Link to={`/assessments/${a.id}/report`} className="btn-secondary flex items-center gap-1.5 py-2 text-sm">
                      <FileText size={13} /> Report
                    </Link>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
