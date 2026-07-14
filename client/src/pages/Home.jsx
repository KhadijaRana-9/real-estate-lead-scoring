import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import * as api from '../api/endpoints'
import SearchBar from '../components/SearchBar'
import PropertyCard from '../components/PropertyCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'

const POPULAR_CITIES = ['Faisalabad', 'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi']

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .getProperties({ page: 1, limit: 6 })
      .then(({ data }) => {
        if (!cancelled) setFeatured(data.items)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-50 to-white px-4 py-20 text-center dark:from-gray-900 dark:to-gray-950">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-extrabold tracking-tight sm:text-5xl"
        >
          Find your next home, <span className="text-brand-600 dark:text-brand-400">faster</span>.
        </motion.h1>
        <p className="mx-auto mt-4 max-w-xl text-gray-600 dark:text-gray-300">
          Browse verified listings across Pakistan's top cities and connect directly with agents.
        </p>
        <div className="mt-8 px-4">
          <SearchBar />
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {POPULAR_CITIES.map((city) => (
            <Link
              key={city}
              to={`/listings?city=${city}`}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm hover:border-brand-400 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-brand-400"
            >
              {city}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Featured Listings</h2>
          <Link to="/listings" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
            View all &rarr;
          </Link>
        </div>

        {error ? (
          <EmptyState title="Couldn't load listings" message="Check your connection and try refreshing." />
        ) : loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : featured.length === 0 ? (
          <EmptyState title="No properties yet" message="Check back soon, or sign up as an agent to list one." />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => <PropertyCard key={p._id} property={p} />)}
          </div>
        )}
      </section>
    </div>
  )
}
