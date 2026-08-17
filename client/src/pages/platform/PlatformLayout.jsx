import { NavLink, Outlet } from 'react-router-dom'
import { FiShield, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'

// Indigo, not brand-teal, for the console's active/hover accents - a
// deliberate, small palette shift so the Super Admin console reads as
// visually distinct from the tenant dashboard at a glance, without
// resorting to a permanently-dark shell (which broke light mode - see
// below). Kept to nav/accent elements only; content areas (Dashboard,
// AgencyManagement) keep the app's normal Badge/Button/Card tones so
// they stay legible and consistent with the rest of the design system.
const NAV_LINK_CLASS = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-600 text-white'
      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
  }`

export default function PlatformLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="h-0.5 w-full bg-gradient-to-r from-indigo-400 via-indigo-600 to-indigo-400" />
      <div className="border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              <FiShield /> Platform Console
            </span>
            <nav className="flex gap-1">
              <NavLink to="/platform" end className={NAV_LINK_CLASS}>Overview</NavLink>
              <NavLink to="/platform/agencies" className={NAV_LINK_CLASS}>Agencies</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
            <span>{user?.name}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-white"
            >
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
