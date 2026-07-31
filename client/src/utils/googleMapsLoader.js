export const MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

let loadPromise = null

// Shared script loader - every consumer (property location picker,
// agency map view, nearby-places) reuses the same in-flight/loaded
// promise instead of injecting the Google Maps script tag more than once.
export function loadGoogleMapsScript() {
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
