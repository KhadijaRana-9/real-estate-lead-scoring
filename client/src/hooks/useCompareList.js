import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'dreamhomes_compare'
const MAX_COMPARE = 5

function readList() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export default function useCompareList(propertyId) {
  const [ids, setIds] = useState(readList)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setIds(readList())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const isInCompare = propertyId ? ids.includes(propertyId) : false

  const toggle = useCallback(() => {
    setIds((prev) => {
      if (prev.includes(propertyId)) {
        const next = prev.filter((id) => id !== propertyId)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        return next
      }
      if (prev.length >= MAX_COMPARE) return prev
      const next = [...prev, propertyId]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [propertyId])

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setIds([])
  }, [])

  return { compareIds: ids, isInCompare, toggle, clear, maxReached: ids.length >= MAX_COMPARE }
}
