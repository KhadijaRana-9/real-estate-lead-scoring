import { useEffect, useRef, useState } from 'react'
import { MAPS_KEY, loadGoogleMapsScript } from '../../utils/googleMapsLoader'

// Real Google Maps JS API integration - loads only if a key is present.
// Not fabricated: this is the standard documented pattern (dynamic
// script injection + google.maps.Map + draggable Marker), but it has
// not been exercised against a live key in this environment, since none
// is configured. Falls back to a manual lat/lng entry box, which IS
// fully functional without any key.
export default function GoogleMapPicker({ lat, lng, onChange }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!MAPS_KEY) return
    loadGoogleMapsScript()
      .then(() => setLoaded(true))
      .catch(() => setError(true))
  }, [])

  useEffect(() => {
    if (!loaded || !mapRef.current || mapInstanceRef.current) return

    const center = { lat: lat || 31.5497, lng: lng || 74.3436 }
    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      mapTypeControl: true,
      streetViewControl: true,
    })
    const marker = new window.google.maps.Marker({ position: center, map, draggable: true })

    marker.addListener('dragend', () => {
      const pos = marker.getPosition()
      onChange({ lat: pos.lat(), lng: pos.lng() })
    })
    map.addListener('click', (e) => {
      marker.setPosition(e.latLng)
      onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() })
    })

    mapInstanceRef.current = map
    markerRef.current = marker
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  if (!MAPS_KEY) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-400">
        <p className="font-medium">Map view (optional)</p>
        <p className="mt-1 max-w-xs text-xs">
          Enter coordinates directly below, or pin an exact location on a map by enabling this optional feature later.
        </p>
      </div>
    )
  }

  if (error) {
    return <div className="flex h-48 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm text-red-600 dark:border-red-900 dark:bg-red-950">Failed to load Google Maps.</div>
  }

  return <div ref={mapRef} className="h-48 w-full rounded-xl border border-gray-200 dark:border-gray-800" />
}
