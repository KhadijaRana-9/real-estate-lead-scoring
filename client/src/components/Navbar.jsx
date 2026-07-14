import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiHome, FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, setDark]
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return scrolled
}

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dark, setDark] = useDarkMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useScrolled()

  const isAgentOrAdmin = user && (user.role === 'agent' || user.role === 'admin')

  const navLinks = isAgentOrAdmin
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/dashboard?tab=My%20Listings', label: 'Listings' },
        { to: '/dashboard?tab=Leads', label: 'Leads' },
      ]
    : [
        { to: '/listings', label: 'Buy' },
        { to: '/signup', label: 'For Agents' },
        { to: '/about', label: 'About' },
      ]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-all duration-300 ${
        scrolled
          ? 'border-gray-200 bg-white/80 shadow-sm backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/80'
          : 'border-transparent bg-white/40 backdrop-blur-sm dark:bg-gray-950/40'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-brand-600 dark:text-brand-400">
          <FiHome /> DreamHomes
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} className="hover:text-brand-600 dark:hover:text-brand-400">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-4 md:flex">
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle dark mode"
            className="rounded-full p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {dark ? <FiSun /> : <FiMoon />}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 dark:text-gray-300">Hi, {user.name.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800">
                Login
              </Link>
              <Link to="/signup" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                Sign Up
              </Link>
            </div>
          )}
        </div>

        <button className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
          {menuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-gray-200 px-4 py-3 md:hidden dark:border-gray-800">
          <div className="flex flex-col gap-3 text-sm font-medium">
            {navLinks.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <button className="text-left" onClick={() => setDark((d) => !d)}>
              {dark ? 'Light mode' : 'Dark mode'}
            </button>
            {user ? (
              <button className="text-left" onClick={handleLogout}>Logout</button>
            ) : (
              <>
                <Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
