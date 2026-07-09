import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  isAdmin: boolean;
  fullName?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      error: null,

      login: async (email, password, totpCode) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/auth/login', {
            email,
            password,
            totp_code: totpCode,
          });

          set({
            user: {
              id: response.data.user_id,
              email: response.data.email,
              isAdmin: response.data.is_admin,
            },
            token: response.data.tokens?.access_token,
            refreshToken: response.data.tokens?.refresh_token,
            loading: false,
          });

          api.setAuthToken(response.data.tokens?.access_token);
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Login failed',
            loading: false,
          });
          throw error;
        }
      },

      register: async (email, password, fullName) => {
        set({ loading: true, error: null });
        try {
          await api.post('/auth/register', {
            email,
            password,
            full_name: fullName,
          });
          set({ loading: false });
        } catch (error: any) {
          set({
            error: error.response?.data?.message || 'Registration failed',
            loading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
        });
        api.clearAuthToken();
      },

      checkAuth: async () => {
        const state = get();
        if (!state.token) return;

        try {
          const response = await api.get('/users/profile');
          set({
            user: {
              id: response.data.user_id,
              email: response.data.email,
              isAdmin: response.data.is_admin,
            },
          });
        } catch (error) {
          set({ user: null, token: null });
          api.clearAuthToken();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
);
