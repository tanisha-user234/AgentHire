import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import RecruiterDashboard from './pages/dashboard/RecruiterDashboard';
import CandidateDashboard from './pages/dashboard/CandidateDashboard';
import MyProfilePage from './pages/dashboard/MyProfilePage';
import RecruiterProfilePage from './pages/dashboard/RecruiterProfilePage';
import PublicProfilePage from './pages/profile/PublicProfilePage';
import JobListPage from './pages/jobs/JobListPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import CreateJobPage from './pages/jobs/CreateJobPage';
import CandidateListPage from './pages/candidates/CandidateListPage';
import CandidateProfilePage from './pages/candidates/CandidateProfilePage';
import AssessmentListPage from './pages/assessments/AssessmentListPage';
import ScheduleAssessmentPage from './pages/assessments/ScheduleAssessmentPage';
import LiveInterviewPage from './pages/assessments/LiveInterviewPage';
import AssessmentReportPage from './pages/assessments/AssessmentReportPage';
import ApplicationRequestsPage from './pages/assessments/ApplicationRequestsPage';
import AnalyticsDashboard from './pages/analytics/AnalyticsDashboard';

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user, token } = useAuthStore();
  if (!token) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function DashboardRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'recruiter') return <Navigate to="/recruiter" replace />;
  return <Navigate to="/candidate" replace />;
}

function ProfileRouter() {
  const { user } = useAuthStore();
  if (user?.role === 'recruiter') return <RecruiterProfilePage />;
  if (user?.role === 'admin') return <RecruiterProfilePage />; // Admins use the same profile view/edit for now
  return <MyProfilePage />;
}

export default function App() {
  const checkAuth = useAuthStore(s => s.checkAuth);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 4000, style: { background: '#1e293b', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<DashboardRedirect />} />
          <Route path="dashboard" element={<DashboardRedirect />} />

          <Route path="admin" element={<RequireAuth roles={['admin']}><AdminDashboard /></RequireAuth>} />
          <Route path="recruiter" element={<RequireAuth roles={['admin', 'recruiter']}><RecruiterDashboard /></RequireAuth>} />
          <Route path="candidate" element={<RequireAuth roles={['candidate']}><CandidateDashboard /></RequireAuth>} />
          <Route path="profile" element={<RequireAuth roles={['admin', 'recruiter', 'candidate']}><ProfileRouter /></RequireAuth>} />

          <Route path="jobs" element={<JobListPage />} />
          <Route path="jobs/new" element={<RequireAuth roles={['admin', 'recruiter']}><CreateJobPage /></RequireAuth>} />
          <Route path="jobs/:id" element={<JobDetailPage />} />

          <Route path="candidates" element={<RequireAuth roles={['admin', 'recruiter']}><CandidateListPage /></RequireAuth>} />
          <Route path="candidates/:id" element={<RequireAuth roles={['admin', 'recruiter']}><CandidateProfilePage /></RequireAuth>} />

          <Route path="assessments" element={<AssessmentListPage />} />
          <Route path="assessments/schedule" element={<RequireAuth roles={['admin', 'recruiter']}><ScheduleAssessmentPage /></RequireAuth>} />
          <Route path="assessments/:id/interview" element={<LiveInterviewPage />} />
          <Route path="assessments/:id/report" element={<AssessmentReportPage />} />
          <Route path="requests" element={<RequireAuth roles={['admin', 'recruiter']}><ApplicationRequestsPage /></RequireAuth>} />

          <Route path="analytics" element={<RequireAuth roles={['admin', 'recruiter']}><AnalyticsDashboard /></RequireAuth>} />
          <Route path="profile/:id" element={<PublicProfilePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
