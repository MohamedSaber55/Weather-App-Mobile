import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { I18nManager } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { calendar, isRtl, translator } from '../lib/i18n'

const KEY = 'weather_settings'

const DEFAULTS = {
  tempUnit: 'C',
  speedUnit: 'kmh',
  distanceUnit: 'km',
  pressureUnit: 'hPa',
  hourFormat: 24,
  theme: 'dark',
  statusBar: false,
  language: 'en',
}

const SettingsContext = createContext(null)

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  // true once the language needs a restart for the layout to mirror
  const [restartNeeded, setRestartNeeded] = useState(false)

  useEffect(() => {
    let cancelled = false
    AsyncStorage.getItem(KEY)
      .then(raw => {
        if (cancelled) return
        const next = raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS
        setSettings(next)
        applyDirection(next.language, false)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // React Native mirrors the layout process-wide, and only after a restart
  const applyDirection = (language, markRestart = true) => {
    const wantsRtl = isRtl(language)
    if (I18nManager.isRTL === wantsRtl) return false
    try {
      I18nManager.allowRTL(wantsRtl)
      I18nManager.forceRTL(wantsRtl)
      if (markRestart) setRestartNeeded(true)
      return true
    } catch {
      return false
    }
  }

  const update = useCallback(patch => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {})
      if (patch.language && patch.language !== prev.language) applyDirection(patch.language)
      return next
    })
  }, [])

  const value = useMemo(() => ({ settings, update, loaded, restartNeeded }), [settings, update, loaded, restartNeeded])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

/** t() for the current language, plus its direction and month/day names */
export function useI18n() {
  const { settings } = useSettings()
  return useMemo(
    () => ({
      t: translator(settings.language),
      language: settings.language,
      rtl: isRtl(settings.language),
      ...calendar(settings.language),
    }),
    [settings.language]
  )
}
