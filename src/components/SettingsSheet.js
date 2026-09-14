import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { requestPinWidget } from 'react-native-android-widget'
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
    maxHeight: '90%',
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
  body: { padding: 16, gap: 18, paddingBottom: 28 },
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
  widgetRow: { flexDirection: 'row', gap: 8 },
  widgetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 4,
    backgroundColor: t.sunken,
  },
  widgetChipLabel: { ...label(t, 10), color: t.text },
  widgetChipSize: { ...label(t, 9), color: t.dim },
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

const WIDGETS = [
  { name: 'WxCompact', label: 'Temperature', size: '2 × 1' },
  { name: 'WxCurrent', label: 'Current', size: '3 × 2' },
  { name: 'WxHourly', label: 'Next hours', size: '4 × 2' },
  { name: 'WxForecast', label: 'Forecast', size: '4 × 3' },
]

export default function SettingsSheet({ visible, onClose, onUseCurrentLocation, locating }) {
  const { styles, theme } = useStyles(makeStyles)
  const { settings, update } = useSettings()
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

  const addWidget = async widgetName => {
    try {
      const accepted = await requestPinWidget({ widgetName })
      setNote(
        accepted
          ? 'Confirm the placement on your home screen.'
          : 'This launcher cannot add widgets from inside apps — long-press the home screen instead.'
      )
    } catch {
      setNote('Could not open the widget picker — long-press your home screen instead.')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close settings">
        <Pressable style={styles.sheet} onPress={() => {}}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.head}>
              <Text style={styles.title}>Settings</Text>
              <IconButton name="close" onPress={onClose} accessibilityLabel="Close settings" />
            </View>
            <ScrollView contentContainerStyle={styles.body}>
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

              <View style={styles.setting}>
                <Text style={styles.settingLabel}>Home screen widgets</Text>
                <View style={styles.widgetRow}>
                  {WIDGETS.slice(0, 2).map(widget => (
                    <Pressable key={widget.name} style={styles.widgetChip} onPress={() => addWidget(widget.name)} accessibilityRole="button">
                      <Text style={styles.widgetChipLabel}>{widget.label}</Text>
                      <Text style={styles.widgetChipSize}>{widget.size}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.widgetRow}>
                  {WIDGETS.slice(2).map(widget => (
                    <Pressable key={widget.name} style={styles.widgetChip} onPress={() => addWidget(widget.name)} accessibilityRole="button">
                      <Text style={styles.widgetChipLabel}>{widget.label}</Text>
                      <Text style={styles.widgetChipSize}>{widget.size}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {note ? <Text style={styles.hint}>{note}</Text> : null}

              <Pressable style={styles.button} onPress={onUseCurrentLocation} disabled={locating} accessibilityRole="button">
                <Icon name={locating ? 'rotate' : 'locate'} size={14} color={theme.text} />
                <Text style={styles.buttonText}>{locating ? 'Locating…' : 'Use my current location'}</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
