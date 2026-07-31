import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiMic, FiClock, FiHome, FiUsers, FiMapPin, FiBriefcase } from 'react-icons/fi'
import * as api from '../api/endpoints'
import CountUpNumber from './CountUpNumber'
import useSpeechRecognition from '../hooks/useSpeechRecognition'
import { fadeUp } from '../motion/variants'

const RECENT_KEY = 'dreamhomes_recent_agency_searches'
const MAX_RECENT = 5

function readRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}
function pushRecent(term) {
  const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, MAX_RECENT)
  localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  return next
}

export default function AgencyMarketplaceHero({ onSearch }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recent, setRecent] = useState(readRecent)
  const debounceRef = useRef(null)
  const containerRef = useRef(null)

  const { supported: micSupported, listening, start } = useSpeechRecognition({
    onResult: (transcript) => {
      setQuery(transcript)
      pushRecent(transcript)
      setRecent(readRecent())
      onSearch(transcript)
    },
  })

  useEffect(() => {
    api.getAgencyPlatformStats().then(({ data }) => setStats(data)).catch(() => {})
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleChange = (value) => {
    setQuery(value)
    clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(() => {
      api.getAgencyAutocomplete(value.trim()).then(({ data }) => setSuggestions(data)).catch(() => setSuggestions([]))
    }, 200)
  }

  const runSearch = (term) => {
    const trimmed = term.trim()
    if (!trimmed) return
    setQuery(trimmed)
    setShowSuggestions(false)
    setRecent(pushRecent(trimmed))
    onSearch(trimmed)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    runSearch(query)
  }

  const STATS = stats
    ? [
        { label: 'Agencies', value: stats.totalAgencies, icon: FiBriefcase },
        { label: 'Listings', value: stats.totalProperties, icon: FiHome },
        { label: 'Agents', value: stats.totalAgents, icon: FiUsers },
        { label: 'Cities', value: stats.totalCities, icon: FiMapPin },
      ]
    : []

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeUp} className="relative mb-10 overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-brand-50 via-white to-brand-50 px-6 py-14 text-center dark:border-gray-800 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 sm:py-20">
      {/* Floating decorative blobs */}
      <motion.div
        className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-700/10"
        animate={{ y: [0, 20, 0], x: [0, 15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-700/10"
        animate={{ y: [0, -20, 0], x: [0, -15, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 sm:text-4xl lg:text-5xl">
          Find a Trusted Real Estate Agency
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-gray-500 dark:text-gray-400">
          Real listings, real agents, real reviews - every agency on the platform, verified and ranked by actual performance.
        </p>

        <div ref={containerRef} className="relative mx-auto mt-8 max-w-xl">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search agency name or city..."
                className="w-full rounded-xl border border-gray-300 bg-white py-3.5 pl-11 pr-3 text-sm shadow-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-900"
              />
            </div>
            {micSupported && (
              <button
                type="button"
                onClick={start}
                title="Voice search"
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-sm ${listening ? 'animate-pulse border-red-400 bg-red-50 text-red-600 dark:border-red-700 dark:bg-red-950' : 'border-gray-300 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900'}`}
              >
                <FiMic size={16} />
              </button>
            )}
            <button type="submit" className="shrink-0 rounded-xl bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
              Search
            </button>
          </form>

          <AnimatePresence>
            {showSuggestions && (query.trim() ? suggestions.length > 0 : recent.length > 0) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left shadow-xl dark:border-gray-800 dark:bg-gray-900"
              >
                {query.trim() ? (
                  suggestions.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => navigate(`/agencies/${s.slug}`)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {s.logo ? <img src={s.logo} alt="" className="h-full w-full object-cover" /> : s.companyName[0]}
                      </div>
                      <span className="flex-1 truncate">{s.companyName}</span>
                      <span className="shrink-0 text-xs text-gray-400">{s.city}</span>
                    </button>
                  ))
                ) : (
                  <>
                    <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Recent Searches</p>
                    {recent.map((term) => (
                      <button key={term} onClick={() => runSearch(term)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
                        <FiClock size={13} className="text-gray-400" /> {term}
                      </button>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {stats && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl border border-gray-200/60 bg-white/60 p-4 backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/60">
                <s.icon className="mx-auto mb-1 text-brand-500" size={18} />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-50">
                  <CountUpNumber end={s.value} />
                  <span className="text-brand-500">+</span>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
