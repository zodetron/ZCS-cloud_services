import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      tenant: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: (token, tenant) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          setCookie('auth_token', token, 7);
        }
        set({ token, tenant, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          deleteCookie('auth_token');
        }
        set({ token: null, tenant: null, isAuthenticated: false });
      },

      updateTenant: (tenant) => set({ tenant }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, tenant: state.tenant, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Sync cookie with rehydrated token
        if (state?.token && typeof window !== 'undefined') {
          setCookie('auth_token', state.token, 7);
        }
      },
    }
  )
);
