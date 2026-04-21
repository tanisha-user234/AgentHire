import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import {
  LayoutDashboard, Users, Briefcase, ClipboardList, BarChart3,
  LogOut, Brain, ChevronRight, Bell, User, Inbox
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/assessments', label: 'Assessments', icon: ClipboardList },
  { path: '/requests', label: 'App Requests', icon: Inbox, roles: ['admin', 'recruiter'] },
  { path: '/profile', label: 'My Profile', icon: User, roles: ['admin', 'recruiter', 'candidate'] },
  { path: '/candidates', label: 'Candidates', icon: Users, roles: ['admin', 'recruiter'] },
  { path: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'recruiter'] },
];

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const visibleNav = navItems.filter(item => !item.roles || item.roles.includes(user?.role || ''));

  return (
    <div className="flex h-screen overflow-hidden bg-surface-900">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface-800/80 border-r border-white/5 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-white text-lg leading-none">AgentHire</div>
              <div className="text-xs text-slate-500">AI Assessment</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                 ${isActive ? 'bg-brand-600/20 text-brand-400 border border-brand-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`
              }
            >
              <item.icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              <span className="flex-1">{item.label}</span>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-50 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-slate-500 capitalize">{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 text-sm text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-red-500/10">
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-surface-900/80 backdrop-blur-sm border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl hover:bg-white/5 transition-colors">
              <Bell size={18} className="text-slate-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
            </button>
            <div className="text-sm text-slate-400">
              <span className="font-medium text-slate-300">{user?.firstName}</span>
            </div>
          </div>
        </div>

        {/* Page */}
        <div className="p-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
