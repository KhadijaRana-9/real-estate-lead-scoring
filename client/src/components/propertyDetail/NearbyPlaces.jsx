import { FiMapPin, FiNavigation } from 'react-icons/fi'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const PLACE_TYPES = ['Schools', 'Hospitals', 'Parks', 'Restaurants', 'Mosques', 'Shopping Areas', 'Public Transport']

export default function NearbyPlaces({ location, address }) {
  const hasCoords = location?.lat != null && location?.lng != null

  return (
    <div className="rounded-2xl border border-gray-200 p-5 dark:border-gray-800">
      <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
        <FiMapPin className="text-brand-500" /> Location &amp; Nearby
      </h3>

      {!MAPS_KEY ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-10 text-center dark:border-gray-700 dark:bg-gray-900">
          <FiNavigation className="mb-2 text-gray-300 dark:text-gray-700" size={24} />
          <p className="text-sm text-gray-500 dark:text-gray-400">Interactive map not configured</p>
          <p className="mt-1 max-w-xs text-xs text-gray-400">
            Add <code className="rounded bg-gray-200 px-1 dark:bg-gray-800">VITE_GOOGLE_MAPS_API_KEY</code> to enable the map, street view, and nearby places.
          </p>
          {address && <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{address}</p>}
        </div>
      ) : hasCoords ? (
        <>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800" style={{ height: 280 }}>
            <iframe
              title="Property location"
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={`https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${location.lat},${location.lng}&zoom=15`}
            />
          </div>
          {/* Categorized nearby-places search (schools/hospitals/etc.) needs
              a server-side Places API proxy - not wired up yet, so this is
              labeled honestly rather than shown as live data. */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {PLACE_TYPES.map((t) => (
              <span key={t} className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] text-gray-400 dark:bg-gray-800" title="Nearby-places search coming soon">
                {t}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="py-6 text-center text-sm text-gray-400">No coordinates set for this listing yet.</p>
      )}
    </div>
  )
}
