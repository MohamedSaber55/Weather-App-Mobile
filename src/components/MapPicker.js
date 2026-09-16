import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Modal, Platform, Pressable, Text, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { Icon } from './Icons'
import { IconButton } from './Tile'
import { FONTS, label, mono, RADIUS, useStyles, useTheme } from '../theme'
import { getSearchResults } from '../lib/api'
import { coordsLabel } from '../lib/units'

const WebView = Platform.OS === 'web' ? null : require('react-native-webview').WebView

const makeStyles = t => ({
  screen: { flex: 1, backgroundColor: t.bg },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  title: label(t, 12),
  map: { flex: 1, backgroundColor: t.sunken },
  hint: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: t.panel,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: RADIUS,
    ...mono(t, 11),
    color: t.muted,
    textAlign: 'center',
    overflow: 'hidden',
  },
  footer: {
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: t.border,
    backgroundColor: t.panel,
  },
  picked: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pickedText: { flex: 1, minWidth: 0 },
  pickedName: { fontFamily: FONTS.condBold, fontSize: 16, letterSpacing: 0.4, textTransform: 'uppercase', color: t.text },
  pickedCoords: { ...mono(t, 11), color: t.dim, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 4,
    backgroundColor: t.sunken,
  },
  buttonPrimary: { backgroundColor: t.amber, borderColor: t.amber },
  buttonText: { ...label(t, 12), color: t.text },
  buttonPrimaryText: { ...label(t, 12), color: '#0b0d10' },
})

function buildHtml({ lat, lon, theme }) {
  const filter =
    theme.mode === 'light'
      ? 'saturate(0.35) brightness(1.03) contrast(0.95)'
      : 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.95) saturate(0.45)'
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  html, body, #map { margin: 0; height: 100%; background: ${theme.sunken}; }
  .leaflet-tile-pane { filter: ${filter}; }
  .leaflet-control-attribution { background: ${theme.panel}; color: ${theme.dim}; font-size: 9px; font-family: monospace; }
  .leaflet-control-attribution a { color: ${theme.muted}; }
  .leaflet-control-zoom a { background: ${theme.panel}; color: ${theme.text}; border-color: ${theme.border}; }
  .wx-pin { color: ${theme.amber}; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { center: [${lat}, ${lon}], zoom: 9, zoomControl: true, attributionControl: true });
  map.attributionControl.setPrefix(false);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  var icon = L.divIcon({ className: 'wx-pin', iconSize: [34, 34], iconAnchor: [17, 17],
    html: '<svg width="34" height="34" viewBox="0 0 34 34"><circle cx="17" cy="17" r="7" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="17" r="2.5" fill="currentColor"/><path d="M17 0v6M17 28v6M0 17h6M28 17h6" stroke="currentColor" stroke-width="2"/></svg>' });
  var marker = null;
  function place(lat, lng) {
    if (marker) marker.setLatLng([lat, lng]);
    else marker = L.marker([lat, lng], { icon: icon, interactive: false }).addTo(map);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lon: lng }));
    }
  }
  map.on('click', function (e) { place(e.latlng.lat, e.latlng.lng); });
  window.centerOn = function (lat, lng) { map.setView([lat, lng], 11); place(lat, lng); };
  true;
</script>
</body>
</html>`
}

function Picker({ onClose, onPick, initial }) {
  const { styles, theme } = useStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const webRef = useRef(null)
  const [picked, setPicked] = useState(null)
  const [name, setName] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [locating, setLocating] = useState(false)

  const html = useMemo(
    () => buildHtml({ lat: initial?.lat ?? 26.8, lon: initial?.lon ?? 30.8, theme }),
    [initial?.lat, initial?.lon, theme]
  )

  // ask WeatherAPI what it calls this spot, so the saved place has a real name
  useEffect(() => {
    if (!picked) return undefined
    let cancelled = false
    setResolving(true)
    setName(null)
    const timer = setTimeout(() => {
      getSearchResults(`${picked.lat},${picked.lon}`, 1)
        .then(results => {
          if (cancelled) return
          setName(results?.[0] || null)
          setResolving(false)
        })
        .catch(() => {
          if (!cancelled) setResolving(false)
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [picked])

  const useMyLocation = async () => {
    setLocating(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') return
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude, longitude } = position.coords
      webRef.current?.injectJavaScript(`window.centerOn(${latitude}, ${longitude}); true;`)
      setPicked({ lat: latitude, lon: longitude })
    } catch {
      // permission refused or no fix — the user can still tap the map
    } finally {
      setLocating(false)
    }
  }

  const confirm = () => {
    if (!picked) return
    onPick({
      name: name?.name || `${picked.lat.toFixed(2)}, ${picked.lon.toFixed(2)}`,
      region: name?.region,
      country: name?.country,
      lat: picked.lat,
      lon: picked.lon,
    })
    onClose()
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.head}>
        <Text style={styles.title}>Pick a place on the map</Text>
        <IconButton name="close" onPress={onClose} accessibilityLabel="Close map" />
      </View>

      <View style={styles.map}>
        {WebView ? (
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://tile.openstreetmap.org' }}
            javaScriptEnabled
            domStorageEnabled
            onMessage={event => {
              try {
                const point = JSON.parse(event.nativeEvent.data)
                if (typeof point?.lat === 'number') setPicked(point)
              } catch {
                // ignore anything that is not a coordinate
              }
            }}
            style={{ backgroundColor: theme.sunken }}
          />
        ) : null}
        {!picked ? <Text style={styles.hint}>Tap anywhere on the map</Text> : null}
      </View>

      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.picked}>
          <Icon name="pin" size={18} color={picked ? theme.amber : theme.dim} />
          <View style={styles.pickedText}>
            <Text style={styles.pickedName} numberOfLines={1}>
              {picked ? name?.name || (resolving ? 'Looking up…' : 'Dropped pin') : 'No place chosen'}
            </Text>
            <Text style={styles.pickedCoords}>
              {picked
                ? [coordsLabel(picked.lat, picked.lon), name?.region, name?.country].filter(Boolean).join(' · ')
                : 'Tap the map, or use your location'}
            </Text>
          </View>
          {resolving ? <ActivityIndicator size="small" color={theme.dim} /> : null}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.button} onPress={useMyLocation} disabled={locating} accessibilityRole="button">
            <Icon name={locating ? 'rotate' : 'locate'} size={14} color={theme.text} />
            <Text style={styles.buttonText}>{locating ? 'Locating…' : 'My location'}</Text>
          </Pressable>
          <Pressable
            style={[styles.button, picked && styles.buttonPrimary]}
            onPress={confirm}
            disabled={!picked}
            accessibilityRole="button"
          >
            <Icon name="plus" size={14} color={picked ? '#0b0d10' : theme.dim} />
            <Text style={picked ? styles.buttonPrimaryText : styles.buttonText}>Save place</Text>
          </Pressable>
        </View>
      </View>
    </View>
  )
}

export default function MapPicker({ visible, onClose, onPick, initial }) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
        <Picker onClose={onClose} onPick={onPick} initial={initial} />
      </SafeAreaProvider>
    </Modal>
  )
}
