import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  FiMapPin, FiCheckCircle, FiStar, FiHome, FiUsers, FiEye, FiPhone, FiMessageCircle,
  FiMail, FiGlobe, FiClock, FiAward, FiFileText, FiFacebook, FiInstagram, FiTwitter,
  FiLinkedin, FiYoutube, FiExternalLink, FiShield, FiHeart, FiThumbsUp, FiFlag, FiImage,
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
  const [imageUrl, setImageUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) {
      toast.error('Please select a star rating')
      return
    }
    setSaving(true)
    try {
      await api.submitAgencyReview(slug, { rating, comment, images: imageUrl ? [imageUrl] : [] })
      toast.success('Review submitted')
      setRating(0)
      setComment('')
      setImageUrl('')
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
      <div className="relative">
        <FiImage className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="Photo URL (optional)"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-8 pr-3 text-xs outline-none focus:border-brand-400 dark:border-gray-700 dark:bg-gray-800"
        />
      </div>
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

function ReviewCard({ review, isAgencyAdmin, onReplied }) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulUserIds?.length || 0)
  const [marked, setMarked] = useState(false)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')

  const handleHelpful = async () => {
    try {
      const { data } = await api.toggleReviewHelpful(review._id)
      setHelpfulCount(data.helpfulCount)
      setMarked(data.marked)
    } catch {
      toast.error('Could not update')
    }
  }

  const handleReply = async () => {
    if (!replyText.trim()) return
    try {
      await api.replyToReview(review._id, replyText.trim())
      toast.success('Reply posted')
      setReplying(false)
      onReplied()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not post reply')
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {review.author.name}
          {review.verifiedInquiry && (
            <span className="flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              <FiCheckCircle size={9} /> Verified
            </span>
          )}
        </p>
        <span className="flex items-center gap-0.5 text-xs text-amber-500">
          <FiStar className="fill-amber-400" size={12} /> {review.rating}
        </span>
      </div>
      {review.comment && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>}
      {review.images?.length > 0 && (
        <div className="mt-2 flex gap-2">
          {review.images.map((url) => (
            <img key={url} src={url} alt="" className="h-16 w-16 rounded-lg object-cover" />
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
        <span>{formatDate(review.createdAt)}</span>
        <button onClick={handleHelpful} className={`flex items-center gap-1 hover:text-brand-600 ${marked ? 'text-brand-600' : ''}`}>
          <FiThumbsUp size={12} /> Helpful{helpfulCount > 0 ? ` (${helpfulCount})` : ''}
        </button>
        <button className="flex items-center gap-1 hover:text-red-500">
          <FiFlag size={12} /> Report
        </button>
      </div>

      {review.reply?.text && (
        <div className="mt-3 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800/60">
          <p className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">Agency Response</p>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">{review.reply.text}</p>
        </div>
      )}
      {isAgencyAdmin && !review.reply?.text && (
        <div className="mt-2">
          {replying ? (
            <div className="flex gap-2">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-800"
              />
              <button onClick={handleReply} className="rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-medium text-white">Post</button>
            </div>
          ) : (
            <button onClick={() => setReplying(true)} className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">Reply as agency</button>
          )}
        </div>
      )}
    </div>
  )
}

function RatingDistribution({ distribution, average, count }) {
  if (!count) return null
  return (
    <div className="mb-4 flex flex-col gap-4 rounded-xl border border-gray-200 p-4 sm:flex-row sm:items-center dark:border-gray-800">
      <div className="shrink-0 text-center">
        <p className="text-3xl font-bold">{average}</p>
        <div className="flex justify-center text-amber-400">
          {[1, 2, 3, 4, 5].map((n) => <FiStar key={n} size={12} className={n <= Math.round(average) ? 'fill-amber-400' : 'text-gray-300 dark:text-gray-700'} />)}
        </div>
        <p className="mt-0.5 text-xs text-gray-400">{count} reviews</p>
      </div>
      <div className="flex-1 space-y-1">
        {distribution.map((row) => (
          <div key={row.star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-gray-400">{row.star}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-full rounded-full bg-amber-400" style={{ width: `${row.pct}%` }} />
            </div>
            <span className="w-8 text-right text-gray-400">{row.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function FollowButton({ slug, initialFollowing }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(initialFollowing)
  const [saving, setSaving] = useState(false)

  const handleClick = async () => {
    if (!user) {
      toast.error('Log in to follow this agency')
      return
    }
    setSaving(true)
    try {
      if (following) {
        await api.unfollowAgency(slug)
        setFollowing(false)
      } else {
        await api.followAgency(slug)
        setFollowing(true)
      }
    } catch {
      toast.error('Could not update follow status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold shadow disabled:opacity-60 ${
        following ? 'bg-white text-brand-600' : 'bg-brand-600 text-white hover:bg-brand-700'
      }`}
    >
      <FiHeart size={14} className={following ? 'fill-brand-600' : ''} /> {following ? 'Following' : 'Follow'}
    </button>
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
            <div className="flex-1 pb-1">
              <h1 className="flex items-center gap-2 text-2xl font-bold text-white drop-shadow sm:text-3xl">
                {agency.companyName}
                {agency.verified && <FiCheckCircle className="text-brand-400" title="Verified agency" />}
              </h1>
              <p className="flex flex-wrap items-center gap-3 text-sm text-gray-200">
                {(agency.city || agency.country) && (
                  <span className="flex items-center gap-1">
                    <FiMapPin size={13} /> {[agency.city, agency.country].filter(Boolean).join(', ')}
                  </span>
                )}
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur">
                  {PLAN_LABEL[agency.subscriptionPlan] || agency.subscriptionPlan}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-xs backdrop-blur" title="Trust Score">
                  <FiShield size={11} /> {stats.trustScore} Trust Score
                </span>
                {stats.followerCount > 0 && <span className="text-xs">{stats.followerCount} followers</span>}
              </p>
            </div>
            <div className="pb-1">
              <FollowButton slug={slug} initialFollowing={agency.isFollowing} />
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

              <RatingDistribution distribution={agency.ratingDistribution} average={stats.rating} count={stats.reviewCount} />

              {user?.role === 'customer' && <div className="mb-4"><ReviewForm slug={slug} onSubmitted={fetchProfile} /></div>}

              {agency.reviews.items.length === 0 ? (
                <p className="text-sm text-gray-400">No reviews yet - be the first to share your experience.</p>
              ) : (
                <div className="space-y-3">
                  {agency.reviews.items.map((r) => (
                    <ReviewCard key={r._id} review={r} isAgencyAdmin={user?.role === 'agency_admin'} onReplied={fetchProfile} />
                  ))}
                </div>
              )}
            </section>

            {/* Company story - only rendered when an admin has actually filled it in */}
            {(agency.ceoMessage || agency.mission || agency.vision) && (
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {agency.mission && (
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <h3 className="mb-1 text-sm font-semibold text-brand-600 dark:text-brand-400">Our Mission</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{agency.mission}</p>
                  </div>
                )}
                {agency.vision && (
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <h3 className="mb-1 text-sm font-semibold text-brand-600 dark:text-brand-400">Our Vision</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{agency.vision}</p>
                  </div>
                )}
                {agency.ceoMessage && (
                  <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <h3 className="mb-1 text-sm font-semibold text-brand-600 dark:text-brand-400">A Message From Our CEO</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{agency.ceoMessage}</p>
                  </div>
                )}
              </section>
            )}

            {agency.timeline?.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">Our Journey</h2>
                <div className="space-y-3 border-l-2 border-brand-200 pl-4 dark:border-brand-900">
                  {[...agency.timeline].sort((a, b) => a.year - b.year).map((event, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-500" />
                      <p className="text-xs font-semibold text-brand-600 dark:text-brand-400">{event.year}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{event.title}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {agency.awards?.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">Awards &amp; Recognition</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {agency.awards.map((award, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800">
                      <FiAward className="shrink-0 text-amber-500" size={20} />
                      <div>
                        <p className="text-sm font-medium">{award.title}</p>
                        <p className="text-xs text-gray-400">{[award.issuer, award.year].filter(Boolean).join(' · ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {agency.officeGallery?.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">Office Gallery</h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {agency.officeGallery.map((url, i) => (
                    <img key={i} src={url} alt="" className="aspect-square rounded-lg object-cover" />
                  ))}
                </div>
              </section>
            )}
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
