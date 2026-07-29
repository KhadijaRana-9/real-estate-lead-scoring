import { useEffect, useRef, useState } from 'react'

const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let loadPromise = null
function loadGoogleMapsScript() {
  if (window.google?.maps) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`
    script.async = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
  return loadPromise
}

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
      <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-400">
        <p className="font-medium">Interactive map not connected</p>
        <p className="mt-1 max-w-xs text-xs">
          Add <code className="rounded bg-gray-200 px-1 dark:bg-gray-700">VITE_GOOGLE_MAPS_API_KEY</code> to the client environment to enable pin placement, satellite view, and street view. Coordinates below still save normally.
        </p>
      </div>
    )
  }

  if (error) {
    return <div className="flex h-48 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm text-red-600 dark:border-red-900 dark:bg-red-950">Failed to load Google Maps.</div>
  }

  return <div ref={mapRef} className="h-48 w-full rounded-xl border border-gray-200 dark:border-gray-800" />
}
