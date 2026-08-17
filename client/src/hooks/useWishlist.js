import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import * as api from '../api/endpoints'
import { useAuth } from '../context/AuthContext'

// Real, server-backed persistence (favorite.service.js - the same
// Favorite model the AI assistant's get_favorite_properties tool reads),
// not scoped to this browser - "your favorites" now means the same
// thing whether a customer asks the AI or clicks the heart icon here.
export default function useWishlist(propertyId) {
  const { user } = useAuth()
  const [ids, setIds] = useState([])

  useEffect(() => {
    if (!user) {
      setIds([])
      return
    }
    let cancelled = false
    api
      .getFavoriteProperties()
      .then(({ data }) => {
        if (!cancelled) setIds(data.properties.map((p) => p._id))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [user])

  const isSaved = propertyId ? ids.includes(propertyId) : false

  const toggle = useCallback(async () => {
    if (!user) {
      toast.error('Please log in to save properties')
      return
    }
    const wasSaved = ids.includes(propertyId)
    try {
      if (wasSaved) {
        await api.removeFavoriteProperty(propertyId)
        setIds((prev) => prev.filter((id) => id !== propertyId))
      } else {
        await api.addFavoriteProperty(propertyId)
        setIds((prev) => [...prev, propertyId])
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update your favorites')
    }
  }, [user, propertyId, ids])

  return { isSaved, toggle, savedIds: ids }
}
