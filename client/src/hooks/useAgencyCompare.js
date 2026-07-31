import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'dreamhomes_compare_agencies'
const MAX_COMPARE = 4

function readList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function useAgencyCompare(slug) {
  const [slugs, setSlugs] = useState(readList)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setSlugs(readList())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isInCompare = slug ? slugs.includes(slug) : false

  const toggle = useCallback(() => {
    setSlugs((prev) => {
      if (prev.includes(slug)) {
        const next = prev.filter((s) => s !== slug)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      }
      if (prev.length >= MAX_COMPARE) return prev
      const next = [...prev, slug]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [slug])

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setSlugs([])
  }, [])

  return { compareSlugs: slugs, isInCompare, toggle, clear, maxReached: slugs.length >= MAX_COMPARE }
}
