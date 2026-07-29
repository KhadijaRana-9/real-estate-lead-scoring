import { FiAlertTriangle, FiCheckCircle, FiMapPin, FiHome } from 'react-icons/fi'
import { formatPKR } from '../../../utils/format'
import PropertyCard from '../../PropertyCard'

const REQUIRED_FIELDS = [
  { key: 'title', label: 'Title' },
  { key: 'city', label: 'City' },
  { key: 'price', label: 'Price' },
  { key: 'area', label: 'Area' },
]

const RECOMMENDED_FIELDS = [
  { key: 'description', label: 'Description' },
  { key: 'images', label: 'At least one image', check: (p) => p.images?.length > 0 },
  { key: 'location', label: 'Map coordinates', check: (p) => p.location?.lat && p.location?.lng },
  { key: 'amenities', label: 'Amenities', check: (p) => p.amenities?.length > 0 },
]

export function getMissingRequiredFields(property) {
  return REQUIRED_FIELDS.filter((f) => !property[f.key]).map((f) => f.label)
}

export default function Step7Review({ property }) {
  const missing = getMissingRequiredFields(property)
  const missingRecommended = RECOMMENDED_FIELDS.filter((f) => (f.check ? !f.check(property) : !property[f.key]));
  const totalChecks = REQUIRED_FIELDS.length + RECOMMENDED_FIELDS.length
  const passedChecks = totalChecks - missing.length - missingRecommended.length
  const completeness = Math.round((passedChecks / totalChecks) * 100)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Listing Completeness</p>
          <p className="text-sm font-bold text-brand-600 dark:text-brand-400">{completeness}%</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${completeness}%` }} />
        </div>
      </div>

      {missing.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Cannot publish yet - missing required fields:</p>
            <p>{missing.join(', ')}</p>
          </div>
        </div>
      )}

      {missing.length === 0 && missingRecommended.length > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <FiAlertTriangle className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Ready to publish, but consider adding:</p>
            <p>{missingRecommended.map((f) => f.label).join(', ')}</p>
          </div>
        </div>
      )}

      {missing.length === 0 && missingRecommended.length === 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950/40 dark:text-green-300">
          <FiCheckCircle /> This listing looks complete.
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">Public Preview</p>
        <div className="max-w-xs">
          <PropertyCard property={{ ...property, _id: property._id || 'preview' }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 p-4 text-sm dark:border-gray-800 sm:grid-cols-2">
        <div className="flex items-center gap-2"><FiHome className="text-gray-400" /> {property.type} · {property.category}</div>
        <div className="flex items-center gap-2"><FiMapPin className="text-gray-400" /> {property.locality ? `${property.locality}, ` : ''}{property.city || 'No city set'}</div>
        <div>Price: <span className="font-semibold">{property.price ? formatPKR(property.price) : '—'}</span></div>
        <div>Area: <span className="font-semibold">{property.area || '—'} {property.areaUnit}</span></div>
        <div>Bedrooms: {property.bedrooms || 0} · Bathrooms: {property.bathrooms || 0}</div>
        <div>Amenities: {property.amenities?.length || 0} selected</div>
        <div>Images: {property.images?.length || 0}</div>
        <div>Documents: {property.documents?.length || 0}</div>
      </div>
    </div>
  )
}
