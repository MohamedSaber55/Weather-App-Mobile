import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from './Icons'
import { IconButton, Segmented } from './Tile'
import { FONTS, label, RADIUS, useStyles } from '../theme'
import { useSettings } from '../context/SettingsContext'
import { dismissStatusBar, requestNotificationPermission, syncStatusBarNotification } from '../lib/notifications'
import { loadWidgetData } from '../widget/data'

const makeStyles = t => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: t.panel,
    borderTopWidth: 1,
    borderTopColor: t.border,
    borderTopLeftRadius: RADIUS * 2,
    borderTopRightRadius: RADIUS * 2,
    maxHeight: '86%',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  title: label(t, 12),
  body: { padding: 16, gap: 18 },
  setting: { gap: 8 },
  settingLabel: { ...label(t, 10), color: t.dim },
  hint: { fontFamily: FONTS.cond, fontSize: 13, lineHeight: 18, color: t.muted },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 46,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 4,
    backgroundColor: t.sunken,
  },
  buttonText: { ...label(t, 12), color: t.text },
  divider: { height: 1, backgroundColor: t.border, marginVertical: 2 },
})

const CHOICES = [
  { key: 'theme', label: 'Theme', options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }] },
  { key: 'tempUnit', label: 'Temperature', options: [{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }] },
  { key: 'speedUnit', label: 'Wind speed', options: [{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }] },
  { key: 'distanceUnit', label: 'Distance', options: [{ value: 'km', label: 'km' }, { value: 'mi', label: 'mi' }] },
  { key: 'pressureUnit', label: 'Pressure', options: [{ value: 'hPa', label: 'hPa' }, { value: 'inHg', label: 'inHg' }] },
  { key: 'hourFormat', label: 'Clock', options: [{ value: 24, label: '24 h' }, { value: 12, label: '12 h' }] },
]

// Android renders a Modal in its own window, so the app's safe-area insets do not
// reach it — read them in here, or the last row hides behind the navigation bar.
function Sheet({ onClose, onUseCurrentLocation, locating }) {
  const { styles, theme } = useStyles(makeStyles)
  const { settings, update } = useSettings()
  const insets = useSafeAreaInsets()
  const [note, setNote] = useState(null)

  const setStatusBar = async value => {
    if (value) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        setNote('Android blocked notifications for this app — allow them in system settings first.')
        return
      }
      update({ statusBar: true })
      const data = await loadWidgetData()
      // the setting is read from storage inside sync, so give it a moment to land
      setTimeout(() => syncStatusBarNotification(data).catch(() => {}), 250)
      setNote('The temperature now sits in your status bar.')
    } else {
      update({ statusBar: false })
      await dismissStatusBar()
      setNote(null)
    }
  }

  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close settings">
      <Pressable style={[styles.sheet, { marginBottom: insets.bottom }]} onPress={() => {}}>
        <View style={styles.head}>
          <Text style={styles.title}>Settings</Text>
          <IconButton name="close" onPress={onClose} accessibilityLabel="Close settings" />
        </View>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {CHOICES.map(choice => (
            <View key={choice.key} style={styles.setting}>
              <Text style={styles.settingLabel}>{choice.label}</Text>
              <Segmented
                options={choice.options}
                value={settings[choice.key]}
                onChange={value => update({ [choice.key]: value })}
                accessibilityLabel={choice.label}
              />
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.setting}>
            <Text style={styles.settingLabel}>Temperature in the status bar</Text>
            <Segmented
              options={[{ value: true, label: 'On' }, { value: false, label: 'Off' }]}
              value={Boolean(settings.statusBar)}
              onChange={setStatusBar}
              accessibilityLabel="Temperature in the status bar"
            />
          </View>

          {note ? <Text style={styles.hint}>{note}</Text> : null}

          <Pressable style={styles.button} onPress={onUseCurrentLocation} disabled={locating} accessibilityRole="button">
            <Icon name={locating ? 'rotate' : 'locate'} size={14} color={theme.text} />
            <Text style={styles.buttonText}>{locating ? 'Locating…' : 'Use my current location'}</Text>
          </Pressable>
        </ScrollView>
      </Pressable>
    </Pressable>
  )
}

export default function SettingsSheet({ visible, onClose, onUseCurrentLocation, locating }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
        <Sheet onClose={onClose} onUseCurrentLocation={onUseCurrentLocation} locating={locating} />
      </SafeAreaProvider>
    </Modal>
  )
}
