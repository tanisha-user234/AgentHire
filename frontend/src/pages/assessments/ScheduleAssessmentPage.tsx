import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { assessments as assessmentApi, candidates as candidatesApi, jobs as jobsApi } from '../../services/api';
import { ArrowLeft } from 'lucide-react';

export default function ScheduleAssessmentPage() {
  const [candidateList, setCandidateList] = useState<any[]>([]);
  const [jobList, setJobList] = useState<any[]>([]);
  const [form, setForm] = useState({ candidateId: '', jobPositionId: '', scheduledAt: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    candidatesApi.list().then(r => setCandidateList(r.data));
    jobsApi.list().then(r => setJobList(r.data.filter((j: any) => j.status === 'active')));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.candidateId || !form.jobPositionId) { setError('Please select both candidate and job'); return; }
    setLoading(true);
    try {
      const res = await assessmentApi.create(form);
      navigate(`/assessments`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to schedule assessment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/assessments" className="btn-ghost flex items-center gap-2 text-slate-400"><ArrowLeft size={16} /> Assessments</Link>
      </div>
      <h1 className="page-header">Schedule Assessment</h1>
      <p className="page-subtitle">Assign a candidate to a job assessment.</p>

      <div className="glass-card p-8 max-w-lg">
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Candidate *</label>
            <select value={form.candidateId} onChange={e => setForm({ ...form, candidateId: e.target.value })} className="input-field" required>
              <option value="">Select candidate...</option>
              {candidateList.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name} ({c.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Job Position *</label>
            <select value={form.jobPositionId} onChange={e => setForm({ ...form, jobPositionId: e.target.value })} className="input-field" required>
              <option value="">Select position...</option>
              {jobList.map(j => (
                <option key={j.id} value={j.id}>{j.title} — {j.department}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Scheduled Date & Time</label>
            <input type="datetime-local" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} className="input-field" />
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Scheduling...' : 'Schedule Assessment'}</button>
            <Link to="/assessments" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
