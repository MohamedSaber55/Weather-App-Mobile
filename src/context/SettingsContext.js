import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

const KEY = 'weather_settings'

const DEFAULTS = {
  tempUnit: 'C',
  speedUnit: 'kmh',
  distanceUnit: 'km',
  pressureUnit: 'hPa',
  hourFormat: 24,
  theme: 'dark',
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (cancelled) return
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) })
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const update = useCallback(patch => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const value = useMemo(() => ({ settings, update, loaded }), [settings, update, loaded])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
