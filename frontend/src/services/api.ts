import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const auth = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
};

// Jobs
export const jobs = {
  list: () => api.get('/jobs'),
  get: (id: string) => api.get(`/jobs/${id}`),
  create: (data: any) => api.post('/jobs', data),
  update: (id: string, data: any) => api.put(`/jobs/${id}`, data),
  delete: (id: string) => api.delete(`/jobs/${id}`),
  apply: (id: string, data?: any) => api.post(`/jobs/${id}/apply`, data),
};

// Candidates
export const candidates = {
  list: () => api.get('/candidates'),
  me: () => api.get('/candidates/me'),
  updateMe: (data: any) => api.put('/candidates/me', data),
  updateRecruiterMe: (data: any) => api.put('/candidates/recruiter/me', data),
  get: (id: string) => api.get(`/candidates/${id}`),
  getRecruiter: (id: string) => api.get(`/candidates/recruiter/${id}`),
  parseResume: (resumeText: string) => api.post('/candidates/me/resume', { resumeText }),
};

// Assessments
export const assessments = {
  list: () => api.get('/assessments'),
  get: (id: string) => api.get(`/assessments/${id}`),
  create: (data: any) => api.post('/assessments', data),
  updateStatus: (id: string, status: string) => api.put(`/assessments/${id}/status`, { status }),
};

// Analytics
export const analytics = {
  overview: () => api.get('/analytics/overview'),
  candidates: () => api.get('/analytics/candidates'),
  recruiters: () => api.get('/analytics/recruiters'),
};

// Agents
export const agentApi = {
  status: () => api.get('/agents/status'),
  deliberations: (assessmentId: string) => api.get(`/agents/deliberations/${assessmentId}`),
};
