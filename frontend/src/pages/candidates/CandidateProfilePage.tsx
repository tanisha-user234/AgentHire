import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { candidates as candidatesApi } from '../../services/api';
import { ArrowLeft, User, Mail, Linkedin, Briefcase, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function CandidateProfilePage() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState<any>(null);

  useEffect(() => {
    if (id) candidatesApi.get(id).then(r => setCandidate(r.data)).catch(console.error);
  }, [id]);

  if (!candidate) return <div className="text-center text-slate-400 py-16">Loading...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/candidates" className="btn-ghost flex items-center gap-2 text-slate-400"><ArrowLeft size={16} /> Candidates</Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <div className="space-y-4">
          <div className="glass-card p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-2xl mx-auto mb-4">
              {candidate.first_name?.[0]}{candidate.last_name?.[0]}
            </div>
            <h2 className="text-xl font-bold text-white">{candidate.first_name} {candidate.last_name}</h2>
            <p className="text-slate-400 text-sm mt-1">{candidate.email}</p>
            {candidate.location && <p className="text-slate-500 text-sm mt-1">{candidate.location}</p>}
            <div className="mt-4 pt-4 border-t border-white/5 text-sm text-slate-400">
              <div className="flex justify-between"><span>Experience</span><span className="text-white">{candidate.experience_years || 0} years</span></div>
              <div className="flex justify-between mt-2"><span>Assessments</span><span className="text-white">{candidate.assessments?.length || 0}</span></div>
            </div>
            {candidate.linkedin_url && (
              <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full mt-4 flex items-center justify-center gap-2">
                <Linkedin size={14} /> LinkedIn
              </a>
            )}
          </div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-white mb-3">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {(candidate.skills || []).map((s: string) => (
                <span key={s} className="px-3 py-1 bg-brand-600/20 text-brand-300 rounded-lg text-sm border border-brand-500/20">{s}</span>
              ))}
              {(!candidate.skills || candidate.skills.length === 0) && <span className="text-slate-500 text-sm">No skills listed</span>}
            </div>
          </div>
        </div>

        {/* Assessments history */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-4">Assessment History</h3>
          {(!candidate.assessments || candidate.assessments.length === 0) ? (
            <div className="glass-card p-8 text-center text-slate-400">No assessments yet</div>
          ) : (
            <div className="space-y-3">
              {candidate.assessments.map((a: any) => (
                <div key={a.id} className="glass-card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{a.job_title}</p>
                      <p className="text-slate-400 text-sm">{a.department}</p>
                      {a.created_at && <p className="text-slate-500 text-xs mt-1">{format(new Date(a.created_at), 'MMM d, yyyy')}</p>}
                    </div>
                    <div className="text-right">
                      {a.overall_score && <div className="text-2xl font-bold text-brand-400">{Math.round(a.overall_score)}<span className="text-sm text-slate-500">%</span></div>}
                      <span className={`badge mt-1 ${a.status === 'completed' ? 'badge-green' : a.status === 'in_progress' ? 'badge-yellow' : 'badge-blue'}`}>{a.status}</span>
                    </div>
                  </div>
                  {a.status === 'completed' && (
                    <div className="mt-3 pt-3 border-t border-white/5 flex gap-2">
                      <Link to={`/assessments/${a.id}/report`} className="btn-secondary text-sm py-1.5">View Report</Link>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
