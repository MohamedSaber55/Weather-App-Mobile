import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, AppState, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Location from 'expo-location'
import Header from '../components/Header'
import SearchOverlay from '../components/SearchOverlay'
import SettingsSheet from '../components/SettingsSheet'
import PlacesSheet from '../components/PlacesSheet'
import MapPicker from '../components/MapPicker'
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
import { GAP, label, mono, RADIUS, RTL, useStyles } from '../theme'
import { useNetworkState } from 'expo-network'
import { useWeather } from '../hooks/useWeather'
import { useI18n, useSettings } from '../context/SettingsContext'
import { useFavorites } from '../context/FavoritesContext'
import { getSearchResults } from '../lib/api'
import { cacheSummary } from '../widget/data'
import { registerBackgroundRefresh, updateAllWidgets } from '../widget/refresh'
import { syncStatusBarNotification } from '../lib/notifications'
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
  statusText: { ...mono(t, 10), color: t.dim, textTransform: RTL ? 'none' : 'uppercase', flexShrink: 1 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: t.cyan },
  liveText: { ...mono(t, 10), color: t.muted, textTransform: RTL ? 'none' : 'uppercase' },
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
  footerText: { ...mono(t, 9), color: t.dim, textTransform: RTL ? 'none' : 'uppercase', flexShrink: 1 },
})

export default function Dashboard() {
  const { styles, theme } = useStyles(makeStyles)
  const { settings } = useSettings()
  const { t, days: dayNames, months } = useI18n()

  // "4 min ago" / "2 h ago" — how old the reading on screen is
  const ago = timestamp => {
    if (!timestamp) return t('time.unknown')
    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000))
    if (minutes < 1) return t('time.justNow')
    if (minutes < 60) return t('time.minutes', { count: minutes })
    const hours = Math.round(minutes / 60)
    if (hours < 24) return t('time.hours', { count: hours })
    const dayCount = Math.round(hours / 24)
    return dayCount === 1 ? t('time.yesterday') : t('time.days', { count: dayCount })
  }
  const { favorites, defaultPlace, loaded: placesLoaded, toggleFavorite, addFavorite, setDefaultPlace, pushRecent } = useFavorites()
  const [query, setQuery] = useState(DEFAULT_CITY)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [placesOpen, setPlacesOpen] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState(null)
  const [width, setWidth] = useState(0)
  const appState = useRef(AppState.currentState)
  const addingPlace = useRef(false)

  const { status, data, error, stale, cachedAt, offline, reload, refresh } = useWeather(query, settings.language)
  const network = useNetworkState()
  const noConnection =
    offline || network?.isConnected === false || network?.isInternetReachable === false

  useEffect(() => {
    registerBackgroundRefresh()
  }, [])

  useEffect(() => {
    if (!data) return
    let cancelled = false
    cacheSummary(data, settings)
      .then(summary => {
        if (cancelled || !summary) return
        updateAllWidgets(summary)
        return syncStatusBarNotification(summary)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [data, settings])

  useEffect(() => {
    if (!placesLoaded) return
    if (defaultPlace) {
      setQuery(placeQuery(defaultPlace))
      return
    }
    AsyncStorage.getItem(CITY_KEY)
      .then(saved => {
        if (saved) setQuery(saved)
      })
      .catch(() => {})
    // only decides the opening location, so it runs once the saved places are read
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesLoaded])

  useEffect(() => {
    const timer = setInterval(() => {
      if (!noConnection) refresh()
    }, REFRESH_MS)
    const sub = AppState.addEventListener('change', next => {
      if (appState.current.match(/inactive|background/) && next === 'active') refresh()
      appState.current = next
    })
    return () => {
      clearInterval(timer)
      sub.remove()
    }
  }, [refresh, noConnection])

  const wasOffline = useRef(false)
  useEffect(() => {
    if (wasOffline.current && !noConnection) refresh()
    wasOffline.current = noConnection
  }, [noConnection, refresh])

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

  const handleAddPlace = useCallback(
    place => {
      addFavorite(place)
      handleSelectPlace(place)
    },
    [addFavorite, handleSelectPlace]
  )

  const handleUseCurrentLocation = async () => {
    setNotice(null)
    setLocating(true)
    try {
      const { status: permission } = await Location.requestForegroundPermissionsAsync()
      if (permission !== 'granted') {
        setNotice(t('notice.locationDenied'))
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
      setNotice(t('notice.locationFailed'))
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
          onOpenPlaces={() => setPlacesOpen(true)}
          defaultName={defaultPlace?.name}
        />

        <View style={styles.statusbar}>
          <Text style={styles.statusText} numberOfLines={1}>
            {location
              ? `${dateStamp(location.localtime, { days: dayNames, months })} · ${formatTime(location.localtime, settings.hourFormat)} ${t('status.local')}`
              : t('status.connecting')}
          </Text>
          <View style={styles.live}>
            <View
              style={[
                styles.dot,
                status === 'loading' && { opacity: 0.4 },
                noConnection && { backgroundColor: theme.dim },
              ]}
            />
            <Text style={styles.liveText}>
              {noConnection
                ? t('status.offline', { age: ago(cachedAt) })
                : updated
                  ? `${t('status.updated', { time: formatTime(updated, settings.hourFormat) })} · ${t('status.next', { time: addMinutes(updated, 15, settings.hourFormat) })}`
                  : t('status.fetching')}
            </Text>
          </View>
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Icon name="alert" size={14} color={theme.muted} />
            <Text style={styles.noticeText}>{notice}</Text>
            <Pressable onPress={() => setNotice(null)} accessibilityRole="button">
              <Text style={[styles.retryText, { color: theme.muted }]}>{t('error.dismiss')}</Text>
            </Pressable>
          </View>
        ) : null}

        {noConnection && data ? (
          <View style={styles.notice}>
            <Icon name="alert" size={14} color={theme.muted} />
            <Text style={styles.noticeText}>{t('offline.banner', { age: ago(cachedAt) })}</Text>
            <Pressable onPress={reload} accessibilityRole="button">
              <Text style={[styles.retryText, { color: theme.amber }]}>{t('error.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {error && data && !noConnection ? (
          <View style={styles.notice}>
            <Icon name="alert" size={14} color={theme.amber} />
            <Text style={styles.noticeText}>{error.message}</Text>
            <Pressable onPress={reload} accessibilityRole="button">
              <Text style={[styles.retryText, { color: theme.amber }]}>{t('error.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {status === 'loading' && !data ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.amber} />
            <Text style={styles.statusText}>{t('app.loading')}</Text>
          </View>
        ) : null}

        {status === 'error' && !data ? (
          <Tile label={noConnection ? t('offline.title') : t('error.title')} meta={t('meta.noData')}>
            <Note>{noConnection ? t('offline.firstRunMobile') : error?.message || t('error.body')}</Note>
            <Pressable style={styles.retry} onPress={reload} accessibilityRole="button">
              <Icon name="rotate" size={13} color={theme.text} />
              <Text style={styles.retryText}>{t('error.retry')}</Text>
            </Pressable>
          </Tile>
        ) : null}

        {data && current && today ? (
          <>
            {alert ? (
              <View style={[styles.alert, { borderColor: theme.amber }]}>
                <Text style={[styles.alertTag, { backgroundColor: theme.amber }]}>{t('alert.tag')}</Text>
                <Text style={styles.alertTitle}>{alert.event || alert.headline || t('alert.title')}</Text>
                <Text style={styles.alertMeta}>
                  {[alert.areas, alert.expires ? t('alert.until', { time: formatTime(alert.expires, settings.hourFormat) }) : null]
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
            <RadarTile lat={location.lat} lon={location.lon} name={location.name} offline={noConnection} />

            <View style={styles.footer}>
              <Text style={styles.footerText} numberOfLines={1}>
                {t('footer.source')}
              </Text>
              <Text style={styles.footerText}>
                °{settings.tempUnit} · {speedLabel(settings.speedUnit)} · {settings.hourFormat}h
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>

      <SearchOverlay
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={place => {
          if (addingPlace.current) {
            addingPlace.current = false
            handleAddPlace(place)
          } else {
            handleSelectPlace(place)
          }
        }}
      />

      <PlacesSheet
        visible={placesOpen}
        onClose={() => setPlacesOpen(false)}
        onSelectPlace={handleSelectPlace}
        currentName={location?.name}
        onAddBySearch={() => {
          addingPlace.current = true
          setPlacesOpen(false)
          setTimeout(() => setSearchOpen(true), 250)
        }}
        onAddByMap={() => {
          setPlacesOpen(false)
          setTimeout(() => setMapOpen(true), 250)
        }}
      />

      <MapPicker
        visible={mapOpen}
        onClose={() => setMapOpen(false)}
        onPick={handleAddPlace}
        initial={location ? { lat: location.lat, lon: location.lon } : null}
      />
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onUseCurrentLocation={handleUseCurrentLocation}
        locating={locating}
      />
    </SafeAreaView>
  )
}
