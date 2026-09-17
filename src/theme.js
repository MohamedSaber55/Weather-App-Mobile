import { useMemo } from 'react'
import { I18nManager, StyleSheet } from 'react-native'
import { useSettings } from './context/SettingsContext'

// Same instrument-panel tokens as the web app
export const DARK = {
  mode: 'dark',
  bg: '#0b0d10',
  panel: '#131518',
  sunken: '#07090c',
  border: '#272a2e',
  text: '#e6e8ea',
  muted: '#9a9fa5',
  dim: '#65696f',
  amber: '#f2af48',
  cyan: '#00d5ef',
  accentSoft: 'rgba(242, 175, 72, 0.09)',
  shade: 'rgba(255, 255, 255, 0.06)',
  moonLit: '#e6e8ea',
  night: '#07090c',
}

export const LIGHT = {
  mode: 'light',
  bg: '#f1f4f6',
  panel: '#fcfdff',
  sunken: '#e9ebee',
  border: '#d6d9dd',
  text: '#171b1f',
  muted: '#54595e',
  dim: '#7c8186',
  amber: '#c97409',
  cyan: '#008ba6',
  accentSoft: 'rgba(201, 116, 9, 0.08)',
  shade: 'rgba(15, 20, 30, 0.05)',
  moonLit: '#171b1f',
  night: '#e3e6ea',
}

const LATIN_FONTS = {
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
  monoBold: 'IBMPlexMono_600SemiBold',
  cond: 'IBMPlexSansCondensed_400Regular',
  condMedium: 'IBMPlexSansCondensed_500Medium',
  condBold: 'IBMPlexSansCondensed_600SemiBold',
}

// Plex Mono and Plex Sans Condensed carry no Arabic glyphs, so the whole
// interface moves to Plex Sans Arabic while the layout is mirrored. The
// direction only changes on restart, so reading it once here is enough.
const ARABIC_FONTS = {
  mono: 'IBMPlexSansArabic_400Regular',
  monoMedium: 'IBMPlexSansArabic_500Medium',
  monoBold: 'IBMPlexSansArabic_600SemiBold',
  cond: 'IBMPlexSansArabic_400Regular',
  condMedium: 'IBMPlexSansArabic_500Medium',
  condBold: 'IBMPlexSansArabic_600SemiBold',
}

export const RTL = I18nManager.isRTL

export const FONTS = RTL ? ARABIC_FONTS : LATIN_FONTS

export const RADIUS = 6
export const GAP = 8

// status scales, shared with the web app
export const AQI_COLORS = ['#4CAF50', '#FFC107', '#FF9800', '#F44336', '#9C27B0', '#880E4F']

export function useTheme() {
  const { settings } = useSettings()
  return settings.theme === 'light' ? LIGHT : DARK
}

// makeStyles(theme) -> StyleSheet, rebuilt when the theme changes
export function useStyles(factory) {
  const theme = useTheme()
  return useMemo(() => ({ theme, styles: StyleSheet.create(factory(theme)) }), [theme, factory])
}

// shared text styles used across tiles
export const label = (theme, size = 11) => ({
  fontFamily: FONTS.condBold,
  fontSize: size,
  // tracking pulls joined Arabic letters apart, so it stays a Latin flourish
  letterSpacing: RTL ? 0 : size * 0.1,
  textTransform: RTL ? 'none' : 'uppercase',
  color: theme.muted,
})

export const mono = (theme, size = 13, weight = 'regular') => ({
  fontFamily: weight === 'medium' ? FONTS.monoMedium : weight === 'bold' ? FONTS.monoBold : FONTS.mono,
  fontSize: size,
  color: theme.text,
})
