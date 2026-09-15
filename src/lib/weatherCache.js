import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'weather_cache:'
const LAST_KEY = 'weather_cache_last'

/**
 * The last full API response per location, kept on disk so the app has something
 * to show when it is opened without a connection. `useWeather` keeps its own
 * in-memory cache for the session; this one survives the app being killed.
 */
export async function saveCachedWeather(key, data) {
  const entry = JSON.stringify({ data, ts: Date.now() })
  try {
    await AsyncStorage.multiSet([
      [PREFIX + key, entry],
      [LAST_KEY, key],
    ])
  } catch {
    // out of space or storage unavailable — the app just loses its offline copy
  }
}

async function read(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key)
    if (!raw) return null
    const entry = JSON.parse(raw)
    return entry?.data ? entry : null
  } catch {
    return null
  }
}

/**
 * Cached weather for this location, or — when that location was never loaded —
 * whatever was shown last, so an offline start is never empty.
 */
export async function loadCachedWeather(key) {
  const exact = await read(key)
  if (exact) return { ...exact, exact: true }

  try {
    const lastKey = await AsyncStorage.getItem(LAST_KEY)
    if (!lastKey || lastKey === key) return null
    const fallback = await read(lastKey)
    return fallback ? { ...fallback, exact: false } : null
  } catch {
    return null
  }
}
