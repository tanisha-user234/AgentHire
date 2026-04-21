import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { assessments as assessmentApi } from '../../services/api';
import { ArrowLeft, User, Brain, TrendingUp, AlertTriangle, CheckCircle, ThumbsDown, MessageSquare } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

const agentConfig: Record<string, { name: string; avatar: string; color: string; bgColor: string }> = {
  hiring_manager: { name: 'Hiring Manager', avatar: '👩‍💼', color: 'text-brand-400', bgColor: 'bg-brand-600/20' },
  sme: { name: 'Technical Expert', avatar: '👨‍💻', color: 'text-cyan-400', bgColor: 'bg-cyan-600/20' },
  behavioral_analyst: { name: 'Behavioral Analyst', avatar: '🧠', color: 'text-amber-400', bgColor: 'bg-amber-600/20' },
};

const recConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  strong_hire: { label: 'Strong Hire', color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/30', icon: CheckCircle },
  hire: { label: 'Hire', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30', icon: CheckCircle },
  maybe: { label: 'Maybe', color: 'text-amber-400', bg: 'bg-amber-500/20 border-amber-500/30', icon: AlertTriangle },
  no_hire: { label: 'No Hire', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30', icon: ThumbsDown },
};

export default function AssessmentReportPage() {
  const { id } = useParams();
  const [assessment, setAssessment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) assessmentApi.get(id).then(r => setAssessment(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center text-slate-400 py-16">Loading report...</div>;
  if (!assessment) return <div className="text-center text-red-400 py-16">Assessment not found</div>;

  const rec = recConfig[assessment.recommendation] || { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-500/20 border-slate-500/30', icon: Brain };
  const RecIcon = rec.icon;

  // Build radar data from all evaluations
  const allScoreEntries: { label: string; value: number }[] = [];
  assessment.evaluations?.forEach((e: any) => {
    Object.entries(e.scores || {}).forEach(([k, v]) => {
      allScoreEntries.push({ label: k.replace(/_/g, ' '), value: v as number });
    });
  });

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/assessments" className="btn-ghost flex items-center gap-2 text-slate-400"><ArrowLeft size={16} /> Assessments</Link>
      </div>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Assessment Report</h1>
            <p className="text-slate-400">{assessment.job_title} • {assessment.department}</p>
            <p className="text-slate-500 text-sm mt-1">Candidate: {assessment.candidate_name}</p>
          </div>
          <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl border ${rec.bg}`}>
            <RecIcon className={rec.color} size={28} />
            <div>
              <p className="text-xs text-slate-400">Recommendation</p>
              <p className={`text-xl font-bold ${rec.color}`}>{rec.label}</p>
            </div>
          </div>
        </div>

        {assessment.overall_score && (
          <div className="mt-6 pt-6 border-t border-white/5">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-5xl font-bold text-white">{Math.round(assessment.overall_score)}<span className="text-2xl text-slate-400">%</span></p>
                <p className="text-slate-400 text-sm mt-1">Overall Score</p>
              </div>
              <div className="flex-1">
                <div className="h-3 bg-surface-700 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${assessment.overall_score}%` }} transition={{ duration: 1, delay: 0.3 }}
                    className="h-full rounded-full bg-gradient-to-r from-brand-600 to-purple-500" />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1"><span>0</span><span>50</span><span>100</span></div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Application Details (Cover Letter & Meta) */}
      {(assessment.cover_letter || (assessment.application_meta && Object.keys(assessment.application_meta).length > 0)) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 mb-6 border-brand-500/10">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <FileText size={20} className="text-brand-400" />
            Application Details
          </h3>
          
          {assessment.cover_letter && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Cover Letter</h4>
              <div className="bg-surface-800/50 rounded-xl p-5 text-slate-300 text-sm leading-relaxed border border-white/5 whitespace-pre-wrap">
                {assessment.cover_letter}
              </div>
            </div>
          )}

          {assessment.application_meta && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {assessment.application_meta.interestReason && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Motivation</h4>
                  <p className="text-slate-300 text-sm italic">"{assessment.application_meta.interestReason}"</p>
                </div>
              )}
              {assessment.application_meta.relevantExperience && (
                <div>
                  <h4 className="text-sm font-medium text-slate-400 mb-2 uppercase tracking-wider">Relevant Background</h4>
                  <p className="text-slate-300 text-sm italic">"{assessment.application_meta.relevantExperience}"</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* Radar + Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {allScoreEntries.length > 0 && (
          <div className="glass-card p-6">
            <h3 className="font-semibold text-white mb-4">Score Breakdown</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={allScoreEntries}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar dataKey="value" fill="#6366f1" fillOpacity={0.3} stroke="#6366f1" />
                <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', color: '#e2e8f0', fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Agent Deliberations */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2"><MessageSquare size={16} /> Agent Deliberations</h3>
          <div className="space-y-3 max-h-[220px] overflow-y-auto">
            {(assessment.deliberations || []).map((d: any, i: number) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-1.5 text-xs mb-1">
                  <span className="text-brand-400 capitalize">{d.from_agent.replace('_', ' ')}</span>
                  <span className="text-slate-600">→</span>
                  <span className="text-amber-400 capitalize">{d.to_agent.replace('_', ' ')}</span>
                </div>
                <p className="text-slate-300 bg-surface-700/50 rounded-lg p-2 text-xs">{d.message}</p>
              </div>
            ))}
            {(!assessment.deliberations || assessment.deliberations.length === 0) && (
              <p className="text-slate-500 text-sm">No deliberations recorded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Agent evaluations */}
      <div className="space-y-4">
        {(assessment.evaluations || []).map((evalItem: any) => {
          const agent = agentConfig[evalItem.agent_role];
          if (!agent) return null;
          return (
            <motion.div key={evalItem.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${agent.bgColor} flex items-center justify-center text-xl`}>{agent.avatar}</div>
                <div>
                  <h3 className={`font-semibold ${agent.color}`}>{agent.name}</h3>
                  <p className="text-xs text-slate-500">Evaluation by AI Agent</p>
                </div>
              </div>

              {/* Scores */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {Object.entries(evalItem.scores || {}).map(([k, v]: [string, any]) => (
                  <div key={k} className="bg-surface-700/50 rounded-xl p-3 text-center">
                    <div className="text-2xl font-bold text-white">{v}</div>
                    <div className="text-xs text-slate-400 mt-0.5 capitalize">{k.replace(/_/g, ' ')}</div>
                    <div className="h-1 bg-surface-600 rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full" style={{ width: `${v}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {evalItem.observations && <p className="text-slate-300 text-sm mb-4 leading-relaxed">{evalItem.observations}</p>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evalItem.strengths?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">✓ Strengths</h4>
                    <ul className="space-y-1">
                      {evalItem.strengths.map((s: string) => <li key={s} className="text-sm text-slate-300 flex items-start gap-1.5"><span className="text-emerald-500 mt-0.5">•</span>{s}</li>)}
                    </ul>
                  </div>
                )}
                {evalItem.weaknesses?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">⚠ Areas to Improve</h4>
                    <ul className="space-y-1">
                      {evalItem.weaknesses.map((w: string) => <li key={w} className="text-sm text-slate-300 flex items-start gap-1.5"><span className="text-amber-500 mt-0.5">•</span>{w}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {(!assessment.evaluations || assessment.evaluations.length === 0) && (
          <div className="glass-card p-8 text-center text-slate-400">
            {assessment.status === 'completed' ? 'No evaluations found.' : 'Assessment in progress. Evaluations will appear after completion.'}
          </div>
        )}
      </div>

      {/* Conversation History */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-brand-400" />
          Full Conversation History
        </h3>
        <div className="glass-card p-6 space-y-6">
          {assessment.sessions && assessment.sessions.length > 0 ? (
            assessment.sessions.map((session: any) => (
              <div key={session.id} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                  <span className="text-lg">{agentConfig[session.agent_role]?.avatar}</span>
                  <span className={`font-semibold ${agentConfig[session.agent_role]?.color}`}>
                    {agentConfig[session.agent_role]?.name}
                  </span>
                  <span className="text-slate-500 text-xs">— {agentConfig[session.agent_role]?.name === 'Hiring Manager' ? 'Initial phase' : 'Technical/Behavioral phase'}</span>
                </div>
                <div className="space-y-3">
                  {session.conversation_history?.map((msg: any, i: number) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                        msg.role === 'user' 
                          ? 'bg-brand-600/20 text-white border border-brand-500/20 rounded-tr-sm' 
                          : 'bg-surface-700/50 text-slate-200 border border-white/5 rounded-tl-sm'
                      }`}>
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">No conversation logs found.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
