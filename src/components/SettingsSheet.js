import React from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from './Icons'
import { IconButton, Segmented } from './Tile'
import { label, RADIUS, useStyles } from '../theme'
import { useSettings } from '../context/SettingsContext'

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
  body: { padding: 16, gap: 18 },
  setting: { gap: 8 },
  settingLabel: { ...label(t, 10), color: t.dim },
  locate: {
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
  locateText: { ...label(t, 12), color: t.text },
})

const CHOICES = [
  { key: 'theme', label: 'Theme', options: [{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }] },
  { key: 'tempUnit', label: 'Temperature', options: [{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }] },
  { key: 'speedUnit', label: 'Wind speed', options: [{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }] },
  { key: 'distanceUnit', label: 'Distance', options: [{ value: 'km', label: 'km' }, { value: 'mi', label: 'mi' }] },
  { key: 'pressureUnit', label: 'Pressure', options: [{ value: 'hPa', label: 'hPa' }, { value: 'inHg', label: 'inHg' }] },
  { key: 'hourFormat', label: 'Clock', options: [{ value: 24, label: '24 h' }, { value: 12, label: '12 h' }] },
]

export default function SettingsSheet({ visible, onClose, onUseCurrentLocation, locating }) {
  const { styles, theme } = useStyles(makeStyles)
  const { settings, update } = useSettings()

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
              <Pressable
                style={styles.locate}
                onPress={onUseCurrentLocation}
                disabled={locating}
                accessibilityRole="button"
              >
                <Icon name={locating ? 'rotate' : 'locate'} size={14} color={theme.text} />
                <Text style={styles.locateText}>{locating ? 'Locating…' : 'Use my current location'}</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
