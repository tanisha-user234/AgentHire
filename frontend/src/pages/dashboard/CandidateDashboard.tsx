import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { assessments as assessmentApi } from '../../services/api';
import { ClipboardList, Play, FileText, Clock, CheckCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  scheduled: { label: 'Scheduled', class: 'badge-blue', icon: Calendar },
  in_progress: { label: 'In Progress', class: 'badge-yellow', icon: Clock },
  completed: { label: 'Completed', class: 'badge-green', icon: CheckCircle },
};

const recColors: Record<string, string> = {
  strong_hire: 'text-emerald-400', hire: 'text-blue-400', maybe: 'text-amber-400', no_hire: 'text-red-400',
};

export default function CandidateDashboard() {
  const { user } = useAuthStore();
  const [myAssessments, setMyAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assessmentApi.list().then(r => setMyAssessments(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const scheduled = myAssessments.filter(a => a.status === 'scheduled');
  const completed = myAssessments.filter(a => a.status === 'completed');
  const inProgress = myAssessments.filter(a => a.status === 'in_progress');

  return (
    <div>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="glass-card p-8 bg-gradient-to-r from-brand-900/50 to-purple-900/30 border-brand-500/20">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.firstName}! 👋</h1>
          <p className="text-slate-300 mb-6">Track your assessments and application progress below.</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Scheduled', value: scheduled.length, color: 'text-blue-400' },
              { label: 'Completed', value: completed.length, color: 'text-emerald-400' },
              { label: 'In Progress', value: inProgress.length, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="text-center">
                <div className={`text-4xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-slate-400 text-sm mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Upcoming */}
      {scheduled.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">🗓 Upcoming Assessments</h2>
          <div className="space-y-3">
            {scheduled.map((a: any) => (
              <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass-card p-5 flex items-center justify-between hover:border-brand-500/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-600/20 flex items-center justify-center">
                    <ClipboardList className="text-brand-400" size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{a.job_title}</p>
                    <p className="text-slate-400 text-sm">{a.department}</p>
                    {a.scheduled_at && (
                      <p className="text-slate-500 text-xs mt-1">Scheduled: {format(new Date(a.scheduled_at), 'MMM d, yyyy h:mm a')}</p>
                    )}
                  </div>
                </div>
                <Link to={`/assessments/${a.id}/interview`} className="btn-primary flex items-center gap-2">
                  <Play size={14} />
                  Start Interview
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* In Progress */}
      {inProgress.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">⏳ In Progress</h2>
          <div className="space-y-3">
            {inProgress.map((a: any) => (
              <div key={a.id} className="glass-card p-5 border-amber-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-white">{a.job_title}</p>
                    <p className="text-slate-400 text-sm">{a.department}</p>
                  </div>
                  <Link to={`/assessments/${a.id}/interview`} className="btn-primary flex items-center gap-2">
                    <Play size={14} /> Resume
                  </Link>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Current Progress</span>
                    <span className="text-amber-400 font-medium">{a.progress || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${a.progress || 0}%` }}
                      className="h-full bg-amber-500 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-4">✅ Completed Assessments</h2>
        {loading ? (
          <div className="text-slate-400 text-center py-8">Loading...</div>
        ) : completed.length === 0 ? (
          <div className="glass-card p-8 text-center">
            <ClipboardList className="mx-auto text-slate-600 mb-3" size={40} />
            <p className="text-slate-400">No completed assessments yet.</p>
            <p className="text-slate-500 text-sm mt-1">Your results will appear here after you complete an interview.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((a: any) => (
              <div key={a.id} className="glass-card p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
                    <CheckCircle className="text-emerald-400" size={22} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{a.job_title}</p>
                    <p className="text-slate-400 text-sm">{a.department}</p>
                    {a.overall_score && (
                      <p className="text-sm mt-1">
                        Score: <span className="font-bold text-brand-400">{Math.round(a.overall_score)}%</span>
                        {a.recommendation && <span className={` ml-2 font-medium capitalize ${recColors[a.recommendation]}`}>• {a.recommendation.replace('_', ' ')}</span>}
                      </p>
                    )}
                  </div>
                </div>
                <Link to={`/assessments/${a.id}/report`} className="btn-secondary flex items-center gap-2">
                  <FileText size={14} /> View Report
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
