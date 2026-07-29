import { NavLink, Outlet } from 'react-router-dom'
import { FiShield, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'

const NAV_LINK_CLASS = ({ isActive }) =>
  `rounded-lg px-3 py-1.5 text-sm font-medium ${
    isActive ? 'bg-brand-600 text-white' : 'text-gray-300 hover:bg-gray-800'
  }`

export default function PlatformLayout() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-brand-400">
              <FiShield /> Platform Console
            </span>
            <nav className="flex gap-1">
              <NavLink to="/platform" end className={NAV_LINK_CLASS}>Overview</NavLink>
              <NavLink to="/platform/agencies" className={NAV_LINK_CLASS}>Agencies</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{user?.name}</span>
            <button onClick={logout} className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-gray-800 hover:text-white">
              <FiLogOut /> Logout
            </button>
          </div>
        </div>
      </div>
      <Outlet />
    </div>
  )
}
