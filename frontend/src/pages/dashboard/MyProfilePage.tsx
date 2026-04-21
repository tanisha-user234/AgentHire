import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { candidates as candidatesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { User, Mail, Phone, MapPin, Linkedin, Save, Plus, X, FileText, Loader2, Brain, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MyProfilePage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [profile, setProfile] = useState<any>({
    firstName: '',
    lastName: '',
    phone: '',
    location: '',
    linkedinUrl: '',
    about: '',
    skills: [],
    experienceYears: 0,
  });
  const [newSkill, setNewSkill] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [showResumeInput, setShowResumeInput] = useState(false);

  useEffect(() => {
    candidatesApi.me().then(r => {
      const d = r.data;
      setProfile({
        firstName: d.first_name || '',
        lastName: d.last_name || '',
        phone: d.phone || '',
        location: d.location || '',
        linkedinUrl: d.linkedin_url || '',
        about: d.about || '',
        skills: d.skills || [],
        experienceYears: d.experience_years || 0,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await candidatesApi.updateMe(profile);
      const updatedCandidate = res.data;
      
      // Update local auth store if names changed
      if (user) {
        setUser({
          ...user,
          firstName: profile.firstName,
          lastName: profile.lastName,
        });
      }
      
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error('Failed to update profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSkill = () => {
    if (newSkill && !profile.skills.includes(newSkill)) {
      setProfile({ ...profile, skills: [...profile.skills, newSkill] });
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setProfile({ ...profile, skills: profile.skills.filter((s: string) => s !== skill) });
  };

  const handleParseResume = async () => {
    if (!resumeText.trim()) return;
    setParsing(true);
    try {
      const res = await candidatesApi.parseResume(resumeText);
      const parsed = res.data.data;
      
      setProfile(prev => ({
        ...prev,
        skills: [...new Set([...prev.skills, ...(parsed.skills || [])])],
        experienceYears: parsed.experience_years || prev.experienceYears,
        about: parsed.summary || prev.about,
      }));
      
      setShowResumeInput(false);
      setResumeText('');
      toast.success('Resume parsed successfully! Review and save your updated profile.');
    } catch (err) {
      toast.error('Failed to parse resume');
      console.error(err);
    } finally {
      setParsing(false);
    }
  };

  if (loading) return <div className="text-slate-400 text-center py-16">Loading profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <User className="text-brand-400" /> My Profile
        </h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Personal Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">First Name</label>
                <input type="text" value={profile.firstName} onChange={e => setProfile({...profile, firstName: e.target.value})}
                  className="w-full bg-surface-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Last Name</label>
                <input type="text" value={profile.lastName} onChange={e => setProfile({...profile, lastName: e.target.value})}
                  className="w-full bg-surface-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Phone Number</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})}
                    className="w-full bg-surface-800 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Location</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" value={profile.location} onChange={e => setProfile({...profile, location: e.target.value})}
                    className="w-full bg-surface-800 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50" />
                </div>
              </div>
            </div>
            
            <div className="mt-4 space-y-1.5">
              <label className="text-xs text-slate-400">About / Professional Bio</label>
              <textarea value={profile.about} onChange={e => setProfile({...profile, about: e.target.value})}
                placeholder="Tell us about your professional background, goals, and what makes you a great candidate..."
                className="w-full bg-surface-800 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500/50 min-h-[120px] resize-none" />
            </div>
          </div>

          {/* Resume Parsing */}
          <div className="glass-card p-6 border-brand-500/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Brain className="text-brand-400" size={20} /> AI Resume Assistant
                </h2>
                <p className="text-slate-400 text-xs mt-1">Paste your resume text to automatically update your skills and profile.</p>
              </div>
              <button onClick={() => setShowResumeInput(!showResumeInput)} className="btn-secondary py-1.5 text-xs">
                {showResumeInput ? 'Cancel' : 'Paste Resume'}
              </button>
            </div>

            {showResumeInput && (
              <div className="space-y-3">
                <textarea value={resumeText} onChange={e => setResumeText(e.target.value)}
                  placeholder="Paste your full resume text here..."
                  className="w-full bg-surface-900 border border-white/5 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-500/50 min-h-[200px] resize-none" />
                <button onClick={handleParseResume} disabled={parsing || !resumeText.trim()}
                  className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                  {parsing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
                  Parse with AI
                </button>
              </div>
            )}
            
            {!showResumeInput && (
              <div className="bg-surface-800/50 rounded-xl p-4 flex items-center gap-4 text-sm text-slate-400 border border-white/5">
                <div className="w-10 h-10 rounded-full bg-brand-600/10 flex items-center justify-center shrink-0">
                  <FileText className="text-brand-400" size={18} />
                </div>
                <div>
                  <span className="text-white font-medium">Keep your profile updated</span>
                  <p className="text-xs">Using AI parsing helps our interview agents know you better.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Professional Link</h2>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400">LinkedIn URL</label>
              <div className="relative">
                <Linkedin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input type="text" value={profile.linkedinUrl} onChange={e => setProfile({...profile, linkedinUrl: e.target.value})}
                  className="w-full bg-surface-800 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50" />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <label className="text-xs text-slate-400">Experience (Years)</label>
              <input type="number" value={profile.experienceYears} onChange={e => setProfile({...profile, experienceYears: parseInt(e.target.value) || 0})}
                className="w-full bg-surface-800 border border-white/5 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50" />
            </div>
          </div>

          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Skills</h2>
            <div className="flex gap-2 mb-4">
              <input type="text" value={newSkill} onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                placeholder="Add skill..."
                className="flex-1 bg-surface-800 border border-white/5 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-brand-500/50" />
              <button onClick={handleAddSkill} className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((s: string) => (
                <span key={s} className="px-2 py-1 bg-brand-600/10 text-brand-400 rounded-lg text-xs border border-brand-500/20 flex items-center gap-1.5">
                  {s}
                  <button onClick={() => handleRemoveSkill(s)} className="hover:text-white transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {profile.skills.length === 0 && <p className="text-slate-500 text-xs italic">No skills added yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
