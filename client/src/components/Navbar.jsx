import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiHome, FiSun, FiMoon, FiMenu, FiX } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import * as api from '../api/endpoints'

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
  const location = useLocation()
  const [dark, setDark] = useDarkMode()
  const [menuOpen, setMenuOpen] = useState(false)
  const scrolled = useScrolled()

  const isAgentOrAdmin = user && (user.role === 'agent' || user.role === 'agency_admin')

  // When the visitor is currently on a specific agency's own page (its
  // public profile or apply page - never the /agencies/compare route,
  // which isn't a slug), Agent Login carries that workspace explicitly
  // rather than relying on the login form's identity-based fallback -
  // "don't use the platform default agency as a silent fallback when the
  // agent's workspace is known" (see resolveTenant.js's allowDefaultFallback
  // and auth.service.js's login(), fixed separately). Off an agency page,
  // there's no specific workspace to know, so this links to plain /login,
  // which already resolves a correct password by identity instead of ever
  // guessing a default agency - the fix that makes this safe.
  const agencySlugMatch = location.pathname.match(/^\/agencies\/([^/]+)/)
  const currentAgencySlug = agencySlugMatch && agencySlugMatch[1] !== 'compare' ? agencySlugMatch[1] : null
  const agentLoginTo = currentAgencySlug ? `/login?workspace=${currentAgencySlug}` : '/login'
  // Agents enter through a specific agency's own public page, not the main
  // DreamHomes platform - so the label (not just the href) reflects which
  // one is being offered here.
  const loginLinkLabel = currentAgencySlug ? 'Agent Login' : 'Agency Login'

  // Branding follows whichever agency context is active: a logged-in
  // agent/agency_admin always sees THEIR OWN agency's name+logo, anywhere
  // in the app (dashboard included) - never the generic platform brand,
  // and never another agency's, even while browsing a public /agencies/:slug
  // page (e.g. via "View as Customer"). An anonymous/customer visitor on a
  // specific agency's public page sees that agency's branding. Everyone
  // else (anonymous on platform pages, super_admin) sees the platform
  // "DreamHomes" brand. Cleared immediately on any context change, not
  // just on fetch resolution, so the header never shows a stale agency.
  const [agencyBrand, setAgencyBrand] = useState(null)
  useEffect(() => {
    let cancelled = false
    setAgencyBrand(null)
    if (isAgentOrAdmin) {
      api
        .getDashboardSummary()
        .then(({ data }) => !cancelled && setAgencyBrand({ companyName: data.agencyName, logo: data.agencyLogo }))
        .catch(() => {})
    } else if (currentAgencySlug) {
      api
        .getAgencyProfile(currentAgencySlug)
        .then(({ data }) => !cancelled && setAgencyBrand({ companyName: data.companyName, logo: data.logo }))
        .catch(() => {})
    }
    return () => {
      cancelled = true
    }
  }, [isAgentOrAdmin, currentAgencySlug])

  // The private agency workspace deliberately excludes a link back to the
  // public /agencies directory - that's platform-marketing navigation for
  // unauthenticated visitors, not part of an authenticated agent/admin's
  // own workspace.
  const navLinks = isAgentOrAdmin
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/dashboard?tab=My%20Listings', label: 'Listings' },
        { to: '/dashboard?tab=Leads', label: 'Leads' },
      ]
    : user?.role === 'super_admin'
      ? [{ to: '/platform', label: 'Platform Console' }]
      : [
          { to: '/pricing', label: 'Pricing' },
          { to: '/agencies', label: 'Agencies' },
          { to: '/about', label: 'About' },
        ]

  // Exact match on pathname AND the query params the link cares about -
  // string-prefix/pathname-only matching is what let '/dashboard',
  // '/dashboard?tab=My%20Listings', and '/dashboard?tab=Leads' all read
  // as "active" simultaneously (they share the same pathname; only the
  // tab query param differs). A link with no query is only active when
  // the current URL has no tab param either, so "Dashboard" doesn't stay
  // lit while on the Leads tab.
  const isLinkActive = (to) => {
    const [linkPath, linkQuery] = to.split('?')
    if (location.pathname !== linkPath) return false
    const currentTab = new URLSearchParams(location.search).get('tab')
    const linkTab = linkQuery ? new URLSearchParams(linkQuery).get('tab') : null
    return currentTab === linkTab
  }

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
        <Link
          to={currentAgencySlug ? `/agencies/${currentAgencySlug}` : isAgentOrAdmin ? '/dashboard' : '/'}
          className="flex items-center gap-2 text-xl font-bold text-brand-600 dark:text-brand-400"
        >
          {agencyBrand?.logo ? (
            <img src={agencyBrand.logo} alt={agencyBrand.companyName} className="h-7 w-7 rounded object-cover" />
          ) : (
            <motion.span
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <FiHome />
            </motion.span>
          )}
          {agencyBrand?.companyName || 'DreamHomes'}
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {navLinks.map((link) => {
            const isActive = isLinkActive(link.to)
            return (
              <Link key={link.to} to={link.to} className="group relative py-1">
                <span className={isActive ? 'text-brand-600 dark:text-brand-400' : 'group-hover:text-brand-600 dark:group-hover:text-brand-400'}>
                  {link.label}
                </span>
                <span
                  className={`absolute -bottom-0.5 left-0 h-0.5 w-full origin-left scale-x-0 bg-brand-600 transition-transform duration-200 group-hover:scale-x-100 dark:bg-brand-400 ${
                    isActive ? 'scale-x-100' : ''
                  }`}
                />
              </Link>
            )
          })}
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
              <Link to={agentLoginTo} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800">
                {loginLinkLabel}
              </Link>
              <Link to="/pricing">
                <motion.span
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 hover:shadow-md hover:shadow-brand-600/40"
                >
                  Get Started
                </motion.span>
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
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={isLinkActive(link.to) ? 'text-brand-600 dark:text-brand-400' : ''}
              >
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
                <Link to={agentLoginTo} onClick={() => setMenuOpen(false)} className="text-gray-600 dark:text-gray-300">{loginLinkLabel}</Link>
                <Link to="/pricing" onClick={() => setMenuOpen(false)}>Get Started</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
