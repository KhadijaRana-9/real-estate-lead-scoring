import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiGrid, FiList, FiMap, FiMenu, FiCheckCircle, FiAward, FiTrendingUp, FiClock, FiStar, FiBarChart2, FiX } from 'react-icons/fi'
import * as api from '../api/endpoints'
import AgencyCard from '../components/AgencyCard'
import AgencyMarketplaceHero from '../components/AgencyMarketplaceHero'
import AgencyMapView from '../components/AgencyMapView'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import useAgencyCompare from '../hooks/useAgencyCompare'
import { staggerContainer } from '../motion/variants'

const PAGE_SIZE = 9
const VIEW_STORAGE_KEY = 'dreamhomes_agency_view_mode'

const QUICK_FILTERS = [
  { key: 'all', label: 'All Agencies', icon: FiGrid, params: {} },
  { key: 'verified', label: 'Verified', icon: FiCheckCircle, params: { verified: 'true' } },
  { key: 'premium', label: 'Premium', icon: FiAward, params: { plan: 'enterprise' } },
]

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'trust_score', label: 'Highest Trust Score' },
  { value: 'highest_rated', label: 'Highest Rated' },
  { value: 'most_properties', label: 'Most Properties' },
  { value: 'most_sold', label: 'Most Sold' },
  { value: 'most_viewed', label: 'Most Viewed' },
  { value: 'name_asc', label: 'Alphabetical' },
]

const VIEW_MODES = [
  { key: 'grid', label: 'Grid', icon: FiGrid },
  { key: 'list', label: 'List', icon: FiList },
  { key: 'compact', label: 'Compact', icon: FiMenu },
  { key: 'map', label: 'Map', icon: FiMap },
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
          : items.map((a) => (
              <div key={a._id} className="w-72 shrink-0">
                <AgencyCard agency={a} />
              </div>
            ))}
      </div>
    </section>
  )
}

function CompactRow({ agency }) {
  return (
    <Link to={`/agencies/${agency.slug}`} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:border-brand-400 dark:border-gray-800">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
        {agency.logo ? <img src={agency.logo} alt="" className="h-full w-full object-cover" /> : agency.companyName?.[0]}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-medium">
          {agency.companyName}
          {agency.verified && <FiCheckCircle className="shrink-0 text-brand-500" size={12} />}
        </p>
        <p className="truncate text-xs text-gray-400">{agency.city}</p>
      </div>
      <div className="shrink-0 text-right text-xs text-gray-500 dark:text-gray-400">
        <p>{agency.stats?.activeListings ?? 0} listings</p>
        <p>{agency.stats?.rating ? `${agency.stats.rating}★` : 'No reviews'}</p>
      </div>
    </Link>
  )
}

export default function AgenciesMarketplace() {
  const [sections, setSections] = useState(null)
  const [sectionsLoading, setSectionsLoading] = useState(true)

  const [search, setSearch] = useState('')
  const [activeQuickFilter, setActiveQuickFilter] = useState('all')
  const [city, setCity] = useState('')
  const [sort, setSort] = useState('newest')
  const [view, setView] = useState(() => localStorage.getItem(VIEW_STORAGE_KEY) || 'grid')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], pagination: { totalPages: 1, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const { compareSlugs, clear: clearCompare } = useAgencyCompare()

  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, view)
  }, [view])

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
    const params = { page, limit: view === 'map' ? 50 : PAGE_SIZE, sort, ...quickParams }
    if (search) params.search = search
    if (city) params.city = city

    api
      .getAgencyDirectory(params)
      .then(({ data }) => setResult(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [page, search, city, activeQuickFilter, sort, view])

  useEffect(() => {
    fetchDirectory()
  }, [fetchDirectory])

  const handleSearch = (term) => {
    setSearch(term)
    setPage(1)
  }

  const handleQuickFilter = (key) => {
    setActiveQuickFilter(key)
    setPage(1)
  }

  const clearAll = () => {
    setSearch('')
    setCity('')
    setActiveQuickFilter('all')
    setSort('newest')
    setPage(1)
  }

  const gridClass = { grid: 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3', list: 'space-y-4', compact: 'space-y-2' }[view]

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <AgencyMarketplaceHero onSearch={handleSearch} />

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
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setPage(1)
            }}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-900"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 rounded-lg border border-gray-300 p-0.5 dark:border-gray-700">
          {VIEW_MODES.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              aria-label={`${v.label} view`}
              title={`${v.label} view`}
              className={`rounded-md p-1.5 ${view === v.key ? 'bg-brand-600 text-white' : 'text-gray-500'}`}
            >
              <v.icon size={15} />
            </button>
          ))}
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
        <div className={gridClass}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : result.items.length === 0 ? (
        <EmptyState
          icon={<FiStar />}
          title="No agencies found"
          message="Try a different search, city, or filter."
          action={
            <button onClick={clearAll} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
              Clear Filters
            </button>
          }
        />
      ) : view === 'map' ? (
        <AgencyMapView agencies={result.items} />
      ) : view === 'compact' ? (
        <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.03)} className={gridClass}>
          {result.items.map((a) => <CompactRow key={a._id} agency={a} />)}
        </motion.div>
      ) : (
        <>
          <motion.div initial="hidden" animate="visible" variants={staggerContainer(0.05)} className={gridClass}>
            {result.items.map((a) => (
              <AgencyCard key={a._id} agency={a} view={view} />
            ))}
          </motion.div>
          <Pagination page={page} totalPages={result.pagination.totalPages} onChange={setPage} />
        </>
      )}

      <AnimatePresence>
        {compareSlugs.length >= 2 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-3 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
          >
            <FiBarChart2 className="text-brand-500" />
            <span className="text-sm font-medium">{compareSlugs.length} agencies selected</span>
            <Link to={`/agencies/compare?slugs=${compareSlugs.join(',')}`} className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-700">
              Compare Now
            </Link>
            <button onClick={clearCompare} aria-label="Clear compare" className="text-gray-400 hover:text-gray-600">
              <FiX size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
