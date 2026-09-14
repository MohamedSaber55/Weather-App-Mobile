import AsyncStorage from '@react-native-async-storage/async-storage'
import { getWeather } from '../lib/api'
import { conditionIconName } from '../components/Icons'
import { aqiLevel, uvLevel } from '../lib/conditions'
import { clockHours, fixed1, formatTime, parseClock, speedLabel, speedValue, tempValue } from '../lib/units'

const CACHE_KEY = 'weather_widget_cache'
const CITY_KEY = 'city'
const SETTINGS_KEY = 'weather_settings'
const DEFAULT_CITY = 'beni suef'
const FRESH_MS = 20 * 60 * 1000

const DEFAULT_SETTINGS = { tempUnit: 'C', speedUnit: 'kmh', hourFormat: 24, theme: 'dark' }

async function readSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

// Flatten the API response into the few values widgets and the notification need,
// so neither has to know about WeatherAPI's shape.
export function summarize(data, settings) {
  const location = data?.location
  const current = data?.current
  const days = data?.forecast?.forecastday || []
  const today = days[0]
  if (!location || !current || !today) return null

  const unit = settings.tempUnit
  const nowHour = clockHours(location.localtime) ?? 0
  const isDay = current.is_day === 1

  const hours = (today.hour || [])
    .filter(h => {
      const c = parseClock(h.time)
      return c && c.h > Math.floor(nowHour)
    })
    .slice(0, 6)
    .map(h => ({
      label: formatTime(h.time, settings.hourFormat).replace(/:00$/, ''),
      temp: Math.round(tempValue(h.temp_c, unit)),
      icon: conditionIconName(h.condition.code, h.is_day === 1, h.condition.text),
      rain: h.chance_of_rain ?? 0,
    }))

  const aqi = current.air_quality?.['us-epa-index']

  return {
    city: location.name,
    country: location.country,
    localtime: location.localtime,
    updated: formatTime(current.last_updated || location.localtime, settings.hourFormat),
    unit,
    temp: Math.round(tempValue(current.temp_c, unit)),
    tempPrecise: fixed1(tempValue(current.temp_c, unit)),
    feels: Math.round(tempValue(current.feelslike_c, unit)),
    hi: Math.round(tempValue(today.day.maxtemp_c, unit)),
    lo: Math.round(tempValue(today.day.mintemp_c, unit)),
    condition: current.condition.text,
    icon: conditionIconName(current.condition.code, isDay, current.condition.text),
    isDay,
    humidity: current.humidity,
    wind: `${Math.round(speedValue(current.wind_kph ?? 0, settings.speedUnit))} ${speedLabel(settings.speedUnit)}`,
    rain: today.day.daily_chance_of_rain ?? 0,
    uv: typeof current.uv === 'number' ? Math.round(current.uv) : null,
    uvLabel: typeof current.uv === 'number' ? uvLevel(current.uv).label : null,
    aqi: aqi != null ? aqiLevel(aqi).index : null,
    aqiLabel: aqi != null ? aqiLevel(aqi).label : null,
    sunrise: formatTime(today.astro?.sunrise, settings.hourFormat),
    sunset: formatTime(today.astro?.sunset, settings.hourFormat),
    hours,
    days: days.slice(0, 4).map((fd, i) => ({
      label: i === 0 ? 'Today' : new Date(`${fd.date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
      hi: Math.round(tempValue(fd.day.maxtemp_c, unit)),
      lo: Math.round(tempValue(fd.day.mintemp_c, unit)),
      icon: conditionIconName(fd.day.condition.code, true, fd.day.condition.text),
      rain: fd.day.daily_chance_of_rain ?? 0,
    })),
    theme: settings.theme,
    savedAt: Date.now(),
  }
}

export async function cacheSummary(data, settings) {
  const summary = summarize(data, settings)
  if (summary) await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(summary)).catch(() => {})
  return summary
}

// Widgets and the notification read the cache the app writes; only when that is
// missing or stale do they spend an API call of their own.
export async function loadWidgetData({ force = false } = {}) {
  let cached = null
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    cached = raw ? JSON.parse(raw) : null
  } catch {
    cached = null
  }

  if (!force && cached && Date.now() - (cached.savedAt || 0) < FRESH_MS) return cached

  try {
    const settings = await readSettings()
    const city = (await AsyncStorage.getItem(CITY_KEY)) || DEFAULT_CITY
    const data = await getWeather(city, { days: 4, aqi: true, alerts: false })
    const summary = await cacheSummary(data, settings)
    return summary || cached
  } catch {
    return cached
  }
}
