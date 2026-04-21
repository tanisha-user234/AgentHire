import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { assessments as assessmentApi } from '../../services/api';
import { Inbox, Brain, Calendar, XCircle, ChevronRight, FileText, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ApplicationRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await assessmentApi.list();
      // Filter for 'applied' status
      const filtered = res.data.filter((a: any) => a.status === 'applied');
      setRequests(filtered);
    } catch (err) {
      toast.error('Failed to load application requests');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await assessmentApi.updateStatus(id, status);
      setRequests(prev => prev.filter(a => a.id !== id));
      setSelectedRequest(null);
      toast.success(status === 'scheduled' ? 'Assessment scheduled!' : 'Application rejected');
    } catch (err: any) {
      console.error('Status update failed:', err.response?.data || err.message);
      toast.error('Failed to update application status');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-brand-600/20 rounded-2xl text-brand-400">
          <Inbox size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Application Requests</h1>
          <p className="text-slate-400 text-sm">Manage new candidate inquiries and AI screenings</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Pending Review ({requests.length})</h3>
          <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-2 custom-scrollbar">
            {requests.map((req) => (
              <motion.div
                key={req.id}
                layoutId={req.id}
                onClick={() => setSelectedRequest(req)}
                className={`glass-card p-4 cursor-pointer transition-all border ${
                  selectedRequest?.id === req.id ? 'border-brand-500/50 bg-brand-500/5 shadow-lg shadow-brand-500/10' : 'border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">{format(new Date(req.created_at), 'MMM d')}</span>
                  {req.screening_score && (
                    <span className="px-2 py-0.5 bg-brand-500/20 text-brand-400 text-[10px] font-bold rounded-lg border border-brand-500/20">
                      {Math.round(req.screening_score)}% Match
                    </span>
                  )}
                </div>
                <h4 className="text-white font-semibold text-sm truncate">{req.candidate_name}</h4>
                <p className="text-slate-400 text-xs truncate">{req.job_title}</p>
              </motion.div>
            ))}
            {loading && <div className="text-slate-500 text-center py-8">Loading requests...</div>}
            {!loading && requests.length === 0 && (
              <div className="text-center py-12 glass-card border-dashed">
                <p className="text-slate-500 text-sm">No new requests found</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedRequest ? (
              <motion.div
                key={selectedRequest.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card p-8 sticky top-24"
              >
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-brand-600/20 flex items-center justify-center text-2xl">
                      {selectedRequest.candidate_name?.[0]}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedRequest.candidate_name}</h2>
                      <p className="text-brand-400 font-medium">Applied for {selectedRequest.job_title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1 uppercase font-bold">AI Screening Score</p>
                    <p className="text-4xl font-bold text-white leading-none">
                      {Math.round(selectedRequest.screening_score)}<span className="text-lg text-brand-400">%</span>
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <FileText size={14} className="text-brand-400" /> Cover Letter
                      </h4>
                      <div className="bg-surface-800/50 rounded-xl p-4 text-sm text-slate-300 leading-relaxed border border-white/5 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {selectedRequest.cover_letter || 'No cover letter provided'}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Brain size={14} className="text-brand-400" /> AI Feedback
                      </h4>
                      <p className="text-sm text-slate-300 italic bg-brand-500/5 border border-brand-500/10 rounded-xl p-4">
                        "{selectedRequest.screening_feedback}"
                      </p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                      <h4 className="text-sm font-bold text-white mb-4">Quick Evaluation</h4>
                      <div className="space-y-4">
                        <button 
                          onClick={() => handleStatusUpdate(selectedRequest.id, 'scheduled')}
                          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
                        >
                          <Calendar size={18} /> Schedule Interview
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(selectedRequest.id, 'cancelled')}
                          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 rounded-xl py-3 font-semibold transition-all flex items-center justify-center gap-2"
                        >
                          <XCircle size={18} /> Reject Application
                        </button>
                      </div>
                    </div>
                    
                    <div className="px-4">
                      <p className="text-[10px] text-slate-500 leading-relaxed">
                        Moving to 'Schedule' will notify the candidate and unlock the live interview interface for the specified job position.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-[400px] glass-card flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <User size={32} className="text-slate-600" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Select a Request</h3>
                <p className="text-slate-500 max-w-sm">
                  Review incoming applications, check match scores, and decide who to move forward to the assessment stage.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
