import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'

const CHANNEL_ID = 'weather-status'
const NOTIFICATION_ID = 'weather-status-bar'
const SETTINGS_KEY = 'weather_settings'

export async function ensureChannel() {
  if (Platform.OS !== 'android') return
  // MIN keeps it silent and collapsed at the bottom of the shade — a readout, not an alert
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Weather status',
    description: 'Shows the current temperature in the status bar',
    importance: Notifications.AndroidImportance.MIN,
    enableVibrate: false,
    showBadge: false,
    sound: null,
  })
}

// Android 13+ only prompts once a channel exists, so create it first
export async function requestNotificationPermission() {
  await ensureChannel()
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const asked = await Notifications.requestPermissionsAsync()
  return Boolean(asked.granted)
}

export async function dismissStatusBar() {
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID).catch(() => {})
}

async function statusBarEnabled() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY)
    return raw ? Boolean(JSON.parse(raw).statusBar) : false
  } catch {
    return false
  }
}

/**
 * Mirror the current reading into the status bar. Safe to call from anywhere
 * (app, widget task, background task) — it does nothing unless the setting is on
 * and permission was granted.
 */
export async function syncStatusBarNotification(data) {
  if (Platform.OS !== 'android' || !data) return
  if (!(await statusBarEnabled())) {
    await dismissStatusBar()
    return
  }
  const permission = await Notifications.getPermissionsAsync()
  if (!permission.granted) return

  await ensureChannel()
  const extras = [
    data.uvLabel ? `UV ${data.uv}` : null,
    data.aqiLabel ? `AQI ${data.aqiLabel}` : null,
    `RH ${data.humidity}%`,
  ].filter(Boolean)

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: `${data.temp}°${data.unit} · ${data.condition}`,
      body: `${data.city} · feels ${data.feels}° · H ${data.hi} L ${data.lo} · ${extras.join(' · ')}`,
      sticky: true,
      autoDismiss: false,
      color: '#f2af48',
      priority: Notifications.AndroidNotificationPriority.MIN,
      channelId: CHANNEL_ID,
      badge: 0,
    },
    trigger: null,
  })
}
