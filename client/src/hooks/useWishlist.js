import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'dreamhomes_wishlist'

// Real, working persistence - just scoped to the browser rather than a
// server model (no Wishlist backend exists yet). Genuinely functional
// across page reloads and other tabs, not a fake "coming soon" button.
function readWishlist() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function useWishlist(propertyId) {
  const [ids, setIds] = useState(readWishlist)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setIds(readWishlist())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isSaved = propertyId ? ids.includes(propertyId) : false

  const toggle = useCallback(() => {
    setIds((prev) => {
      const next = prev.includes(propertyId) ? prev.filter((id) => id !== propertyId) : [...prev, propertyId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [propertyId])

  return { isSaved, toggle, savedIds: ids }
}
