import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { FiSearch, FiGrid, FiList, FiCheckCircle, FiAward, FiTrendingUp, FiClock, FiStar } from 'react-icons/fi'
import * as api from '../api/endpoints'
import AgencyCard from '../components/AgencyCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import { staggerContainer, fadeUp } from '../motion/variants'

const PAGE_SIZE = 9

const QUICK_FILTERS = [
  { key: 'all', label: 'All Agencies', icon: FiGrid, params: {} },
  { key: 'verified', label: 'Verified', icon: FiCheckCircle, params: { verified: 'true' } },
  { key: 'premium', label: 'Premium', icon: FiAward, params: { plan: 'enterprise' } },
  { key: 'newest', label: 'Newest', icon: FiClock, params: { sort: 'newest' } },
]

function SectionStrip({ title, icon: Icon, items, loading }) {
  if (!loading && (!items || items.length === 0)) return null
  return (
    <section className="mb-10">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-gray-50">
        <Icon className="text-brand-500" /> {title}
      </h2>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-72 shrink-0">
                <SkeletonCard />
              </div>
            ))
          : items.map((a, i) => (
              <div key={a._id} className="w-72 shrink-0">
                <AgencyCard agency={a} index={i} />
              </div>
            ))}
      </div>
    </section>
  )
}

export default function AgenciesMarketplace() {
  const [sections, setSections] = useState(null)
  const [sectionsLoading, setSectionsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [activeQuickFilter, setActiveQuickFilter] = useState('all')
  const [city, setCity] = useState('')
  const [view, setView] = useState('grid')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], pagination: { totalPages: 1, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .getAgencyHomepageSections()
      .then(({ data }) => setSections(data))
      .catch(() => setSections(null))
      .finally(() => setSectionsLoading(false))
  }, [])

  const fetchDirectory = useCallback(() => {
    setLoading(true)
    setError(false)
    const quickParams = QUICK_FILTERS.find((f) => f.key === activeQuickFilter)?.params || {}
    const params = { page, limit: PAGE_SIZE, ...quickParams }
    if (search) params.search = search
    if (city) params.city = city

    api
      .getAgencyDirectory(params)
      .then(({ data }) => setResult(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [page, search, city, activeQuickFilter])

  useEffect(() => {
    fetchDirectory()
  }, [fetchDirectory])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setSearch(searchInput.trim())
    setPage(1)
  }

  const handleQuickFilter = (key) => {
    setActiveQuickFilter(key)
    setPage(1)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 sm:text-4xl">Find a Trusted Real Estate Agency</h1>
        <p className="mx-auto mt-2 max-w-xl text-gray-500 dark:text-gray-400">
          Browse every verified agency on the platform - real listings, real agents, real reviews.
        </p>

        <form onSubmit={handleSearchSubmit} className="mx-auto mt-6 flex max-w-lg items-center gap-2">
          <div className="relative flex-1">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search agency name or city..."
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900"
            />
          </div>
          <button type="submit" className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
            Search
          </button>
        </form>
      </motion.div>

      {sections && !sectionsLoading && (
        <>
          <SectionStrip title="Featured Agencies" icon={FiAward} items={sections.featured} />
          <SectionStrip title="Top Performing" icon={FiTrendingUp} items={sections.topPerforming} />
          <SectionStrip title="Recently Active" icon={FiClock} items={sections.recentlyActive} />
        </>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-8 dark:border-gray-800">
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleQuickFilter(f.key)}
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                activeQuickFilter === f.key
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-brand-400 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              <f.icon size={13} /> {f.label}
            </button>
          ))}
          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value)
              setPage(1)
            }}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            <option value="">All Cities</option>
            {['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-gray-700">
          <button
            onClick={() => setView('grid')}
            aria-label="Grid view"
            className={`rounded-md p-1.5 ${view === 'grid' ? 'bg-brand-600 text-white' : 'text-gray-500'}`}
          >
            <FiGrid size={15} />
          </button>
          <button
            onClick={() => setView('list')}
            aria-label="List view"
            className={`rounded-md p-1.5 ${view === 'list' ? 'bg-brand-600 text-white' : 'text-gray-500'}`}
          >
            <FiList size={15} />
          </button>
        </div>
      </div>

      {!loading && !error && (
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{result.pagination.total.toLocaleString()} agencies found</p>
      )}

      {error ? (
        <EmptyState
          title="Network error"
          message="We couldn't reach the server. Please try again."
          action={
            <button onClick={fetchDirectory} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
              Retry
            </button>
          }
        />
      ) : loading ? (
        <div className={view === 'grid' ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={<FiStar />}
          title="No agencies found"
          message="Try a different search, city, or filter."
          action={
            <button
              onClick={() => {
                setSearch('')
                setSearchInput('')
                setCity('')
                setActiveQuickFilter('all')
                setPage(1)
              }}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
            >
              Clear Filters
            </button>
          }
        />
      ) : (
        <>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer(0.05)}
            className={view === 'grid' ? 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}
          >
            {result.items.map((a, i) => (
              <AgencyCard key={a._id} agency={a} index={i} view={view} />
            ))}
          </motion.div>
          <Pagination page={page} totalPages={result.pagination.totalPages} onChange={setPage} />
        </>
      )}
    </div>
  )
}
