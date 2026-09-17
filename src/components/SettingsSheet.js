import React, { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from './Icons'
import { IconButton, Segmented } from './Tile'
import { FONTS, label, RADIUS, useStyles } from '../theme'
import { useI18n, useSettings } from '../context/SettingsContext'
import { LANGUAGES } from '../lib/i18n'
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

const choices = t => [
  { key: 'language', label: t('settings.language'), options: LANGUAGES },
  { key: 'theme', label: t('settings.theme'), options: [{ value: 'dark', label: t('settings.dark') }, { value: 'light', label: t('settings.light') }] },
  { key: 'tempUnit', label: t('settings.temperature'), options: [{ value: 'C', label: '°C' }, { value: 'F', label: '°F' }] },
  { key: 'speedUnit', label: t('settings.windSpeed'), options: [{ value: 'kmh', label: 'km/h' }, { value: 'mph', label: 'mph' }] },
  { key: 'distanceUnit', label: t('settings.distance'), options: [{ value: 'km', label: 'km' }, { value: 'mi', label: 'mi' }] },
  { key: 'pressureUnit', label: t('settings.pressure'), options: [{ value: 'hPa', label: 'hPa' }, { value: 'inHg', label: 'inHg' }] },
  { key: 'hourFormat', label: t('settings.clock'), options: [{ value: 24, label: t('settings.hours24') }, { value: 12, label: t('settings.hours12') }] },
]

// Android renders a Modal in its own window, so the app's safe-area insets do not
// reach it — read them in here, or the last row hides behind the navigation bar.
function Sheet({ onClose, onUseCurrentLocation, locating }) {
  const { styles, theme } = useStyles(makeStyles)
  const { settings, update, restartNeeded } = useSettings()
  const { t } = useI18n()
  const insets = useSafeAreaInsets()
  const [note, setNote] = useState(null)

  const setStatusBar = async value => {
    if (value) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        setNote(t('settings.notifBlocked'))
        return
      }
      update({ statusBar: true })
      const data = await loadWidgetData()
      // the setting is read from storage inside sync, so give it a moment to land
      setTimeout(() => syncStatusBarNotification(data).catch(() => {}), 250)
      setNote(t('settings.statusBarOn'))
    } else {
      update({ statusBar: false })
      await dismissStatusBar()
      setNote(null)
    }
  }

  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('settings.close')}>
      <Pressable style={[styles.sheet, { marginBottom: insets.bottom }]} onPress={() => {}}>
        <View style={styles.head}>
          <Text style={styles.title}>{t('settings.title')}</Text>
          <IconButton name="close" onPress={onClose} accessibilityLabel={t('settings.close')} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {choices(t).map(choice => (
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
            <Text style={styles.settingLabel}>{t('settings.statusBar')}</Text>
            <Segmented
              options={[{ value: true, label: t('settings.on') }, { value: false, label: t('settings.off') }]}
              value={Boolean(settings.statusBar)}
              onChange={setStatusBar}
              accessibilityLabel={t('settings.statusBar')}
            />
          </View>

          {restartNeeded ? <Text style={styles.hint}>{t('settings.restart')}</Text> : null}
          {note ? <Text style={styles.hint}>{note}</Text> : null}

          <Pressable style={styles.button} onPress={onUseCurrentLocation} disabled={locating} accessibilityRole="button">
            <Icon name={locating ? 'rotate' : 'locate'} size={14} color={theme.text} />
            <Text style={styles.buttonText}>{locating ? t('header.locating') : t('settings.locate')}</Text>
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
