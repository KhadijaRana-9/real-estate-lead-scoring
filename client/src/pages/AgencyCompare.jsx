import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { FiCheckCircle, FiArrowLeft } from 'react-icons/fi'
import * as api from '../api/endpoints'
import EmptyState from '../components/EmptyState'

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
  { label: 'Verified', get: (a) => (a.verified ? '✓ Verified' : '—') },
  { label: 'Plan', get: (a) => a.subscriptionPlan },
]

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
    return <div className="mx-auto max-w-5xl px-4 py-16 text-center text-gray-400">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link to="/agencies" className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 dark:text-gray-400">
        <FiArrowLeft size={14} /> Back to Agencies
      </Link>
      <h1 className="mb-6 text-2xl font-bold">Compare Agencies</h1>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-800">
              <th className="p-4 text-left text-xs font-medium uppercase tracking-wide text-gray-400">Agency</th>
              {agencies.map((a) => (
                <th key={a._id} className="p-4 text-center">
                  <Link to={`/agencies/${a.slug}`} className="flex flex-col items-center gap-2">
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {a.logo ? <img src={a.logo} alt="" className="h-full w-full object-cover" /> : a.companyName[0]}
                    </div>
                    <span className="flex items-center gap-1 font-semibold text-gray-900 hover:text-brand-600 dark:text-gray-50">
                      {a.companyName} {a.verified && <FiCheckCircle className="text-brand-500" size={13} />}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td className="p-4 text-xs font-medium text-gray-500 dark:text-gray-400">{row.label}</td>
                {agencies.map((a) => (
                  <td key={a._id} className="p-4 text-center font-medium">{row.get(a)}</td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="p-4" />
              {agencies.map((a) => (
                <td key={a._id} className="p-4 text-center">
                  <Link to={`/agencies/${a.slug}`} className="inline-block rounded-lg bg-brand-600 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700">
                    View Agency
                  </Link>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
