import { createContext, useContext, useState, useCallback } from 'react'
import * as api from '../api/endpoints'
import { setSession, clearSession, getRefreshToken } from '../api/axios'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const persist = (accessToken, refreshToken, user, remember = true) => {
    setSession(accessToken, refreshToken, remember)
    const store = remember ? localStorage : sessionStorage
    const other = remember ? sessionStorage : localStorage
    store.setItem('user', JSON.stringify(user))
    other.removeItem('user')
    setUser(user)
  }

  // remember defaults to true (today's exact always-localStorage
  // behavior) for every other entry point; only Login.jsx's "Remember
  // me" checkbox ever passes false.
  const login = useCallback(async (credentials, workspace, remember = true) => {
    const { data } = await api.login(credentials, workspace)
    persist(data.accessToken, data.refreshToken, data.user, remember)
    return data.user
  }, [])

  const signup = useCallback(async (payload, workspace) => {
    const { data } = await api.signup(payload, workspace)
    persist(data.accessToken, data.refreshToken, data.user)
    return data.user
  }, [])

  const platformLogin = useCallback(async (credentials) => {
    const { data } = await api.platformLogin(credentials)
    persist(data.accessToken, data.refreshToken, data.user)
    return data.user
  }, [])

  const acceptInvite = useCallback(async (payload) => {
    const { data } = await api.acceptAgentInvite(payload)
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
    <AuthContext.Provider value={{ user, login, signup, platformLogin, acceptInvite, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
