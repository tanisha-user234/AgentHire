import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { jobs as jobsApi } from '../../services/api';
import { ArrowLeft, Plus, X } from 'lucide-react';

export default function CreateJobPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', department: '', location: '', description: '',
    salaryMin: '', salaryMax: '', experienceLevel: 'mid', status: 'active',
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await jobsApi.create({
        ...form,
        salaryMin: form.salaryMin ? parseInt(form.salaryMin) : null,
        salaryMax: form.salaryMax ? parseInt(form.salaryMax) : null,
        requirements: { skills },
        assessmentConfig: { agents: ['hiring_manager', 'sme', 'behavioral_analyst'], difficulty: 'medium', timeLimit: 60 },
      });
      navigate('/jobs');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/jobs" className="btn-ghost flex items-center gap-2 text-slate-400"><ArrowLeft size={16} /> Jobs</Link>
      </div>

      <h1 className="page-header">Create Job Position</h1>
      <p className="page-subtitle">Add a new role to start accepting candidates.</p>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 max-w-2xl">
        {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Job Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Senior Frontend Engineer" required />
            </div>
            <div>
              <label className="label">Department</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input-field" placeholder="e.g. Engineering" />
            </div>
            <div>
              <label className="label">Location</label>
              <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="e.g. Remote" />
            </div>
            <div>
              <label className="label">Min Salary ($)</label>
              <input type="number" value={form.salaryMin} onChange={e => setForm({ ...form, salaryMin: e.target.value })} className="input-field" placeholder="80000" />
            </div>
            <div>
              <label className="label">Max Salary ($)</label>
              <input type="number" value={form.salaryMax} onChange={e => setForm({ ...form, salaryMax: e.target.value })} className="input-field" placeholder="120000" />
            </div>
            <div>
              <label className="label">Experience Level</label>
              <select value={form.experienceLevel} onChange={e => setForm({ ...form, experienceLevel: e.target.value })} className="input-field">
                <option value="junior">Junior</option>
                <option value="mid">Mid-Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Job Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" rows={4} placeholder="Describe the role, responsibilities, and what you're looking for..." />
            </div>
            <div className="col-span-2">
              <label className="label">Required Skills</label>
              <div className="flex gap-2 mb-2">
                <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="input-field flex-1" placeholder="e.g. React, TypeScript..." />
                <button type="button" onClick={addSkill} className="btn-secondary px-4"><Plus size={16} /></button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map(s => (
                  <span key={s} className="flex items-center gap-1 px-3 py-1 bg-brand-600/20 text-brand-300 rounded-lg text-sm">
                    {s}
                    <button type="button" onClick={() => setSkills(skills.filter(x => x !== s))} className="hover:text-red-400 transition-colors"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Creating...' : 'Create Job'}</button>
            <Link to="/jobs" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
