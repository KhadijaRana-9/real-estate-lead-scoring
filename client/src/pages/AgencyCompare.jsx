import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCheckCircle, FiArrowLeft } from 'react-icons/fi'
import * as api from '../api/endpoints'
import EmptyState from '../components/EmptyState'
import ScrollReveal from '../components/ScrollReveal'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'

const ROWS = [
  { label: 'Trust Score', get: (a) => a.stats.trustScore },
  { label: 'Rating', get: (a) => (a.stats.reviewCount ? `${a.stats.rating} (${a.stats.reviewCount} reviews)` : 'No reviews yet') },
  { label: 'Active Listings', get: (a) => a.stats.activeListings },
  { label: 'Sold Properties', get: (a) => a.stats.soldProperties },
  { label: 'Agents', get: (a) => a.stats.activeAgents },
  { label: 'Followers', get: (a) => a.stats.followerCount },
  { label: 'Total Views', get: (a) => a.stats.totalViews.toLocaleString() },
  { label: 'Established', get: (a) => a.establishedYear || '—' },
  { label: 'City', get: (a) => a.city || '—' },
  { label: 'Verified', get: (a) => a.verified },
  { label: 'Plan', get: (a) => a.subscriptionPlan },
]

const PLAN_TONE = { trial: 'warning', starter: 'info', professional: 'brand', enterprise: 'success' }

function CompareSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="mb-6 h-8 w-56 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex gap-6 border-b border-gray-200 p-4 dark:border-gray-800">
          <div className="h-4 w-16 shrink-0 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="h-14 w-14 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-3 w-20 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-6 border-b border-gray-100 p-4 last:border-0 dark:border-gray-800/60">
            <div className="h-3 w-16 shrink-0 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="h-3 flex-1 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AgencyCompare() {
  const [searchParams] = useSearchParams()
  const slugs = (searchParams.get('slugs') || '').split(',').filter(Boolean)
  const [agencies, setAgencies] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (slugs.length < 2) return
    api.compareAgencies(slugs).then(({ data }) => setAgencies(data)).catch(() => setError(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  if (slugs.length < 2) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <EmptyState title="Select at least 2 agencies" message="Add agencies to compare from the marketplace first." action={<Link to="/agencies" className="text-brand-600 hover:underline dark:text-brand-400">Browse Agencies</Link>} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16">
        <EmptyState title="Couldn't load comparison" message="One or more agencies may no longer exist." />
      </div>
    )
  }

  if (!agencies) {
    return <CompareSkeleton />
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/agencies" className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-brand-600 dark:text-gray-400">
        <FiArrowLeft size={14} /> Back to Agencies
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Compare Agencies</h1>

      <ScrollReveal className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm dark:border-gray-800">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="p-4 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Agency</th>
              {agencies.map((a) => (
                <th key={a._id} className="p-4 text-center">
                  <Link to={`/agencies/${a.slug}`} className="group flex flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-brand-100 text-lg font-bold text-brand-700 transition-transform duration-200 group-hover:scale-105 dark:bg-brand-950 dark:text-brand-300">
                      {a.logo ? <img src={a.logo} alt="" className="h-full w-full object-cover" /> : a.companyName[0]}
                    </div>
                    <span className="flex items-center gap-1 font-semibold text-gray-900 group-hover:text-brand-600 dark:text-gray-50">
                      {a.companyName} {a.verified && <FiCheckCircle className="text-brand-500" size={13} />}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {ROWS.map((row, ri) => (
              <motion.tr
                key={row.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: Math.min(ri * 0.04, 0.3) }}
                className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/60"
              >
                <td className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400">{row.label}</td>
                {agencies.map((a) => {
                  const value = row.get(a)
                  return (
                    <td key={a._id} className="p-4 text-center font-medium">
                      {row.label === 'Verified' ? (
                        value ? <Badge tone="success" dot>Verified</Badge> : <span className="text-gray-400">—</span>
                      ) : row.label === 'Plan' ? (
                        <Badge tone={PLAN_TONE[value] || 'neutral'} className="capitalize">{value}</Badge>
                      ) : (
                        value
                      )}
                    </td>
                  )
                })}
              </motion.tr>
            ))}
            <tr>
              <td className="p-4" />
              {agencies.map((a) => (
                <td key={a._id} className="p-4 text-center">
                  <Button to={`/agencies/${a.slug}`} size="sm">View Agency</Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </ScrollReveal>
    </div>
  )
}
