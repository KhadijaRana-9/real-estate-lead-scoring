import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FiHome } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext'
import * as api from '../api/endpoints'

export default function Footer() {
  const { user } = useAuth()
  const location = useLocation()

  const isAgentOrAdmin = user && (user.role === 'agent' || user.role === 'agency_admin')

  const agencySlugMatch = location.pathname.match(/^\/agencies\/([^/]+)/)
  const currentAgencySlug = agencySlugMatch && agencySlugMatch[1] !== 'compare' ? agencySlugMatch[1] : null
  const agentLoginTo = currentAgencySlug ? `/login?workspace=${currentAgencySlug}` : '/login'
  const loginLinkLabel = currentAgencySlug ? 'Agent Login' : 'Agency Login'

  // Same branding-resolution rule as Navbar - see its comment for the
  // full rationale (logged-in agent/admin always sees their own agency,
  // anywhere in the app; anonymous visitors see the visited agency's page
  // branding; everyone else sees the platform brand).
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

  const brandName = agencyBrand?.companyName || 'DreamHomes'

  // The authenticated agency workspace excludes the whole platform-
  // marketing link set (Home/Pricing/About/Agencies directory) - none of
  // it belongs inside a private, agency-branded workspace. Anonymous
  // visitors (main platform or a specific agency's public page) keep the
  // full set, with the login link's label/target following whichever
  // context they're in.
  const quickLinks = isAgentOrAdmin
    ? []
    : [
        { label: 'Home', to: '/' },
        { label: 'Pricing', to: '/pricing' },
        { label: 'About', to: '/about' },
        { label: 'Agencies', to: '/agencies' },
        { label: loginLinkLabel, to: agentLoginTo },
      ]

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <div className="h-0.5 w-full bg-gradient-to-r from-brand-400 via-brand-600 to-brand-400" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <Link
            to={currentAgencySlug ? `/agencies/${currentAgencySlug}` : isAgentOrAdmin ? '/dashboard' : '/'}
            className="flex items-center gap-2 text-lg font-bold text-brand-600 dark:text-brand-400"
          >
            {agencyBrand?.logo ? (
              <img src={agencyBrand.logo} alt={brandName} className="h-6 w-6 rounded object-cover" />
            ) : (
              <FiHome />
            )}
            {brandName}
          </Link>
          <p className="mt-2 max-w-xs">
            The complete SaaS platform for real estate agencies — listings, agents, leads, and your own branded workspace.
          </p>
        </div>

        {quickLinks.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700 dark:text-gray-200">Quick Links</p>
            <ul className="mt-3 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="hover:text-brand-600 dark:hover:text-brand-400">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">About</p>
          <p className="mt-3 max-w-xs">
            Built as a portfolio project demonstrating a full listings + lead-scoring workflow, end to end.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 py-4 text-center dark:border-gray-900">
        &copy; {new Date().getFullYear()} {brandName}. All rights reserved.
      </div>
    </footer>
  )
}
