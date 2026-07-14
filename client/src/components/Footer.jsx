import { Link } from 'react-router-dom'
import { FiHome } from 'react-icons/fi'

const QUICK_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Properties', to: '/listings' },
  { label: 'About', to: '/about' },
  { label: 'Sign Up', to: '/signup' },
  { label: 'Agent Login', to: '/login' },
]

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-200 bg-white text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <div className="h-0.5 w-full bg-gradient-to-r from-brand-400 via-brand-600 to-brand-400" />
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-600 dark:text-brand-400">
            <FiHome /> DreamHomes
          </Link>
          <p className="mt-2 max-w-xs">
            Find your next home, faster — verified listings and direct agent connections across Pakistan.
          </p>
        </div>

        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">Quick Links</p>
          <ul className="mt-3 space-y-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-brand-600 dark:hover:text-brand-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-semibold text-gray-700 dark:text-gray-200">About</p>
          <p className="mt-3 max-w-xs">
            Built as a portfolio project demonstrating a full listings + lead-scoring workflow, end to end.
          </p>
        </div>
      </div>

      <div className="border-t border-gray-100 py-4 text-center dark:border-gray-900">
        &copy; {new Date().getFullYear()} DreamHomes. All rights reserved.
      </div>
    </footer>
  )
}
