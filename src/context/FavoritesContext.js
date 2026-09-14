import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const FAVORITES_KEY = 'weather_favorites'
const RECENTS_KEY = 'weather_recents'

const FavoritesContext = createContext(null)

const placeKey = place => `${place?.lat ?? ''},${place?.lon ?? ''},${place?.name ?? ''}`

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([])
  const [recents, setRecents] = useState([])

  useEffect(() => {
    let cancelled = false
    Promise.all([AsyncStorage.getItem(FAVORITES_KEY), AsyncStorage.getItem(RECENTS_KEY)])
      .then(([f, r]) => {
        if (cancelled) return
        if (f) setFavorites(JSON.parse(f))
        if (r) setRecents(JSON.parse(r))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const toggleFavorite = useCallback(place => {
    setFavorites(prev => {
      const exists = prev.some(f => placeKey(f) === placeKey(place))
      const next = exists ? prev.filter(f => placeKey(f) !== placeKey(place)) : [...prev, place]
      AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const pushRecent = useCallback(place => {
    setRecents(prev => {
      const next = [place, ...prev.filter(p => placeKey(p) !== placeKey(place))].slice(0, 8)
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ favorites, recents, toggleFavorite, pushRecent }),
    [favorites, recents, toggleFavorite, pushRecent]
  )
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
