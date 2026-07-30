import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { FiMapPin, FiCheckCircle, FiStar, FiHome, FiUsers, FiArrowRight, FiPhone, FiMessageCircle } from 'react-icons/fi'
import { staggerItem } from '../motion/variants'

const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=60'

const TILT_RANGE = 4

const PLAN_LABEL = { starter: 'Starter', professional: 'Professional', enterprise: 'Premium' }

export default function AgencyCard({ agency, view = 'grid' }) {
  const cardRef = useRef(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [TILT_RANGE, -TILT_RANGE]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-TILT_RANGE, TILT_RANGE]), { stiffness: 300, damping: 30 })

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

  const cover = agency.coverBanner || FALLBACK_COVER
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
      className={`group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-2xl hover:shadow-brand-500/10 dark:border-gray-800 dark:bg-gray-900 ${
        isList ? 'flex flex-col sm:flex-row' : ''
      }`}
    >
      <Link to={`/agencies/${agency.slug}`} className={isList ? 'relative h-40 w-full shrink-0 overflow-hidden sm:h-auto sm:w-64' : 'relative block h-32 w-full overflow-hidden'}>
        <img src={cover} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {agency.featured && (
          <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow">Featured</span>
        )}
        <div className="absolute -bottom-6 left-4 h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-white shadow-md dark:border-gray-900">
          {agency.logo ? (
            <img src={agency.logo} alt={agency.companyName} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {agency.companyName?.[0]}
            </div>
          )}
        </div>
      </Link>

      <div className={`flex-1 p-4 ${isList ? 'pt-4' : 'pt-9'}`}>
        <div className="flex items-start justify-between gap-2">
          <Link to={`/agencies/${agency.slug}`}>
            <h3 className="flex items-center gap-1.5 text-base font-semibold text-gray-900 hover:text-brand-600 dark:text-gray-50 dark:hover:text-brand-400">
              {agency.companyName}
              {agency.verified && <FiCheckCircle className="text-brand-500" title="Verified agency" />}
            </h3>
          </Link>
          <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {PLAN_LABEL[agency.subscriptionPlan] || agency.subscriptionPlan}
          </span>
        </div>

        {(agency.city || agency.country) && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <FiMapPin size={12} /> {[agency.city, agency.country].filter(Boolean).join(', ')}
          </p>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-300">
          <span className="flex items-center gap-1">
            <FiHome size={13} /> {stats.activeListings ?? 0} listings
          </span>
          <span className="flex items-center gap-1">
            <FiUsers size={13} /> {stats.activeAgents ?? 0} agents
          </span>
          <span className="flex items-center gap-1">
            <FiStar size={13} className={stats.reviewCount ? 'text-amber-500' : ''} />
            {stats.reviewCount ? `${stats.rating} (${stats.reviewCount})` : 'No reviews yet'}
          </span>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <Link
            to={`/agencies/${agency.slug}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            View Agency <FiArrowRight size={13} />
          </Link>
          {agency.whatsapp && (
            <a
              href={`https://wa.me/${agency.whatsapp.replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="WhatsApp"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-emerald-600 hover:bg-emerald-50 dark:border-gray-700 dark:hover:bg-emerald-950"
            >
              <FiMessageCircle size={15} />
            </a>
          )}
          {agency.phone && (
            <a
              href={`tel:${agency.phone}`}
              onClick={(e) => e.stopPropagation()}
              title="Call"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <FiPhone size={15} />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  )
}
