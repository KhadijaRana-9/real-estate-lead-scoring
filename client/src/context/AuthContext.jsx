import { createContext, useContext, useState, useCallback } from 'react'
import * as api from '../api/endpoints'
import { setSession, clearSession, getRefreshToken } from '../api/axios'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const persist = (accessToken, refreshToken, user) => {
    setSession(accessToken, refreshToken)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  const login = useCallback(async (credentials) => {
    const { data } = await api.login(credentials)
    persist(data.accessToken, data.refreshToken, data.user)
    return data.user
  }, [])

  const signup = useCallback(async (payload) => {
    const { data } = await api.signup(payload)
    persist(data.accessToken, data.refreshToken, data.user)
    return data.user
  }, [])

  const platformLogin = useCallback(async (credentials) => {
    const { data } = await api.platformLogin(credentials)
    persist(data.accessToken, data.refreshToken, data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    const refreshToken = getRefreshToken()
    clearSession()
    setUser(null)
    // Best-effort server-side revocation; the client-side session is
    // already cleared regardless of whether this call succeeds.
    if (refreshToken) {
      api.logout({ refreshToken }).catch(() => {})
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, signup, platformLogin, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
