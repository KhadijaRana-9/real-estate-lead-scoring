import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { FiMapPin, FiMaximize2, FiArrowRight, FiStar } from 'react-icons/fi'
import { PiBathtub, PiBed } from 'react-icons/pi'
import { formatPKR } from '../utils/format'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=60'

const TILT_RANGE = 6 // degrees, kept small so it reads as "premium", not gimmicky

export default function PropertyCard({ property, index = 0, workspace }) {
  const cardRef = useRef(null)
  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const rotateX = useSpring(useTransform(mouseY, [0, 1], [TILT_RANGE, -TILT_RANGE]), { stiffness: 300, damping: 30 })
  const rotateY = useSpring(useTransform(mouseX, [0, 1], [-TILT_RANGE, TILT_RANGE]), { stiffness: 300, damping: 30 })

  const image = property.images?.[0]
    ? `${property.images[0]}?auto=format&fit=crop&w=800&q=60`
    : FALLBACK_IMAGE

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

  return (
    <motion.div
      ref={cardRef}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformPerspective: 800 }}
      className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-2xl hover:shadow-brand-500/10 dark:border-gray-800 dark:bg-gray-900"
    >
      {/* Gradient border glow on hover - a hairline ring, not a full outline */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-brand-400/40 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Anonymous/cross-tenant visitors have no JWT-derived tenant, so
          the detail page must carry the workspace forward explicitly -
          without it, resolveTenant() falls back to the default agency
          and a non-default agency's property 404s ("Property not
          found") even though it's right there in this list. */}
      <Link to={workspace ? `/properties/${property._id}?workspace=${workspace}` : `/properties/${property._id}`}>
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={image}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold capitalize text-white shadow">
            {property.type}
          </span>
          {property.featured && (
            <motion.span
              initial={{ scale: 0, rotate: -8 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.15 }}
              className="absolute right-3 top-3 rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white shadow"
            >
              ★ Featured
            </motion.span>
          )}

          <span className="absolute bottom-3 right-3 flex translate-y-2 items-center gap-1 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-brand-700 opacity-0 shadow transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 dark:bg-gray-900/90 dark:text-brand-300">
            View Details <FiArrowRight />
          </span>
        </div>

        <div className="space-y-2 p-4">
          <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
            {property.title}
          </h3>
          <div className="flex items-center justify-between gap-2">
            <p className="flex min-w-0 items-center gap-1 truncate text-sm text-gray-500 dark:text-gray-400">
              <FiMapPin className="shrink-0" /> {property.locality ? `${property.locality}, ` : ''}{property.city}
            </p>
            {/* Real average/count only - no rating badge at all for a
                property with zero reviews yet, rather than a fake "0.0". */}
            {property.rating?.count > 0 && (
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-amber-500">
                <FiStar className="fill-amber-400" size={12} /> {property.rating.average}
                <span className="font-normal text-gray-400">({property.rating.count})</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1">
              <FiMaximize2 /> {property.area} {property.areaUnit}
            </span>
            {property.bedrooms > 0 && (
              <span className="flex items-center gap-1">
                <PiBed /> {property.bedrooms}
              </span>
            )}
            {property.bathrooms > 0 && (
              <span className="flex items-center gap-1">
                <PiBathtub /> {property.bathrooms}
              </span>
            )}
          </div>

          <p className="pt-1 text-xl font-bold text-brand-600 transition-colors duration-300 group-hover:text-brand-500 dark:text-brand-400">
            {formatPKR(property.price)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
