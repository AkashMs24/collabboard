import { create } from 'zustand';
import api from '../lib/api';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.get('/api/auth/me');
      set({ user: data.user, loading: false });
    } catch {
      localStorage.clear();
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
    return data;
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/api/auth/register', { name, email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
    return data;
  },

  logout: async () => {
    const refresh = localStorage.getItem('refreshToken');
    try { await api.post('/api/auth/logout', { refreshToken: refresh }); } catch {}
    localStorage.clear();
    set({ user: null });
  },
}));
