import { motion } from 'framer-motion'
import { fadeUp } from '../motion/variants'

const CITIES = ['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta']
const TYPES = ['house', 'flat', 'plot', 'farmhouse', 'office', 'shop', 'warehouse']
const SORT_OPTIONS = [
  { value: '', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'most_viewed', label: 'Most Viewed' },
]

export default function FilterPanel({ filters, onChange, onClear }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 dark:border-gray-800 dark:bg-gray-900">
      <select
        value={filters.city}
        onChange={(e) => update('city', e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <option value="">All Cities</option>
        {CITIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      <select
        value={filters.type}
        onChange={(e) => update('type', e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm capitalize dark:border-gray-700 dark:bg-gray-800"
      >
        <option value="">All Types</option>
        {TYPES.map((t) => (
          <option key={t} value={t} className="capitalize">{t}</option>
        ))}
      </select>

      <select
        value={filters.bedrooms}
        onChange={(e) => update('bedrooms', e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <option value="">Any Beds</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n}+ Beds</option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Min Price"
        value={filters.minPrice}
        onChange={(e) => update('minPrice', e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />

      <input
        type="number"
        placeholder="Max Price"
        value={filters.maxPrice}
        onChange={(e) => update('maxPrice', e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      />

      <select
        value={filters.sort}
        onChange={(e) => update('sort', e.target.value)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700">
        <input
          type="checkbox"
          checked={filters.featured}
          onChange={(e) => update('featured', e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
        Featured only
      </label>

      <button
        onClick={onClear}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        Clear Filters
      </button>
    </motion.div>
  )
}
