import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, FileText, HelpCircle, Loader2, Brain } from 'lucide-react';

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { coverLetter: string; metaData: any }) => Promise<void>;
  jobTitle: string;
}

export default function ApplicationModal({ isOpen, onClose, onApply, jobTitle }: ApplicationModalProps) {
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [interestReason, setInterestReason] = useState('');
  const [experience, setExperience] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim()) return;
    
    setSubmitting(true);
    try {
      await onApply({
        coverLetter,
        resumeText,
        metaData: {
          interestReason,
          relevantExperience: experience,
          submittedAt: new Date().toISOString(),
        }
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="glass-card w-full max-w-2xl p-8 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600/20 flex items-center justify-center">
                  <FileText className="text-brand-400" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Complete Application</h2>
                  <p className="text-slate-400 text-sm">{jobTitle}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <Brain size={14} className="text-brand-400" />
                  Full Resume Text
                </label>
                <textarea
                  required
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Paste your resume content here for AI screening..."
                  className="w-full bg-surface-900/50 border border-white/5 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[150px] text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                  <FileText size={14} className="text-brand-400" />
                  Cover Letter
                </label>
                <textarea
                  required
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Tell us why you're a great fit for this role..."
                  className="w-full bg-surface-900/50 border border-white/5 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[150px] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <HelpCircle size={14} className="text-amber-400" />
                    Why are you interested?
                  </label>
                  <textarea
                    required
                    value={interestReason}
                    onChange={(e) => setInterestReason(e.target.value)}
                    placeholder="Briefly explain your motivation..."
                    className="w-full bg-surface-900/50 border border-white/5 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[100px] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <HelpCircle size={14} className="text-cyan-400" />
                    Relevant Experience
                  </label>
                  <textarea
                    required
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="Highlight your most relevant background..."
                    className="w-full bg-surface-900/50 border border-white/5 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50 min-h-[100px] text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 btn-secondary py-3 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-[2] btn-primary py-3 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-brand-600/20"
                >
                  {submitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                  Submit Application
                </button>
              </div>
            </form>
            
            <p className="text-[10px] text-slate-500 mt-6 text-center leading-tight">
              By submitting, your profile, resume, and these answers will be shared with the hiring recruiter.
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
