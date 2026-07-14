import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiHome } from 'react-icons/fi'

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="text-7xl">🏚️</div>
        <h1 className="mt-4 text-2xl font-bold">House Lost</h1>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          We couldn't find the page you're looking for. Let's get you home.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          <FiHome /> Go Home
        </Link>
      </motion.div>
    </div>
  )
}
