import { useCallback, useEffect, useRef, useState } from 'react'
import * as Network from 'expo-network'
import { getWeather } from '../lib/api'
import { loadCachedWeather, saveCachedWeather } from '../lib/weatherCache'

const TTL = 5 * 60 * 1000

async function isOffline() {
  try {
    const state = await Network.getNetworkStateAsync()
    // isInternetReachable is undefined on some devices — only trust an explicit false
    return state.isConnected === false || state.isInternetReachable === false
  } catch {
    return false
  }
}

export function useWeather(query, language = 'en') {
  const [state, setState] = useState({
    status: 'loading',
    data: null,
    error: null,
    stale: false,
    cachedAt: null,
    offline: false,
  })
  const [reloadKey, setReloadKey] = useState(0)
  const cacheRef = useRef(new Map())
  const silentRef = useRef(false)

  const key = `${String(query || '').trim().toLowerCase()}|${language}`

  useEffect(() => {
    if (!key) return undefined
    const controller = new AbortController()
    let cancelled = false

    // a silent refresh keeps the current dashboard on screen while new data loads
    const silent = silentRef.current
    silentRef.current = false

    const cached = cacheRef.current.get(key)
    if (cached && Date.now() - cached.ts < TTL) {
      setState({ status: 'success', data: cached.data, error: null, stale: false, cachedAt: cached.ts, offline: false })
      return undefined
    }

    setState(prev => ({
      status: 'loading',
      data: cached ? cached.data : prev.data,
      error: null,
      stale: Boolean(cached) || (silent && Boolean(prev.data)),
      cachedAt: cached ? cached.ts : prev.cachedAt,
      offline: false,
    }))

    // show the last reading from disk right away, before the network answers
    if (!cached) {
      loadCachedWeather(key).then(entry => {
        if (cancelled || !entry) return
        setState(prev =>
          prev.data
            ? prev
            : { status: 'success', data: entry.data, error: null, stale: true, cachedAt: entry.ts, offline: false }
        )
      })
    }

    const run = async () => {
      if (await isOffline()) {
        if (cancelled) return
        const entry = cached ? { data: cached.data, ts: cached.ts } : await loadCachedWeather(key)
        if (cancelled) return
        setState(prev => ({
          status: entry || prev.data ? 'success' : 'error',
          data: entry ? entry.data : prev.data,
          error: new Error('No internet connection'),
          stale: true,
          cachedAt: entry ? entry.ts : prev.cachedAt,
          offline: true,
        }))
        return
      }

      try {
        const data = await getWeather(query, { days: 7, aqi: true, alerts: true, lang: language, signal: controller.signal })
        if (controller.signal.aborted || cancelled) return
        cacheRef.current.set(key, { data, ts: Date.now() })
        saveCachedWeather(key, data)
        setState({ status: 'success', data, error: null, stale: false, cachedAt: Date.now(), offline: false })
      } catch (err) {
        if (controller.signal.aborted || cancelled) return
        const entry = cached ? { data: cached.data, ts: cached.ts } : await loadCachedWeather(key)
        if (cancelled) return
        const offline = await isOffline()
        setState(prev => ({
          status: entry || prev.data ? 'success' : 'error',
          data: entry ? entry.data : prev.data,
          error: offline ? new Error('No internet connection') : err,
          stale: true,
          cachedAt: entry ? entry.ts : prev.cachedAt,
          offline,
        }))
      }
    }

    run()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [key, query, language, reloadKey])

  const reload = useCallback(() => {
    cacheRef.current.delete(key)
    setReloadKey(k => k + 1)
  }, [key])

  const refresh = useCallback(() => {
    silentRef.current = true
    cacheRef.current.delete(key)
    setReloadKey(k => k + 1)
  }, [key])

  return { ...state, reload, refresh }
}

export default useWeather
