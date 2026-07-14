import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiMapPin, FiMaximize2 } from 'react-icons/fi'
import { PiBathtub, PiBed } from 'react-icons/pi'
import { formatPKR } from '../utils/format'

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=60'

export default function PropertyCard({ property }) {
  const image = property.images?.[0]
    ? `${property.images[0]}?auto=format&fit=crop&w=800&q=60`
    : FALLBACK_IMAGE

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <Link to={`/properties/${property._id}`}>
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={image}
            alt={property.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold capitalize text-white">
            {property.type}
          </span>
        </div>

        <div className="space-y-2 p-4">
          <h3 className="truncate text-lg font-semibold text-gray-900 dark:text-gray-50">
            {property.title}
          </h3>
          <p className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <FiMapPin /> {property.city}
          </p>

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

          <p className="pt-1 text-xl font-bold text-brand-600 dark:text-brand-400">
            {formatPKR(property.price)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
