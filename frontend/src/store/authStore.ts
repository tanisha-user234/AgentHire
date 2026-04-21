import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth as authApi } from '../services/api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'recruiter' | 'candidate';
  firstName: string;
  lastName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(email, password);
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          set({ token, user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authApi.register(data);
          const { token, user } = res.data;
          localStorage.setItem('token', token);
          set({ token, user, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) return;
        try {
          const res = await authApi.me();
          set({ user: res.data, token });
        } catch {
          localStorage.removeItem('token');
          set({ user: null, token: null });
        }
      },

      setUser: (user) => set({ user }),
    }),
    { name: 'auth-storage', partialize: (s) => ({ token: s.token }) }
  )
);
