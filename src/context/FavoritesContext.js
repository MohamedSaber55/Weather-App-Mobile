import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const FAVORITES_KEY = 'weather_favorites'
const RECENTS_KEY = 'weather_recents'
const DEFAULT_KEY = 'weather_default_place'

const FavoritesContext = createContext(null)

export const placeKey = place => `${place?.lat ?? ''},${place?.lon ?? ''},${place?.name ?? ''}`

export function FavoritesProvider({ children }) {
  const [favorites, setFavorites] = useState([])
  const [recents, setRecents] = useState([])
  const [defaultPlace, setDefaultPlaceState] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      AsyncStorage.getItem(FAVORITES_KEY),
      AsyncStorage.getItem(RECENTS_KEY),
      AsyncStorage.getItem(DEFAULT_KEY),
    ])
      .then(([f, r, d]) => {
        if (cancelled) return
        if (f) setFavorites(JSON.parse(f))
        if (r) setRecents(JSON.parse(r))
        if (d) setDefaultPlaceState(JSON.parse(d))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const persistFavorites = next => {
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {})
    return next
  }

  const toggleFavorite = useCallback(place => {
    setFavorites(prev => {
      const exists = prev.some(f => placeKey(f) === placeKey(place))
      return persistFavorites(exists ? prev.filter(f => placeKey(f) !== placeKey(place)) : [...prev, place])
    })
  }, [])

  const addFavorite = useCallback(place => {
    setFavorites(prev =>
      prev.some(f => placeKey(f) === placeKey(place)) ? prev : persistFavorites([...prev, place])
    )
  }, [])

  const removeFavorite = useCallback(place => {
    setFavorites(prev => persistFavorites(prev.filter(f => placeKey(f) !== placeKey(place))))
    setDefaultPlaceState(prev => {
      if (!prev || placeKey(prev) !== placeKey(place)) return prev
      AsyncStorage.removeItem(DEFAULT_KEY).catch(() => {})
      return null
    })
  }, [])

  // the place the app opens on, and what the home button returns to
  const setDefaultPlace = useCallback(place => {
    setDefaultPlaceState(place)
    if (place) AsyncStorage.setItem(DEFAULT_KEY, JSON.stringify(place)).catch(() => {})
    else AsyncStorage.removeItem(DEFAULT_KEY).catch(() => {})
    if (place) addFavorite(place)
  }, [addFavorite])

  const pushRecent = useCallback(place => {
    setRecents(prev => {
      const next = [place, ...prev.filter(p => placeKey(p) !== placeKey(place))].slice(0, 8)
      AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const value = useMemo(
    () => ({
      favorites,
      recents,
      defaultPlace,
      loaded,
      toggleFavorite,
      addFavorite,
      removeFavorite,
      setDefaultPlace,
      pushRecent,
    }),
    [favorites, recents, defaultPlace, loaded, toggleFavorite, addFavorite, removeFavorite, setDefaultPlace, pushRecent]
  )
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
