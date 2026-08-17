import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ roles, children, redirectTo = '/login' }) {
  const { user } = useAuth()
  const location = useLocation()
  const from = `${location.pathname}${location.search}`

  if (!user) return <Navigate to={redirectTo} state={{ from }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to={redirectTo} state={{ from }} replace />

  return children
}
