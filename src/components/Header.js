import React from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Icon, Logo } from './Icons'
import { IconButton } from './Tile'
import { label, mono, RADIUS, RTL, useStyles } from '../theme'
import { countryCode } from '../lib/countries'
import { useI18n } from '../context/SettingsContext'
import { coordsLabel, utcOffsetLabel } from '../lib/units'

const sameName = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase()

const makeStyles = t => ({
  bar: {
    backgroundColor: t.panel,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: RADIUS,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 14, paddingRight: 6, height: 54 },
  brand: { ...mono(t, 14, 'bold'), letterSpacing: 0.8 },
  divider: { width: 1, height: 20, backgroundColor: t.border },
  place: { ...mono(t, 13, 'medium'), textTransform: RTL ? 'none' : 'uppercase', flex: 1, minWidth: 0 },
  tools: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tabsRow: { borderTopWidth: 1, borderTopColor: t.border },
  tabs: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 14, height: 44 },
  tab: { ...label(t, 12), color: t.dim, height: 44, lineHeight: 44, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { color: t.text, borderBottomColor: t.amber },
  save: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44 },
  add: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 4,
    alignSelf: 'center',
  },
  tabInner: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 44 },
  saveText: { ...label(t, 12), color: t.dim },
  saveTextOn: { color: t.amber },
  coords: { ...mono(t, 10), color: t.dim, paddingHorizontal: 14, paddingBottom: 8 },
})

export default function Header({
  location,
  favorites,
  isFavorite,
  onToggleFavorite,
  onSelectPlace,
  onOpenSearch,
  onOpenSettings,
  onOpenPlaces,
  defaultName,
}) {
  const { styles, theme } = useStyles(makeStyles)
  const { t } = useI18n()
  const name = location?.name || t('header.locating')
  const code = location ? countryCode(location.country) : ''
  const offset = location ? utcOffsetLabel(location.localtime, location.localtime_epoch) : null
  const coords = location ? coordsLabel(location.lat, location.lon) : ''
  const tabs = location && !isFavorite ? [{ name: location.name, lat: location.lat, lon: location.lon }, ...favorites] : favorites

  return (
    <View style={styles.bar}>
      <View style={styles.top}>
        <Logo size={20} />
        <Text style={styles.brand}>WX</Text>
        <View style={styles.divider} />
        <Text style={styles.place} numberOfLines={1}>
          {code ? `${name}, ${code}` : name}
        </Text>
        <View style={styles.tools}>
          <IconButton name="search" onPress={onOpenSearch} accessibilityLabel={t('search.aria')} />
          <IconButton name="sliders" onPress={onOpenSettings} accessibilityLabel={t('header.settings')} />
        </View>
      </View>

      <View style={styles.tabsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {tabs.map((place, i) => {
            const active = sameName(place.name, location?.name)
            return (
              <Pressable
                key={`${place.name}-${place.lat}-${i}`}
                onPress={() => onSelectPlace(place)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.tabInner}>
                  {sameName(place.name, defaultName) ? <Icon name="home" size={11} color={active ? theme.amber : theme.dim} /> : null}
                  <Text style={[styles.tab, active && styles.tabActive]}>{place.name}</Text>
                </View>
              </Pressable>
            )
          })}
          <Pressable
            onPress={onToggleFavorite}
            disabled={!location}
            accessibilityRole="button"
            accessibilityState={{ selected: isFavorite }}
            accessibilityLabel={isFavorite ? t('header.unsave') : t('header.saveAria')}
            style={styles.save}
          >
            <Icon name="star" size={12} color={isFavorite ? theme.amber : theme.dim} fill={isFavorite ? theme.amber : 'none'} />
            <Text style={[styles.saveText, isFavorite && styles.saveTextOn]}>{isFavorite ? t('header.saved') : t('header.save')}</Text>
          </Pressable>
          <Pressable
            onPress={onOpenPlaces}
            accessibilityRole="button"
            accessibilityLabel={t('places.open')}
            style={styles.add}
            hitSlop={6}
          >
            <Icon name="plus" size={14} color={theme.text} />
          </Pressable>
        </ScrollView>
      </View>

      {coords ? <Text style={styles.coords}>{[coords, offset].filter(Boolean).join(' · ')}</Text> : null}
    </View>
  )
}
