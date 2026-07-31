import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'dreamhomes_saved_agencies'

function readList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

// Lightweight, no-login-required bookmark (distinct from Follow, which
// is a real authenticated backend relationship with a follower count
// other agencies/admins can see). Save is just "remember this for
// myself" - genuinely useful for an anonymous visitor comparison-
// shopping before creating an account.
export default function useAgencySave(slug) {
  const [slugs, setSlugs] = useState(readList)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setSlugs(readList())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isSaved = slug ? slugs.includes(slug) : false

  const toggle = useCallback(() => {
    setSlugs((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [slug])

  return { isSaved, toggle, savedSlugs: slugs }
}
