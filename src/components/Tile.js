import React from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import { FONTS, label, mono, RADIUS, RTL, useStyles, useTheme } from '../theme'
import { Icon } from './Icons'

const makeStyles = t => ({
  tile: {
    backgroundColor: t.panel,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: RADIUS,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
    gap: 10,
    minWidth: 0,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  label: label(t, 11),
  meta: { ...mono(t, 10), color: t.dim, textTransform: RTL ? 'none' : 'uppercase', flexShrink: 1, textAlign: RTL ? 'left' : 'right' },
  kv: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  kvKey: label(t, 10, t.dim),
  kvKeyColor: { color: t.dim },
  kvValue: { ...mono(t, 13, 'medium') },
  stat: { gap: 2, flex: 1, minWidth: 0 },
  statKey: { ...label(t, 10), color: t.dim },
  statValue: { ...mono(t, 15, 'medium') },
  note: { fontFamily: FONTS.cond, fontSize: 13, lineHeight: 18, color: t.muted },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barKey: { ...mono(t, 10), color: t.muted, width: 44 },
  barTrack: { flex: 1, height: 4, borderRadius: 2, backgroundColor: t.border, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: t.muted, borderRadius: 2 },
  barValue: { ...mono(t, 10), width: 30, textAlign: RTL ? 'left' : 'right' },
  segments: { flexDirection: 'row', gap: 2 },
  segment: { flex: 1, height: 16 },
  scale: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleText: { ...mono(t, 10), color: t.dim },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 4,
  },
  segmented: { flexDirection: 'row', borderWidth: 1, borderColor: t.border, borderRadius: 4, overflow: 'hidden' },
  segmentedBtn: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  segmentedText: { ...mono(t, 12), color: t.dim },
  segmentedTextActive: { ...mono(t, 12, 'bold'), color: t.bg },
  gaugeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gaugeReadout: { gap: 3, flex: 1, minWidth: 0 },
  gaugeLabel: { ...label(t, 13), color: t.text },
})

export function Tile({ label: title, meta, children, style }) {
  const { styles } = useStyles(makeStyles)
  return (
    <View style={[styles.tile, style]}>
      <View style={styles.head}>
        <Text style={styles.label}>{title}</Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  )
}

export function KeyValue({ label: key, value, accent }) {
  const { styles, theme } = useStyles(makeStyles)
  return (
    <View style={styles.kv}>
      <Text style={[styles.kvKey, styles.kvKeyColor]}>{key}</Text>
      <Text style={[styles.kvValue, accent && { color: theme.amber }]}>{value}</Text>
    </View>
  )
}

export function Stat({ label: key, value }) {
  const { styles } = useStyles(makeStyles)
  return (
    <View style={styles.stat}>
      <Text style={styles.statKey}>{key}</Text>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

export function Note({ children }) {
  const { styles } = useStyles(makeStyles)
  return <Text style={styles.note}>{children}</Text>
}

export function Bars({ rows }) {
  const { styles } = useStyles(makeStyles)
  return (
    <View style={{ gap: 7 }}>
      {rows.map(row => (
        <View key={row.label} style={styles.barRow}>
          <Text style={styles.barKey}>{row.label}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${Math.min(100, row.percent)}%` }]} />
          </View>
          <Text style={styles.barValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

export function Segments({ count = 20, filled = 0, color }) {
  const { styles, theme } = useStyles(makeStyles)
  return (
    <View style={styles.segments}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: i < filled ? color || theme.cyan : theme.border }]} />
      ))}
    </View>
  )
}

export function Scale({ marks }) {
  const { styles } = useStyles(makeStyles)
  return (
    <View style={styles.scale}>
      {marks.map(m => (
        <Text key={m} style={styles.scaleText}>
          {m}
        </Text>
      ))}
    </View>
  )
}

export function IconButton({ name, onPress, accessibilityLabel, color, disabled, size = 16, style }) {
  const { styles, theme } = useStyles(makeStyles)
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.iconBtn, style, (pressed || disabled) && { opacity: 0.5 }]}
      hitSlop={4}
    >
      <Icon name={name} size={size} color={color || theme.muted} />
    </Pressable>
  )
}

export function Segmented({ options, value, onChange, accessibilityLabel }) {
  const { styles, theme } = useStyles(makeStyles)
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map(option => {
        const active = option.value === value
        return (
          <Pressable
            key={String(option.value)}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={[styles.segmentedBtn, active && { backgroundColor: theme.text }]}
          >
            <Text style={active ? styles.segmentedTextActive : styles.segmentedText}>{option.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function arcPath(cx, cy, r, fromDeg, toDeg) {
  const point = deg => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)]
  const [x0, y0] = point(fromDeg)
  const [x1, y1] = point(toDeg)
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`
}

// Semicircle gauge: colored ranges, the active one at full strength, needle at `value`
export function Gauge({ ranges, total, value, width = 130, stroke = 10, accessibilityLabel }) {
  const theme = useTheme()
  const height = width / 2 + 8
  const cx = width / 2
  const cy = width / 2
  const r = width / 2 - stroke / 2 - 2
  const v = Math.min(Math.max(Number(value) || 0, 0), total)
  const angle = ((180 - (v / total) * 180) * Math.PI) / 180
  const needle = r - stroke / 2 - 6

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} accessibilityLabel={accessibilityLabel}>
      {ranges.map((range, i) => (
        <Path
          key={i}
          d={arcPath(cx, cy, r, 180 - (range.from / total) * 180 - 1, 180 - (range.to / total) * 180 + 1)}
          fill="none"
          stroke={range.color}
          strokeWidth={stroke}
          opacity={range.active ? 1 : 0.28}
        />
      ))}
      <Path
        d={`M${cx} ${cy} L${(cx + needle * Math.cos(angle)).toFixed(1)} ${(cy - needle * Math.sin(angle)).toFixed(1)}`}
        stroke={theme.text}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={cx} cy={cy} r={4} fill={theme.text} />
    </Svg>
  )
}

export function GaugeRow({ children }) {
  const { styles } = useStyles(makeStyles)
  return <View style={styles.gaugeRow}>{children}</View>
}

export function GaugeReadout({ value, sub }) {
  const { styles } = useStyles(makeStyles)
  return (
    <View style={styles.gaugeReadout}>
      {value}
      <Text style={styles.gaugeLabel}>{sub}</Text>
    </View>
  )
}

export { makeStyles as tileStyles }
