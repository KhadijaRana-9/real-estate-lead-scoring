import { createContext, useContext, useState, useCallback } from 'react'
import * as api from '../api/endpoints'

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

  const persist = (token, user) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
  }

  const login = useCallback(async (credentials) => {
    const { data } = await api.login(credentials)
    persist(data.token, data.user)
    return data.user
  }, [])

  const signup = useCallback(async (payload) => {
    const { data } = await api.signup(payload)
    persist(data.token, data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
