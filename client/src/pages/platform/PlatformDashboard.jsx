import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiHome, FiUsers, FiTrendingUp, FiPieChart, FiCheckCircle, FiClock } from 'react-icons/fi'
import * as api from '../../api/endpoints'
import StatCard from '../../components/StatCard'
import EmptyState from '../../components/EmptyState'
import MonthlyInquiriesLine from '../../components/charts/MonthlyInquiriesLine'
import PlanDistributionPie from '../../components/charts/PlanDistributionPie'
import { formatDate } from '../../utils/format'
import { fadeUp, staggerContainer, staggerItem } from '../../motion/variants'

export default function PlatformDashboard() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    api
      .getPlatformDashboardSummary()
      .then(({ data }) => setSummary(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16">
        <EmptyState title="Couldn't load platform dashboard" message="Please check your connection and try again." />
      </div>
    )
  }

  const { cards, subscriptionBreakdown, platformGrowth, newestAgencies, mostActiveAgencies } = summary

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Cross-tenant statistics across every agency on the platform.</p>
        </div>
        <Link to="/platform/agencies" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Manage Agencies
        </Link>
      </div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.05)}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {[
          { label: 'Total Agencies', value: cards.totalAgencies, icon: <FiUsers /> },
          { label: 'Active Agencies', value: cards.activeAgencies, icon: <FiCheckCircle /> },
          { label: 'Trial Agencies', value: cards.trialAgencies, icon: <FiClock /> },
          { label: 'Suspended', value: cards.suspendedAgencies, icon: <FiClock /> },
          { label: 'Total Properties', value: cards.totalProperties, icon: <FiHome /> },
          { label: 'Total Leads', value: cards.totalLeads, icon: <FiTrendingUp /> },
          { label: 'Hot Leads', value: cards.hotLeads, sub: 'score ≥ 70', icon: <FiTrendingUp /> },
          { label: 'Platform Users', value: cards.totalUsers, icon: <FiPieChart /> },
        ].map((card) => (
          <motion.div key={card.label} variants={staggerItem}>
            <StatCard {...card} />
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-semibold">Agency Growth (by signup month)</h3>
          <MonthlyInquiriesLine data={platformGrowth} />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-2 text-sm font-semibold">Plan Distribution</h3>
          <PlanDistributionPie data={subscriptionBreakdown} />
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold">Newest Agencies</h3>
          {newestAgencies.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No agencies yet</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {newestAgencies.map((a) => (
                <li key={a._id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{a.companyName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{a.slug} · {formatDate(a.createdAt)}</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium capitalize text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                    {a.subscriptionPlan}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <h3 className="mb-3 text-sm font-semibold">Most Active Agencies (by listings)</h3>
          {mostActiveAgencies.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">No listings yet</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {mostActiveAgencies.map((a) => (
                <li key={a.agencyId} className="flex items-center justify-between py-2 text-sm">
                  <p className="font-medium">{a.companyName}</p>
                  <span className="text-gray-500 dark:text-gray-400">{a.propertyCount.toLocaleString()} listings</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  )
}
