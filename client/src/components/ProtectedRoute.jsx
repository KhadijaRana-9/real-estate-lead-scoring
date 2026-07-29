import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles, children, redirectTo = '/login' }) {
  const { user } = useAuth()

  if (!user) return <Navigate to={redirectTo} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={redirectTo} replace />

  return children
}
