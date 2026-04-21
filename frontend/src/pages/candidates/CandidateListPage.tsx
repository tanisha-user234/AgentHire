import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { candidates as candidatesApi } from '../../services/api';
import { Users, Search, ChevronRight } from 'lucide-react';

const recColors: Record<string, string> = {
  strong_hire: 'badge-green', hire: 'badge-blue', maybe: 'badge-yellow', no_hire: 'badge-red',
};

export default function CandidateListPage() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    candidatesApi.list().then(r => setList(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = list.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-header">Candidates</h1>
          <p className="page-subtitle">{list.length} total candidates</p>
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 w-64" placeholder="Search candidates..." />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-16">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Users className="mx-auto text-slate-600 mb-4" size={48} />
          <p className="text-slate-400">No candidates found</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Candidate</th>
                <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Skills</th>
                <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Experience</th>
                <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Assessments</th>
                <th className="text-left text-sm font-medium text-slate-400 px-6 py-4">Latest</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any, i: number) => (
                <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 font-bold text-sm flex-shrink-0">
                        {c.first_name?.[0]}{c.last_name?.[0]}
                      </div>
                      <div>
                        <p className="text-white font-medium">{c.first_name} {c.last_name}</p>
                        <p className="text-slate-500 text-xs">{c.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(c.skills || []).slice(0, 3).map((s: string) => (
                        <span key={s} className="px-2 py-0.5 bg-surface-700 text-slate-400 rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">{c.experience_years || 0} yrs</td>
                  <td className="px-6 py-4 text-slate-300 text-sm">{c.assessment_count || 0}</td>
                  <td className="px-6 py-4">
                    {c.latest_recommendation && (
                      <span className={recColors[c.latest_recommendation] || 'badge-gray'}>
                        {c.latest_recommendation.replace('_', ' ')}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/candidates/${c.id}`} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors inline-block">
                      <ChevronRight size={16} />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
