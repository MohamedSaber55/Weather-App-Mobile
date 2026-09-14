import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import Header from '../components/Header'
import SearchOverlay from '../components/SearchOverlay'
import SettingsSheet from '../components/SettingsSheet'
import ChartTile from '../components/tiles/ChartTile'
import ForecastTile from '../components/tiles/ForecastTile'
import RadarTile from '../components/tiles/RadarTile'
import {
  AdvisoriesTile,
  AirQualityTile,
  ConditionTile,
  HumidityTile,
  MoonTile,
  PressureTile,
  SunTile,
  TemperatureTile,
  UvTile,
  WindTile,
} from '../components/tiles/Readings'
import { Icon } from '../components/Icons'
import { Note, Tile } from '../components/Tile'
import { GAP, label, mono, RADIUS, useStyles } from '../theme'
import { useWeather } from '../hooks/useWeather'
import { useSettings } from '../context/SettingsContext'
import { useFavorites } from '../context/FavoritesContext'
import { getSearchResults } from '../lib/api'
import { addMinutes, clockHours, dateStamp, formatTime, speedLabel } from '../lib/units'

const DEFAULT_CITY = 'beni suef'
const CITY_KEY = 'city'
const REFRESH_MS = 10 * 60 * 1000

// WeatherAPI accepts an id, "lat,lon" or a plain name — prefer the most precise one
function placeQuery(place) {
  if (!place) return DEFAULT_CITY
  if (place.id) return `id:${place.id}`
  if (typeof place.lat === 'number' && typeof place.lon === 'number') return `${place.lat},${place.lon}`
  return place.name || String(place)
}

const makeStyles = t => ({
  screen: { flex: 1, backgroundColor: t.bg },
  content: { padding: 12, gap: GAP, paddingBottom: 28 },
  statusbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingHorizontal: 4, paddingVertical: 8 },
  statusText: { ...mono(t, 10), color: t.dim, textTransform: 'uppercase', flexShrink: 1 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.cyan },
  liveText: { ...mono(t, 10), color: t.muted, textTransform: 'uppercase' },
  row: { flexDirection: 'row', gap: GAP, alignItems: 'stretch' },
  half: { flex: 1, minWidth: 0 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: t.panel,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: RADIUS,
  },
  noticeText: { flex: 1, ...mono(t, 12), color: t.muted },
  alert: {
    gap: 6,
    padding: 12,
    backgroundColor: t.panel,
    borderWidth: 1,
    borderRadius: RADIUS,
  },
  alertTag: { ...label(t, 10), alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3, color: '#0b0d10' },
  alertTitle: { ...mono(t, 14, 'medium') },
  alertMeta: { ...label(t, 11), color: t.dim },
  center: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  retry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 4,
    backgroundColor: t.sunken,
  },
  retryText: { ...label(t, 12), color: t.text },
  footer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingHorizontal: 4, paddingTop: 6 },
  footerText: { ...mono(t, 9), color: t.dim, textTransform: 'uppercase', flexShrink: 1 },
})

export default function Dashboard() {
  const { styles, theme } = useStyles(makeStyles)
  const { settings } = useSettings()
  const { favorites, toggleFavorite, pushRecent } = useFavorites()
  const [query, setQuery] = useState(DEFAULT_CITY)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState(null)
  const [width, setWidth] = useState(0)
  const appState = useRef(AppState.currentState)

  const { status, data, error, stale, reload, refresh } = useWeather(query)

  useEffect(() => {
    AsyncStorage.getItem(CITY_KEY)
      .then(saved => {
        if (saved) setQuery(saved)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setInterval(refresh, REFRESH_MS)
    const sub = AppState.addEventListener('change', next => {
      if (appState.current.match(/inactive|background/) && next === 'active') refresh()
      appState.current = next
    })
    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [refresh])

  const applyQuery = useCallback(value => {
    const next = value || DEFAULT_CITY
    setQuery(next)
    AsyncStorage.setItem(CITY_KEY, next).catch(() => {})
  }, [])

  const handleSelectPlace = useCallback(
    place => {
      applyQuery(placeQuery(place))
      pushRecent({
        name: place?.name || String(place),
        region: place?.region,
        country: place?.country,
        lat: place?.lat,
        lon: place?.lon,
        id: place?.id,
      })
    },
    [applyQuery, pushRecent]
  )

  const handleUseCurrentLocation = async () => {
    setNotice(null)
    setLocating(true)
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync()
      if (permission !== 'granted') {
        setNotice('Location permission denied. Search for a city instead.')
        return
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = position.coords
      try {
        const results = await getSearchResults(`${latitude},${longitude}`, 1)
        handleSelectPlace(results[0] || { name: `${latitude},${longitude}` })
      } catch {
        applyQuery(`${latitude},${longitude}`)
      }
      setSettingsOpen(false)
    } catch {
      setNotice('Could not read your location. Search for a city instead.')
    } finally {
      setLocating(false)
    }
  }

  const location = data?.location
  const current = data?.current
  const days = data?.forecast?.forecastday || []
  const today = days[0]
  const nowHour = location ? clockHours(location.localtime) : null
  const currentHour = today?.hour?.[Math.floor(nowHour ?? 0)]
  const updated = current?.last_updated || location?.localtime
  const alert = data?.alerts?.alert?.[0]

  const isFavorite = Boolean(
    location && favorites.some(f => String(f.name).toLowerCase() === String(location.name).toLowerCase())
  )

  const handleToggleFavorite = () => {
    if (!location) return
    toggleFavorite({
      name: location.name,
      region: location.region,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
    })
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        onLayout={e => setWidth(e.nativeEvent.layout.width - 24)}
        refreshControl={
          <RefreshControl refreshing={status === 'loading' && Boolean(data)} onRefresh={reload} tintColor={theme.muted} colors={[theme.amber]} />
        }
      >
        <Header
          location={location}
          favorites={favorites}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          onSelectPlace={handleSelectPlace}
          onOpenSearch={() => setSearchOpen(true)}
          onOpenSettings={() => setSettingsOpen(true)}
        />

        <View style={styles.statusbar}>
          <Text style={styles.statusText} numberOfLines={1}>
            {location
              ? `${dateStamp(location.localtime)} · ${formatTime(location.localtime, settings.hourFormat)} local`
              : 'Connecting…'}
          </Text>
          <View style={styles.live}>
            <View style={[styles.dot, status === 'loading' && { opacity: 0.4 }]} />
            <Text style={styles.liveText}>
              {updated
                ? `Upd ${formatTime(updated, settings.hourFormat)} · Next ${addMinutes(updated, 15, settings.hourFormat)}`
                : 'Fetching…'}
            </Text>
          </View>
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Icon name="alert" size={14} color={theme.muted} />
            <Text style={styles.noticeText}>{notice}</Text>
            <Pressable onPress={() => setNotice(null)} accessibilityRole="button">
              <Text style={[styles.retryText, { color: theme.muted }]}>Dismiss</Text>
            </Pressable>
          </View>
        ) : null}

        {error && data ? (
          <View style={styles.notice}>
            <Icon name="alert" size={14} color={theme.amber} />
            <Text style={styles.noticeText}>{error.message}</Text>
            <Pressable onPress={reload} accessibilityRole="button">
              <Text style={[styles.retryText, { color: theme.amber }]}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {status === 'loading' && !data ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.amber} />
            <Text style={styles.statusText}>Loading weather…</Text>
          </View>
        ) : null}

        {status === 'error' && !data ? (
          <Tile label="Connection error" meta="No data">
            <Note>{error?.message || 'The weather service did not respond.'}</Note>
            <Pressable style={styles.retry} onPress={reload} accessibilityRole="button">
              <Icon name="rotate" size={13} color={theme.text} />
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </Tile>
        ) : null}

        {data && current && today ? (
          <>
            {alert ? (
              <View style={[styles.alert, { borderColor: theme.amber }]}>
                <Text style={[styles.alertTag, { backgroundColor: theme.amber }]}>Alert</Text>
                <Text style={styles.alertTitle}>{alert.event || alert.headline || 'Weather alert'}</Text>
                <Text style={styles.alertMeta}>
                  {[alert.areas, alert.expires ? `until ${formatTime(alert.expires, settings.hourFormat)}` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
              </View>
            ) : null}

            <TemperatureTile current={current} day={today.day} settings={settings} />
            <ConditionTile current={current} hour={currentHour} settings={settings} />

            <View style={styles.row}>
              <WindTile current={current} settings={settings} style={styles.half} />
              <HumidityTile current={current} settings={settings} style={styles.half} />
            </View>

            <ChartTile day={today} current={current} location={location} settings={settings} width={width} />
            <ForecastTile days={days} settings={settings} />

            <View style={styles.row}>
              <AirQualityTile airQuality={current.air_quality} style={styles.half} />
              <UvTile uv={current.uv} hours={today.hour} nowHour={nowHour} settings={settings} style={styles.half} />
            </View>

            <View style={styles.row}>
              <PressureTile current={current} settings={settings} style={styles.half} />
              <MoonTile astro={today.astro} settings={settings} style={styles.half} />
            </View>

            <AdvisoriesTile current={current} day={today.day} />
            <SunTile astro={today.astro} localtime={location.localtime} settings={settings} width={width - 28} />
            <RadarTile lat={location.lat} lon={location.lon} name={location.name} />

            <View style={styles.footer}>
              <Text style={styles.footerText} numberOfLines={1}>
                Src weatherapi · Radar rainviewer · Map OSM
              </Text>
              <Text style={styles.footerText}>
                °{settings.tempUnit} · {speedLabel(settings.speedUnit)} · {settings.hourFormat}h
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <SearchOverlay visible={searchOpen} onClose={() => setSearchOpen(false)} onSelect={handleSelectPlace} />
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUseCurrentLocation={handleUseCurrentLocation}
        locating={locating}
      />
    </SafeAreaView>
  )
}
