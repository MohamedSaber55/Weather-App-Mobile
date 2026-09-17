import React from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { Icon } from './Icons'
import { IconButton } from './Tile'
import { FONTS, label, mono, RADIUS, RTL, useStyles } from '../theme'
import { placeKey, useFavorites } from '../context/FavoritesContext'
import { useI18n } from '../context/SettingsContext'

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
  body: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 4,
    backgroundColor: t.sunken,
  },
  rowActive: { borderColor: t.amber },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontFamily: FONTS.condBold, fontSize: 15, letterSpacing: RTL ? 0 : 0.4, textTransform: RTL ? 'none' : 'uppercase', color: t.text },
  region: { ...mono(t, 10), color: t.dim, marginTop: 2 },
  tag: {
    ...label(t, 9),
    color: '#0b0d10',
    backgroundColor: t.amber,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    overflow: 'hidden',
  },
  rowAction: { padding: 6 },
  empty: { ...mono(t, 12), color: t.dim, paddingVertical: 18, lineHeight: 18 },
  addRow: { flexDirection: 'row', gap: 8, paddingTop: 6 },
  add: {
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
  addText: { ...label(t, 12), color: t.text },
  note: { fontFamily: FONTS.cond, fontSize: 13, lineHeight: 18, color: t.muted, paddingTop: 4 },
})

function Sheet({ onClose, onSelectPlace, onAddBySearch, onAddByMap, currentName }) {
  const { styles, theme } = useStyles(makeStyles)
  const insets = useSafeAreaInsets()
  const { t } = useI18n()
  const { favorites, defaultPlace, setDefaultPlace, removeFavorite } = useFavorites()

  const isDefault = place => defaultPlace && placeKey(defaultPlace) === placeKey(place)
  const isCurrent = place => String(place.name).toLowerCase() === String(currentName || '').toLowerCase()

  return (
    <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel={t('places.closeAria')}>
      <Pressable style={[styles.sheet, { marginBottom: insets.bottom }]} onPress={() => {}}>
        <View style={styles.head}>
          <Text style={styles.title}>{t('places.title')}</Text>
          <IconButton name="close" onPress={onClose} accessibilityLabel={t('places.closeAria')} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 24 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {favorites.length === 0 ? (
            <Text style={styles.empty}>{t('places.emptyMobile')}</Text>
          ) : (
            favorites.map(place => (
              <Pressable
                key={placeKey(place)}
                style={[styles.row, isCurrent(place) && styles.rowActive]}
                onPress={() => {
                  onSelectPlace(place)
                  onClose()
                }}
                accessibilityRole="button"
                accessibilityLabel={t('places.show', { name: place.name })}
              >
                <Icon name="pin" size={16} color={isCurrent(place) ? theme.amber : theme.dim} />
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>
                    {place.name}
                  </Text>
                  <Text style={styles.region} numberOfLines={1}>
                    {[place.region, place.country].filter(Boolean).join(', ') || '—'}
                  </Text>
                </View>

                {isDefault(place) ? (
                  <Text style={styles.tag}>{t('places.default')}</Text>
                ) : (
                  <Pressable
                    style={styles.rowAction}
                    onPress={() => setDefaultPlace(place)}
                    accessibilityRole="button"
                    accessibilityLabel={t('places.makeDefault', { name: place.name })}
                    hitSlop={6}
                  >
                    <Icon name="home" size={16} color={theme.dim} />
                  </Pressable>
                )}

                <Pressable
                  style={styles.rowAction}
                  onPress={() => removeFavorite(place)}
                  accessibilityRole="button"
                  accessibilityLabel={t('places.removeName', { name: place.name })}
                  hitSlop={6}
                >
                  <Icon name="trash" size={16} color={theme.dim} />
                </Pressable>
              </Pressable>
            ))
          )}

          <View style={styles.addRow}>
            <Pressable style={styles.add} onPress={onAddBySearch} accessibilityRole="button">
              <Icon name="search" size={14} color={theme.text} />
              <Text style={styles.addText}>{t('places.search')}</Text>
            </Pressable>
            <Pressable style={styles.add} onPress={onAddByMap} accessibilityRole="button">
              <Icon name="pin" size={14} color={theme.text} />
              <Text style={styles.addText}>{t('places.map')}</Text>
            </Pressable>
          </View>

          <Text style={styles.note}>{t('places.noteMobile')}</Text>
        </ScrollView>
      </Pressable>
    </Pressable>
  )
}

export default function PlacesSheet({ visible, onClose, onSelectPlace, onAddBySearch, onAddByMap, currentName }) {
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
        <Sheet
          onClose={onClose}
          onSelectPlace={onSelectPlace}
          onAddBySearch={onAddBySearch}
          onAddByMap={onAddByMap}
          currentName={currentName}
        />
      </SafeAreaProvider>
    </Modal>
  )
}
