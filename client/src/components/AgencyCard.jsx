import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import {
  FiMapPin, FiCheckCircle, FiStar, FiHome, FiUsers, FiArrowRight, FiHeart, FiBarChart2, FiShare2, FiShield,
} from 'react-icons/fi'
import { staggerItem } from '../motion/variants'
import { useAuth } from '../context/AuthContext'
import * as api from '../api/endpoints'
import useAgencySave from '../hooks/useAgencySave'
import useAgencyCompare from '../hooks/useAgencyCompare'

// A pool, not a single image - an agency with no coverBanner of its own
// still needs *a* photo, but every uncovered agency showing the exact
// same one reads as broken/fake. Picked deterministically per agency
// (see coverForAgency) so the same agency always shows the same photo
// everywhere it appears (grid, strips, compare) rather than flickering
// between renders or looking different in different sections.
const FALLBACK_COVERS = [
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=60',
  'https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?auto=format&fit=crop&w=800&q=60',
]

// A plain hash can't guarantee no two of a small, known set of real
// agencies land on the same bucket (birthday-paradox collisions showed up
// in testing even with a 20-image pool). This explicit map guarantees
// every agency currently on the platform gets a distinct photo; any
// agency not listed here (created after this was written) falls back to
// the hash, which is fine once the map is a small minority of the total.
const SLUG_COVER_OVERRIDE = {
  'dreamhomes': 0,
  'al-falah-estates': 9,
  'prime-homes-pk': 2,
  'capital-realty': 3,
  'skyline-properties': 4,
  'agency-two': 5,
  'horizon-realty': 6,
  'metro-homes-advisors': 7,
}

function coverForAgency(agency) {
  if (agency.coverBanner) return agency.coverBanner
  const key = agency.slug || agency._id || agency.companyName || ''
  if (key in SLUG_COVER_OVERRIDE) return FALLBACK_COVERS[SLUG_COVER_OVERRIDE[key]]
  let hash = 0
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return FALLBACK_COVERS[hash % FALLBACK_COVERS.length]
}

const TILT_RANGE = 4

const PLAN_LABEL = { starter: 'Starter', professional: 'Professional', enterprise: 'Premium' }

function TrustBadge({ score }) {
  if (score == null) return null
  const tier = score >= 75 ? 'bg-emerald-500' : score >= 45 ? 'bg-amber-500' : 'bg-gray-400'
  return (
    <span className={`flex items-center gap-1 rounded-full ${tier} px-2 py-0.5 text-[11px] font-semibold text-white shadow`} title="Trust Score - verification, ratings, experience, and activity combined">
      <FiShield size={11} /> {score}
    </span>
  )
}

function FollowPill({ agency }) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(Boolean(agency.isFollowing))
  const [saving, setSaving] = useState(false)

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      toast.error('Log in to follow this agency')
      return
    }
    setSaving(true)
    try {
      if (following) {
        await api.unfollowAgency(agency.slug)
        setFollowing(false)
      } else {
        await api.followAgency(agency.slug)
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
      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold shadow-sm transition-colors disabled:opacity-60 ${
        following
          ? 'border border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
          : 'bg-gray-900 text-white hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  )
}

export default function AgencyCard({ agency, view = 'grid' }) {
  const cardRef = useRef(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [TILT_RANGE, -TILT_RANGE]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-TILT_RANGE, TILT_RANGE]), { stiffness: 300, damping: 30 })

  const { isSaved, toggle: toggleSave } = useAgencySave(agency.slug)
  const { isInCompare, toggle: toggleCompare, maxReached } = useAgencyCompare(agency.slug)

  const handleMouseMove = (e) => {
    const rect = cardRef.current?.getBoundingClientRect()
    if (!rect) return
    mouseX.set((e.clientX - rect.left) / rect.width)
    mouseY.set((e.clientY - rect.top) / rect.height)
  }
  const handleMouseLeave = () => {
    mouseX.set(0.5)
    mouseY.set(0.5)
  }

  const handleShare = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const url = `${window.location.origin}/agencies/${agency.slug}`
    if (navigator.share) {
      try {
        await navigator.share({ title: agency.companyName, url })
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied')
    }
  }

  const cover = coverForAgency(agency)
  const stats = agency.stats || {}
  const isList = view === 'list'

  return (
    <motion.div
      ref={cardRef}
      variants={staggerItem}
      whileHover={{ y: -6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX: isList ? 0 : rotateX, rotateY: isList ? 0 : rotateY, transformPerspective: 800 }}
      className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-2xl hover:shadow-brand-500/10 dark:border-gray-800 dark:bg-gray-900 ${
        isList ? 'sm:flex-row' : ''
      }`}
    >
      <Link to={`/agencies/${agency.slug}`} className={isList ? 'relative h-40 w-full shrink-0 overflow-hidden sm:h-auto sm:w-64' : 'relative block h-32 w-full overflow-hidden'}>
        <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5">
          {agency.featured && <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow">Featured</span>}
          <TrustBadge score={stats.trustScore} />
        </div>
        <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare() }}
            disabled={!isInCompare && maxReached}
            title="Compare"
            className={`flex h-7 w-7 items-center justify-center rounded-full shadow disabled:opacity-40 ${isInCompare ? 'bg-brand-600 text-white' : 'bg-white/90 text-gray-600 hover:bg-white'}`}
          >
            <FiBarChart2 size={13} />
          </button>
          <button onClick={handleShare} title="Share" className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow hover:bg-white">
            <FiShare2 size={13} />
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/agencies/${agency.slug}`} className="min-w-0">
            <h3 className="flex items-center gap-1.5 truncate text-base font-semibold text-gray-900 hover:text-brand-600 dark:text-gray-50 dark:hover:text-brand-400">
              {agency.companyName}
              {agency.verified && <FiCheckCircle className="shrink-0 text-brand-500" title="Verified agency" />}
            </h3>
            {(agency.city || agency.country) && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <FiMapPin size={12} /> {[agency.city, agency.country].filter(Boolean).join(', ')}
              </p>
            )}
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <FollowPill agency={agency} />
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSave() }}
              title={isSaved ? 'Remove from saved' : 'Save agency'}
              className={`flex h-8 w-8 items-center justify-center rounded-full border ${isSaved ? 'border-red-200 bg-red-50 text-red-500 dark:border-red-900 dark:bg-red-950' : 'border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'}`}
            >
              <FiHeart size={14} className={isSaved ? 'fill-red-500' : ''} />
            </button>
          </div>
        </div>

        <div className="mt-1 text-[11px] font-medium text-gray-400">
          {PLAN_LABEL[agency.subscriptionPlan] || agency.subscriptionPlan}
        </div>

        <div className="mt-3 grid grid-cols-3 divide-x divide-gray-100 border-y border-gray-100 py-2.5 text-center dark:divide-gray-800 dark:border-gray-800">
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-bold text-gray-900 dark:text-gray-50">
              <FiStar size={12} className={stats.reviewCount ? 'text-amber-500' : 'text-gray-300 dark:text-gray-700'} />
              {stats.reviewCount ? stats.rating : '—'}
            </p>
            <p className="text-[10px] text-gray-400">{stats.reviewCount ? `${stats.reviewCount} reviews` : 'No reviews'}</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-bold text-gray-900 dark:text-gray-50">
              <FiHome size={12} className="text-gray-400" /> {stats.activeListings ?? 0}
            </p>
            <p className="text-[10px] text-gray-400">Listings</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-1 text-sm font-bold text-gray-900 dark:text-gray-50">
              <FiUsers size={12} className="text-gray-400" /> {stats.followerCount ?? 0}
            </p>
            <p className="text-[10px] text-gray-400">Followers</p>
          </div>
        </div>

        <Link
          to={`/agencies/${agency.slug}`}
          className="mt-auto flex items-center justify-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 dark:bg-gray-900/10">
            <FiArrowRight size={11} />
          </span>
          View Agency
        </Link>
      </div>
    </motion.div>
  )
}
