import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { candidates as candidatesApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { User, Mail, Save, Loader2, Shield, Building } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RecruiterProfilePage() {
  const { user, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: 'Acme Inc.', // Placeholder for now
  });

  useEffect(() => {
    // We can reuse the auth/me or create a specific recruiter fetch
    if (user) {
      setProfile({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        company: 'Acme Inc.',
      });
      setLoading(false);
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await candidatesApi.updateRecruiterMe({
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      
      const updated = res.data;
      if (user) {
        setUser({
          ...user,
          firstName: updated.first_name,
          lastName: updated.last_name,
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

  if (loading) return <div className="text-slate-400 text-center py-16">Loading profile...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Shield className="text-brand-400" /> Recruiter Profile
        </h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      <div className="glass-card p-8">
        <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
          <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex items-center justify-center text-2xl">
            🤝
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{profile.firstName} {profile.lastName}</h2>
            <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
              <Mail size={14} /> {profile.email}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">First Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={profile.firstName} 
                  onChange={e => setProfile({...profile, firstName: e.target.value})}
                  className="w-full bg-surface-800 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50" 
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-medium">Last Name</label>
              <div className="relative">
                <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input 
                  type="text" 
                  value={profile.lastName} 
                  onChange={e => setProfile({...profile, lastName: e.target.value})}
                  className="w-full bg-surface-800 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-brand-500/50" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-slate-400 font-medium">Company Name</label>
            <div className="relative">
              <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                value={profile.company} 
                disabled
                className="w-full bg-surface-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-500" 
              />
            </div>
            <p className="text-[10px] text-slate-500">Company settings are managed by your organization administrator.</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 bg-brand-600/5 border-brand-500/10">
        <h3 className="font-semibold text-white mb-2">Recruitment Overview</h3>
        <p className="text-sm text-slate-400 leading-relaxed text-justify">
          You are currently managing active job listings and candidate assessments. Your profile information is visible to candidates when they view jobs you have posted.
        </p>
      </div>
    </div>
  );
}
