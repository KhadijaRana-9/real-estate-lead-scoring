import { motion } from 'framer-motion'
import CountUpNumber from './CountUpNumber'

export default function StatCard({ label, value, sub, icon }) {
  const isNumber = typeof value === 'number'

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-brand-400 to-brand-600" />
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
        {icon && <span className="text-lg text-brand-500 dark:text-brand-400">{icon}</span>}
      </div>
      <p className="mt-1 text-2xl font-bold">
        {isNumber ? <CountUpNumber end={value} duration={1.2} /> : value}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </motion.div>
  )
}
