import { create } from 'zustand'

interface AuthUser {
  id: number
  username: string
  email: string
  shopId: number | null
}

interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  setToken: (accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),

  setToken: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    set({ accessToken })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    set({ user: null, accessToken: null })
  },

  isAuthenticated: () => !!get().accessToken,
}))
