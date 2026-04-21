import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { Brain, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const quickLogin = async (role: string) => {
    const creds: Record<string, { email: string; pass: string }> = {
      admin: { email: 'admin@demo.com', pass: 'password123' },
      recruiter: { email: 'recruiter@demo.com', pass: 'password123' },
      candidate: { email: 'candidate@demo.com', pass: 'password123' },
    };
    const c = creds[role];
    setEmail(c.email); setPassword(c.pass);
    try { await login(c.email, c.pass); navigate('/'); } catch {}
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">AgentHire</h1>
          <p className="text-slate-400 mt-1">AI-Powered Candidate Assessment</p>
        </div>

        <div className="glass-card p-8">
          <h2 className="text-xl font-bold text-white mb-6">Sign in to your account</h2>

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input-field pl-10" placeholder="you@example.com" required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)}
                  className="input-field pl-10" placeholder="••••••••" required />
              </div>
            </div>
            <button id="login-btn" type="submit" disabled={isLoading} className="btn-primary w-full">
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-xs text-slate-500 text-center mb-3">Quick Demo Access</div>
            <div className="grid grid-cols-3 gap-2">
              {['admin', 'recruiter', 'candidate'].map(role => (
                <button key={role} onClick={() => quickLogin(role)}
                  className="text-xs py-2 px-3 rounded-lg bg-surface-700 hover:bg-surface-600 text-slate-300 hover:text-white transition-all capitalize border border-white/5">
                  {role}
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Register</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
