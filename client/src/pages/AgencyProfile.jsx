import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiMapPin, FiCheckCircle, FiStar, FiHome, FiUsers, FiEye, FiPhone, FiMessageCircle,
  FiMail, FiGlobe, FiClock, FiAward, FiFileText, FiFacebook, FiInstagram, FiTwitter,
  FiLinkedin, FiYoutube, FiExternalLink,
} from 'react-icons/fi'
import * as api from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import PropertyCard from '../components/PropertyCard'
import AgencyCard from '../components/AgencyCard'
import SkeletonCard from '../components/SkeletonCard'
import EmptyState from '../components/EmptyState'
import { formatDate } from '../utils/format'
import { fadeUp, staggerContainer } from '../motion/variants'

const DAY_LABEL = { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' }
const PLAN_LABEL = { starter: 'Starter', professional: 'Professional', enterprise: 'Premium' }
const SOCIAL_ICONS = { facebook: FiFacebook, instagram: FiInstagram, twitter: FiTwitter, linkedin: FiLinkedin, youtube: FiYoutube }

function StatBlock({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900">
      <Icon className="mx-auto mb-1 text-brand-500" size={18} />
      <p className="text-xl font-bold text-gray-900 dark:text-gray-50">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  )
}

function StarPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} stars`}>
          <FiStar size={22} className={n <= value ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'} />
        </button>
      ))}
    </div>
  )
}

function ReviewForm({ slug, onSubmitted }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) {
      toast.error('Please select a star rating')
      return
    }
    setSaving(true)
    try {
      await api.submitAgencyReview(slug, { rating, comment })
      toast.success('Review submitted')
      setRating(0)
      setComment('')
      onSubmitted()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not submit review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
      <p className="text-sm font-medium">Leave a review</p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Share your experience with this agency..."
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800"
      />
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {saving ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  )
}

export default function AgencyProfile() {
  const { slug } = useParams()
  const { user } = useAuth()
  const [agency, setAgency] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [listings, setListings] = useState(null)
  const [featuredListings, setFeaturedListings] = useState(null)

  const fetchProfile = useCallback(() => {
    setLoading(true)
    setError(false)
    api
      .getAgencyProfile(slug)
      .then(({ data }) => setAgency(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  useEffect(() => {
    if (!agency) return
    api.getProperties({ workspace: slug, sort: 'newest', limit: 8 }).then(({ data }) => setListings(data.items))
    api.getProperties({ workspace: slug, featured: true, limit: 8 }).then(({ data }) => setFeaturedListings(data.items))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agency?._id])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />
      </div>
    )
  }

  if (error || !agency) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <EmptyState title="Agency not found" message="This agency doesn't exist or is no longer active." />
      </div>
    )
  }

  const stats = agency.stats || {}
  const mapsUrl = agency.officeLocations?.[0]?.lat
    ? `https://www.google.com/maps/search/?api=1&query=${agency.officeLocations[0].lat},${agency.officeLocations[0].lng}`
    : agency.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(agency.address + ' ' + agency.city)}`
    : null

  return (
    <div>
      {/* Hero */}
      <div className="relative h-56 w-full overflow-hidden bg-gray-200 dark:bg-gray-800 sm:h-72">
        {agency.coverBanner && <img src={agency.coverBanner} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg dark:border-gray-900">
              {agency.logo ? (
                <img src={agency.logo} alt={agency.companyName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-100 text-2xl font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {agency.companyName?.[0]}
                </div>
              )}
            </div>
            <div className="pb-1">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-white drop-shadow sm:text-3xl">
                {agency.companyName}
                {agency.verified && <FiCheckCircle className="text-brand-400" title="Verified agency" />}
              </h1>
              <p className="flex items-center gap-3 text-sm text-gray-200">
                {(agency.city || agency.country) && (
                  <span className="flex items-center gap-1">
                    <FiMapPin size={13} /> {[agency.city, agency.country].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur">
                  {PLAN_LABEL[agency.subscriptionPlan] || agency.subscriptionPlan}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Main column */}
          <div className="space-y-10 lg:col-span-2">
            {/* Stats */}
            <motion.section initial="hidden" animate="visible" variants={staggerContainer(0.05)} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatBlock icon={FiHome} label="Active Listings" value={stats.activeListings ?? 0} />
              <StatBlock icon={FiAward} label="Sold" value={stats.soldProperties ?? 0} />
              <StatBlock icon={FiUsers} label="Agents" value={stats.activeAgents ?? 0} />
              <StatBlock icon={FiEye} label="Total Views" value={(stats.totalViews ?? 0).toLocaleString()} />
            </motion.section>

            {/* About */}
            {agency.description && (
              <motion.section initial="hidden" animate="visible" variants={fadeUp}>
                <h2 className="mb-2 text-lg font-bold">About</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-300">{agency.description}</p>
                {(agency.languages?.length > 0 || agency.specializations?.length > 0) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {agency.specializations?.map((s) => (
                      <span key={s} className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {s}
                      </span>
                    ))}
                    {agency.languages?.map((l) => (
                      <span key={l} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {l}
                      </span>
                    ))}
                  </div>
                )}
              </motion.section>
            )}

            {/* Featured Listings */}
            <section>
              <h2 className="mb-3 text-lg font-bold">Featured Listings</h2>
              {featuredListings === null ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>
              ) : featuredListings.length === 0 ? (
                <p className="text-sm text-gray-400">No featured listings right now.</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {featuredListings.map((p, i) => <PropertyCard key={p._id} property={p} index={i} />)}
                </div>
              )}
            </section>

            {/* Latest Listings */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">Latest Listings</h2>
                <Link to={`/listings?workspace=${slug}`} className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400">
                  View all
                </Link>
              </div>
              {listings === null ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}</div>
              ) : listings.length === 0 ? (
                <EmptyState title="No listings yet" message="This agency hasn't published any properties yet." />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {listings.map((p, i) => <PropertyCard key={p._id} property={p} index={i} />)}
                </div>
              )}
            </section>

            {/* Agents */}
            {agency.agents?.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">Agents</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {agency.agents.map((agent) => (
                    <div key={agent._id} className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {agent.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{agent.name}</p>
                        <p className="truncate text-xs text-gray-400">{agent.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Reviews */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-bold">
                Reviews
                {stats.reviewCount > 0 && (
                  <span className="flex items-center gap-1 text-sm font-normal text-gray-500">
                    <FiStar className="fill-amber-400 text-amber-400" size={14} /> {stats.rating} ({stats.reviewCount})
                  </span>
                )}
              </h2>

              {user?.role === 'customer' && <div className="mb-4"><ReviewForm slug={slug} onSubmitted={fetchProfile} /></div>}

              {agency.reviews.items.length === 0 ? (
                <p className="text-sm text-gray-400">No reviews yet - be the first to share your experience.</p>
              ) : (
                <div className="space-y-3">
                  {agency.reviews.items.map((r) => (
                    <div key={r._id} className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{r.author.name}</p>
                        <span className="flex items-center gap-0.5 text-xs text-amber-500">
                          <FiStar className="fill-amber-400" size={12} /> {r.rating}
                        </span>
                      </div>
                      {r.comment && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>}
                      <p className="mt-1 text-xs text-gray-400">{formatDate(r.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
              <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Contact</h3>
              <div className="space-y-2.5 text-sm">
                {agency.phone && (
                  <a href={`tel:${agency.phone}`} className="flex items-center gap-2 hover:text-brand-600">
                    <FiPhone size={14} /> {agency.phone}
                  </a>
                )}
                {agency.whatsapp && (
                  <a href={`https://wa.me/${agency.whatsapp.replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-emerald-600">
                    <FiMessageCircle size={14} /> WhatsApp
                  </a>
                )}
                <a href={`mailto:${agency.contactEmail}`} className="flex items-center gap-2 hover:text-brand-600">
                  <FiMail size={14} /> {agency.contactEmail}
                </a>
                {agency.website && (
                  <a href={agency.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-brand-600">
                    <FiGlobe size={14} /> Website
                  </a>
                )}
                {agency.address && (
                  <p className="flex items-start gap-2 text-gray-500 dark:text-gray-400">
                    <FiMapPin size={14} className="mt-0.5 shrink-0" /> {agency.address}
                  </p>
                )}
                {mapsUrl && (
                  <a href={mapsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-600 hover:underline dark:text-brand-400">
                    <FiExternalLink size={14} /> Open in Google Maps
                  </a>
                )}
              </div>

              {Object.values(agency.socialMedia || {}).some(Boolean) && (
                <div className="mt-4 flex gap-2 border-t border-gray-100 pt-4 dark:border-gray-800">
                  {Object.entries(agency.socialMedia).map(([key, url]) => {
                    if (!url) return null
                    const Icon = SOCIAL_ICONS[key]
                    return (
                      <a key={key} href={url} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:text-brand-600 dark:border-gray-700">
                        {Icon && <Icon size={14} />}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>

            {agency.businessHours?.length > 0 && (
              <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  <FiClock size={14} /> Business Hours
                </h3>
                <div className="space-y-1.5 text-sm">
                  {agency.businessHours.map((h) => (
                    <div key={h.day} className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">{DAY_LABEL[h.day]}</span>
                      <span>{h.closed ? 'Closed' : `${h.open} - ${h.close}`}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {agency.licenseNumber && (
              <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  <FiFileText size={14} /> License Information
                </h3>
                <p className="text-sm">{agency.licenseNumber}</p>
                {agency.establishedYear && <p className="mt-1 text-xs text-gray-400">Established {agency.establishedYear}</p>}
              </div>
            )}

            {agency.relatedAgencies?.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-500 dark:text-gray-400">Related Agencies</h3>
                <div className="space-y-4">
                  {agency.relatedAgencies.map((a, i) => <AgencyCard key={a._id} agency={a} index={i} view="list" />)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
