import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { IconButton, Note, Tile } from '../Tile'
import { mono, useStyles } from '../../theme'
import { coordsLabel } from '../../lib/units'

// react-native-webview has no web build; the web preview shows a note instead
const WebView = Platform.OS === 'web' ? null : require('react-native-webview').WebView

const RAINVIEWER_META = 'https://api.rainviewer.com/public/weather-maps.json'
const OPACITY_STEPS = [1, 0.75, 0.5, 0.25]
const ZOOM = 7

const escapeHtml = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// weather-maps.json lists frames as {time, path}; older payloads used bare timestamps
function readFrames(meta) {
  const host = meta?.host || 'https://tilecache.rainviewer.com'
  const toFrame = f => {
    const time = typeof f === 'object' && f ? f.time : f
    const path = typeof f === 'object' && f ? f.path : `/v2/radar/${f}`
    return { time, url: `${host}${path}/256/{z}/{x}/{y}/2/1_1.png` }
  }
  const past = (meta?.radar?.past || []).map(toFrame)
  const nowcast = (meta?.radar?.nowcast || []).map(toFrame)
  return { frames: [...past, ...nowcast], latest: past.length - 1 }
}

// A Leaflet map in a WebView: the same basemap and CSS filter as the web app,
// so the graphite look and the radar colors match exactly.
function buildHtml({ lat, lon, name, theme }) {
  const filter =
    theme.mode === 'light'
      ? 'saturate(0.35) brightness(1.03) contrast(0.95)'
      : 'invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.95) saturate(0.45)';
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
  .wx-grid { position: absolute; inset: 0; pointer-events: none; z-index: 800;
    background-image: linear-gradient(${theme.border} 1px, transparent 1px), linear-gradient(90deg, ${theme.border} 1px, transparent 1px);
    background-size: 60px 60px; opacity: 0.3; }
  .wx-marker { color: ${theme.amber}; }
  .wx-marker span { position: absolute; left: 42px; top: 50%; transform: translateY(-50%);
    font-family: monospace; font-size: 11px; text-transform: uppercase; color: ${theme.text};
    text-shadow: 0 1px 4px ${theme.bg}, 0 0 2px ${theme.bg}; white-space: nowrap; }
</style>
</head>
<body>
<div id="map"></div>
<div class="wx-grid"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { center: [${lat}, ${lon}], zoom: ${ZOOM}, zoomControl: false, attributionControl: true });
  map.attributionControl.setPrefix(false);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
  var icon = L.divIcon({ className: 'wx-marker', iconSize: [36, 36], iconAnchor: [18, 18],
    html: '<svg width="36" height="36" viewBox="0 0 36 36"><rect x="9" y="9" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M0 18H9M27 18H36M18 0V9M18 27V36" stroke="currentColor" stroke-width="1.5"/></svg><span>${escapeHtml(name)}</span>' });
  L.marker([${lat}, ${lon}], { icon: icon, interactive: false }).addTo(map);
  var radar = null;
  window.setRadar = function (url, opacity) {
    var next = L.tileLayer(url, { opacity: opacity, zIndex: 500, maxNativeZoom: ${ZOOM}, maxZoom: 19, attribution: 'Radar &copy; RainViewer' });
    next.addTo(map);
    var prev = radar;
    radar = next;
    if (prev) map.removeLayer(prev);
  };
  window.setOpacity = function (opacity) { if (radar) radar.setOpacity(opacity); };
  true;
</script>
</body>
</html>`
}

const makeStyles = t => ({
  map: {
    height: 240,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: t.sunken,
  },
  coords: { position: 'absolute', left: 10, bottom: 8, ...mono(t, 10), color: t.dim },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  frames: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, flex: 1, height: 20 },
  frame: { flex: 1, height: 20, justifyContent: 'flex-end' },
  frameBar: { height: 10, backgroundColor: t.border },
  frameBarPast: { backgroundColor: t.muted, opacity: 0.5 },
  frameBarCurrent: { height: 20, backgroundColor: t.amber, opacity: 1 },
  opacity: { ...mono(t, 11), color: t.muted, textTransform: 'uppercase' },
})

export default function RadarTile({ lat, lon, name }) {
  const { styles, theme } = useStyles(makeStyles)
  const webRef = useRef(null)
  const [meta, setMeta] = useState(null)
  const [frameIdx, setFrameIdx] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [opacity, setOpacity] = useState(0.75)
  const [ready, setReady] = useState(false)

  const { frames, latest } = useMemo(() => readFrames(meta), [meta])
  const html = useMemo(() => buildHtml({ lat, lon, name, theme }), [lat, lon, name, theme])

  useEffect(() => {
    let cancelled = false
    fetch(RAINVIEWER_META)
      .then(r => r.json())
      .then(data => {
        if (!cancelled) setMeta(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setFrameIdx(latest)
  }, [latest, frames])

  useEffect(() => {
    const frame = frames[frameIdx]
    if (!ready || !frame || !webRef.current) return
    webRef.current.injectJavaScript(`window.setRadar(${JSON.stringify(frame.url)}, ${opacity}); true;`)
  }, [frames, frameIdx, ready, opacity])

  useEffect(() => {
    if (!playing || frames.length < 2) return undefined
    const timer = setInterval(() => setFrameIdx(i => (i + 1) % frames.length), 700)
    return () => clearInterval(timer)
  }, [playing, frames.length])

  const frame = frames[frameIdx]
  const offsetMin = frame ? Math.round((frame.time * 1000 - Date.now()) / 60000) : null
  const metaLabel =
    offsetMin == null ? 'RainViewer' : `RainViewer · ${offsetMin > 0 ? '+' : '−'}${Math.abs(offsetMin)} min`

  const cycleOpacity = () => setOpacity(OPACITY_STEPS[(OPACITY_STEPS.indexOf(opacity) + 1) % OPACITY_STEPS.length])

  return (
    <Tile label="Radar" meta={metaLabel}>
      <View style={styles.map}>
        {WebView ? (
          <WebView
            ref={webRef}
            originWhitelist={['*']}
            source={{ html, baseUrl: 'https://tilecache.rainviewer.com' }}
            onLoadEnd={() => setReady(true)}
            javaScriptEnabled
            domStorageEnabled
            scrollEnabled={false}
            setBuiltInZoomControls={false}
            androidLayerType="hardware"
            style={{ backgroundColor: theme.sunken }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <Note>The radar map runs on the phone (Expo Go), not in this web preview.</Note>
          </View>
        )}
        <Text style={styles.coords}>{coordsLabel(lat, lon)}</Text>
      </View>

      <View style={styles.controls}>
        <IconButton
          name={playing ? 'pause' : 'play'}
          size={12}
          color={theme.text}
          disabled={frames.length < 2}
          onPress={() => setPlaying(p => !p)}
          accessibilityLabel={playing ? 'Pause radar loop' : 'Play radar loop'}
          style={{ width: 36, height: 36 }}
        />
        <View style={styles.frames}>
          {frames.map((f, i) => (
            <Pressable
              key={`${f.time}-${i}`}
              style={styles.frame}
              onPress={() => {
                setPlaying(false)
                setFrameIdx(i)
              }}
              accessibilityRole="button"
              accessibilityLabel={`Radar frame ${i + 1} of ${frames.length}`}
            >
              <View
                style={[
                  styles.frameBar,
                  i < frameIdx && styles.frameBarPast,
                  i === frameIdx && styles.frameBarCurrent,
                ]}
              />
            </Pressable>
          ))}
        </View>
        <Pressable onPress={cycleOpacity} accessibilityRole="button" accessibilityLabel={`Radar opacity ${Math.round(opacity * 100)} percent, change`}>
          <Text style={styles.opacity}>Opacity {Math.round(opacity * 100)}%</Text>
        </Pressable>
      </View>
    </Tile>
  )
}
