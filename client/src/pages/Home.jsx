import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiShield, FiTrendingUp, FiLayers, FiZap, FiHome, FiMapPin, FiUsers } from 'react-icons/fi'
import * as api from '../api/endpoints'
import SearchBar from '../components/SearchBar'
import PropertyCard from '../components/PropertyCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import CountUpNumber from '../components/CountUpNumber'
import AmbientBackground from '../components/AmbientBackground'
import CursorGlow from '../components/CursorGlow'
import HeroNebula from '../components/HeroNebula'
import ScrollReveal from '../components/ScrollReveal'
import { fadeUp, staggerContainer, staggerItem } from '../motion/variants'

const POPULAR_CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']

const WHY_CHOOSE_US = [
  {
    icon: FiShield,
    title: 'Explainable Lead Scoring',
    body: 'Every lead score shows its full breakdown — budget match, urgency, interest, popularity. No black box, ever.',
  },
  {
    icon: FiLayers,
    title: 'Built for Multi-Agency Scale',
    body: 'Each agency operates in a fully isolated workspace — its own listings, leads, agents, and branding.',
  },
  {
    icon: FiTrendingUp,
    title: 'Itemized Price Estimates',
    body: 'City-calibrated pricing with a transparent, line-by-line breakdown — not a single unexplained number.',
  },
  {
    icon: FiZap,
    title: 'Built for Agents, Not Just Admins',
    body: 'Fast listing management, real-time lead visibility, and a dashboard that surfaces what matters today.',
  },
]

function ListingSection({ title, items, loading, error, emptyMessage }) {
  return (
    <ScrollReveal as="section" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">{title}</h2>
        <Link to="/listings" className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
          View all &rarr;
        </Link>
      </div>

      {error ? (
        <EmptyState title="Couldn't load listings" message="Check your connection and try refreshing." />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState title="No properties yet" message={emptyMessage} />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((p, i) => <PropertyCard key={p._id} property={p} index={i} />)}
        </div>
      )}
    </ScrollReveal>
  )
}

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [newest, setNewest] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    Promise.all([
      api.getProperties({ page: 1, limit: 8, featured: true }),
      api.getProperties({ page: 1, limit: 8, sort: 'newest' }),
    ])
      .then(([featuredRes, newestRes]) => {
        if (cancelled) return
        setFeatured(featuredRes.data.items)
        setNewest(newestRes.data.items)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    api
      .getPublicStats()
      .then(({ data }) => {
        if (!cancelled) setStats(data)
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const statItems = stats
    ? [
        { label: 'Properties', value: stats.properties, icon: FiHome, suffix: '+', color: 'text-emerald-500 bg-emerald-500/10' },
        { label: 'Cities Covered', value: stats.cities, icon: FiMapPin, color: 'text-blue-500 bg-blue-500/10' },
        { label: 'Agents', value: stats.agents, icon: FiUsers, color: 'text-violet-500 bg-violet-500/10' },
      ]
    : []

  return (
    <div className="relative">
      <AmbientBackground />
      <CursorGlow />

      <motion.section
        initial="hidden"
        animate="visible"
        variants={staggerContainer(0.12)}
        className="relative overflow-hidden px-4 py-24 text-center"
      >
        <HeroNebula />

        <motion.h1
          variants={staggerItem}
          className="relative font-heading text-4xl font-extrabold tracking-tight text-gray-900 sm:text-6xl dark:text-white"
        >
          Find your next home, <span className="text-brand-600 dark:text-teal-300">faster</span>.
        </motion.h1>
        <motion.p variants={staggerItem} className="relative mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-300">
          Browse verified listings across Pakistan's top cities and connect directly with agents.
        </motion.p>
        <motion.div variants={staggerItem} className="relative mt-8 px-4">
          <SearchBar />
        </motion.div>

        <motion.div variants={staggerItem} className="relative mt-8 flex flex-wrap items-center justify-center gap-2">
          {POPULAR_CITIES.map((city) => (
            <Link
              key={city}
              to={`/listings?city=${city}`}
              className="rounded-full border border-gray-200 bg-white/70 px-4 py-1.5 text-sm text-gray-700 backdrop-blur transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:bg-white/10 dark:text-gray-200 dark:hover:border-teal-400/50 dark:hover:text-teal-300"
            >
              {city}
            </Link>
          ))}
        </motion.div>

        {stats && (
          <motion.div
            variants={staggerItem}
            className="relative mx-auto mt-14 grid max-w-2xl grid-cols-3 gap-4 px-4"
          >
            {statItems.map((item, i) => (
              <motion.div
                key={item.label}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 4 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
                whileHover={{ y: -4, scale: 1.03 }}
                className="rounded-2xl border border-gray-200 bg-white/80 p-4 text-left shadow-sm backdrop-blur transition-shadow hover:shadow-lg dark:border-white/10 dark:bg-white/5"
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                  <item.icon size={17} />
                </span>
                <p className="mt-3 font-heading text-2xl font-extrabold text-gray-900 sm:text-3xl dark:text-white">
                  <CountUpNumber end={item.value} duration={1.4} />
                  {item.suffix || ''}
                </p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {item.label}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      <ScrollReveal as="section" stagger className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <motion.div variants={staggerItem} className="mb-10 text-center">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">Why Agencies Choose Us</h2>
          <p className="mx-auto mt-2 max-w-xl text-gray-500 dark:text-gray-400">
            Built around one idea: every number the system shows you should be explainable.
          </p>
        </motion.div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_CHOOSE_US.map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                <Icon size={20} />
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{body}</p>
            </motion.div>
          ))}
        </div>
      </ScrollReveal>

      <ListingSection
        title="Featured Listings"
        items={featured}
        loading={loading}
        error={error}
        emptyMessage="Check back soon for featured properties."
      />
      <ListingSection
        title="Newest Listings"
        items={newest}
        loading={loading}
        error={error}
        emptyMessage="Check back soon, or sign up as an agent to list one."
      />

      <ScrollReveal as="section" className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-10 text-white shadow-xl sm:p-14">
          <h2 className="font-heading text-2xl font-bold sm:text-3xl">Ready to list your first property?</h2>
          <p className="mx-auto mt-2 max-w-md text-brand-50">
            Join as an agent and start receiving explainable, scored leads today.
          </p>
          <Link
            to="/signup"
            className="mt-6 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-brand-700 shadow-lg transition-transform hover:scale-105"
          >
            Get Started Free
          </Link>
        </motion.div>
      </ScrollReveal>
    </div>
  )
}
