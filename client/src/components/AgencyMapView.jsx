import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiNavigation } from 'react-icons/fi'
import { MAPS_KEY, loadGoogleMapsScript } from '../utils/googleMapsLoader'

// Real Google Maps JS API with one marker per agency office location -
// only agencies that actually have officeLocations[].lat/lng show a pin;
// nothing is geocoded or guessed. Clicking a pin navigates to that
// agency's profile.
export default function AgencyMapView({ agencies }) {
  const navigate = useNavigate()
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!MAPS_KEY) return
    loadGoogleMapsScript().then(() => setLoaded(true)).catch(() => setError(true))
  }, [])

  useEffect(() => {
    if (!loaded || !mapRef.current) return

    const pinned = agencies.filter((a) => a.officeLocations?.[0]?.lat != null)
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
        center: pinned[0]?.officeLocations[0] || { lat: 30.3753, lng: 69.3451 },
        zoom: pinned.length ? 6 : 5,
      })
    }

    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = pinned.map((agency) => {
      const { lat, lng } = agency.officeLocations[0]
      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        title: agency.companyName,
      })
      const info = new window.google.maps.InfoWindow({
        content: `<div style="font-weight:600">${agency.companyName}</div><div style="font-size:12px;color:#666">${agency.city || ''}</div>`,
      })
      marker.addListener('mouseover', () => info.open(mapInstanceRef.current, marker))
      marker.addListener('mouseout', () => info.close())
      marker.addListener('click', () => navigate(`/agencies/${agency.slug}`))
      return marker
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, agencies])

  if (!MAPS_KEY) {
    return (
      <div className="flex h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 text-center dark:border-gray-700 dark:bg-gray-900">
        <FiNavigation className="mb-2 text-gray-300 dark:text-gray-700" size={28} />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Map view not configured</p>
        <p className="mt-1 max-w-xs text-xs text-gray-400">
          Add <code className="rounded bg-gray-200 px-1 dark:bg-gray-800">VITE_GOOGLE_MAPS_API_KEY</code> to enable agency map pins.
        </p>
      </div>
    )
  }

  if (error) {
    return <div className="flex h-[420px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 text-sm text-red-600 dark:border-red-900 dark:bg-red-950">Failed to load Google Maps.</div>
  }

  const withCoords = agencies.filter((a) => a.officeLocations?.[0]?.lat != null).length
  return (
    <div>
      <div ref={mapRef} className="h-[420px] w-full rounded-2xl border border-gray-200 dark:border-gray-800" />
      {withCoords < agencies.length && (
        <p className="mt-2 text-center text-xs text-gray-400">
          {withCoords} of {agencies.length} agencies have a pinned office location
        </p>
      )}
    </div>
  )
}
