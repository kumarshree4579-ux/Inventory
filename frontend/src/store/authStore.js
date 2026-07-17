import { create } from 'zustand';
import { authAPI } from '../api/services';
import { disconnectSocket } from '../hooks/useSocket';

const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  accessToken: localStorage.getItem('accessToken'),
  loading: false,

  login: async (credentials) => {
    set({ loading: true });
    try {
      const { data } = await authAPI.login(credentials);
      if (data.requireOTP) {
        set({ loading: false });
        return { requireOTP: true, userId: data.userId };
      }
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));
      set({ user: data.user, accessToken: data.accessToken, loading: false });
      return {};
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  logout: async () => {
    await authAPI.logout().catch(() => {});
    disconnectSocket();
    localStorage.clear();
    set({ user: null, accessToken: null });
  },

  can: (module, action) => {
    const { user } = get();
    const permissions = user?.role?.permissions || [];
    return permissions.some(p => p.module === module && p.action === action);
  },
}));

export default useAuthStore;
