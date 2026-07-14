const CITIES = ['Faisalabad', 'Islamabad', 'Lahore', 'Karachi', 'Rawalpindi']
const TYPES = ['house', 'flat', 'plot']

export default function FilterPanel({ filters, onChange, onClear }) {
  const update = (key, value) => onChange({ ...filters, [key]: value })

  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 dark:border-gray-800 dark:bg-gray-900">
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

      <button
        onClick={onClear}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        Clear Filters
      </button>
    </div>
  )
}
