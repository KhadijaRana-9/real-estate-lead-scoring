import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as api from '../api/endpoints'
import PropertyCard from '../components/PropertyCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import FilterPanel from '../components/FilterPanel'
import Pagination from '../components/Pagination'
import ScrollReveal from '../components/ScrollReveal'
import Button from '../components/ui/Button'
import { useAuth } from '../context/AuthContext'
import { fadeUp, staggerItem } from '../motion/variants'

const EMPTY_FILTERS = { city: '', type: '', bedrooms: '', minPrice: '', maxPrice: '', sort: '', featured: false }
const PAGE_SIZE = 12

export default function Listings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    city: searchParams.get('city') || '',
  })
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], pagination: { totalPages: 1, total: 0 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // This page is the public, cross-tenant DreamHomes marketplace browser
  // (GET /api/properties has no auth - it always resolves the
  // host/?workspace=/default tenant, same for every visitor). An agent
  // or agency_admin has their own tenant-scoped inventory instead, at
  // the URL the app's own Navbar already sends them to ('Listings' ->
  // /dashboard?tab=My%20Listings, backed by the tenant-safe
  // GET /properties/mine) - redirect here too so there's no path,
  // including a direct URL/bookmark, where they land on this page and
  // could mistake the marketplace's properties for their own agency's.
  useEffect(() => {
    if (user?.role === 'agent' || user?.role === 'agency_admin') {
      navigate('/dashboard?tab=My%20Listings', { replace: true })
    }
  }, [user, navigate])

  const fetchListings = useCallback(() => {
    setLoading(true)
    setError(false)
    const params = { page, limit: PAGE_SIZE }
    if (filters.city) params.city = filters.city
    if (filters.type) params.type = filters.type
    if (filters.bedrooms) params.bedrooms = filters.bedrooms
    if (filters.minPrice) params.minPrice = filters.minPrice
    if (filters.maxPrice) params.maxPrice = filters.maxPrice
    if (filters.sort) params.sort = filters.sort
    if (filters.featured) params.featured = true

    api
      .getProperties(params)
      .then(({ data }) => setResult(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  const handleFilterChange = (next) => {
    setFilters(next)
    setPage(1)
    setSearchParams(next.city ? { city: next.city } : {})
  }

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS)
    setPage(1)
    setSearchParams({})
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Properties for Sale</h1>
        {!loading && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {result.pagination.total.toLocaleString()} listings found
          </p>
        )}
      </motion.div>

      <FilterPanel filters={filters} onChange={handleFilterChange} onClear={clearFilters} />

      <div className="mt-8">
        {error ? (
          <EmptyState
            title="Network error"
            message="We couldn't reach the server. Please try again."
            action={<Button onClick={fetchListings}>Retry</Button>}
          />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : result.items.length === 0 ? (
          <EmptyState
            title="No properties found"
            message="Try adjusting your filters or search a different city."
            action={<Button onClick={clearFilters}>Clear Filters</Button>}
          />
        ) : (
          <>
            <ScrollReveal stagger className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((p, i) => (
                <motion.div key={p._id} variants={staggerItem}>
                  <PropertyCard property={p} index={i} />
                </motion.div>
              ))}
            </ScrollReveal>
            <Pagination page={page} totalPages={result.pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
