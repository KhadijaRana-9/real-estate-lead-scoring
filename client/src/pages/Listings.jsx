import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as api from '../api/endpoints'
import PropertyCard from '../components/PropertyCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import FilterPanel from '../components/FilterPanel'
import Pagination from '../components/Pagination'

const EMPTY_FILTERS = { city: '', type: '', minPrice: '', maxPrice: '' }

export default function Listings() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = useState({
    ...EMPTY_FILTERS,
    city: searchParams.get('city') || '',
  })
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], pagination: { totalPages: 1 } })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchListings = useCallback(() => {
    setLoading(true)
    setError(false)
    const params = { page, limit: 9 }
    if (filters.city) params.city = filters.city
    if (filters.type) params.type = filters.type
    if (filters.minPrice) params.minPrice = filters.minPrice
    if (filters.maxPrice) params.maxPrice = filters.maxPrice

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
      <h1 className="mb-6 text-2xl font-bold">Properties for Sale</h1>

      <FilterPanel filters={filters} onChange={handleFilterChange} onClear={clearFilters} />

      <div className="mt-8">
        {error ? (
          <EmptyState
            title="Network error"
            message="We couldn't reach the server. Please try again."
            action={
              <button onClick={fetchListings} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                Retry
              </button>
            }
          />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : result.items.length === 0 ? (
          <EmptyState
            title="No properties found"
            message="Try adjusting your filters or search a different city."
            action={
              <button onClick={clearFilters} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">
                Clear Filters
              </button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((p) => <PropertyCard key={p._id} property={p} />)}
            </div>
            <Pagination page={page} totalPages={result.pagination.totalPages} onChange={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
