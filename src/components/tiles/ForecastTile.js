import React, { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { KeyValue, Tile } from '../Tile'
import { ConditionIcon } from '../Icons'
import { label, mono, useStyles } from '../../theme'
import { moonAbbreviation, shortCondition } from '../../lib/conditions'
import { dayStamp, fixed1, formatTime, speedLabel, speedValue, tempValue } from '../../lib/units'

const makeStyles = t => ({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  headText: { ...label(t, 10), color: t.dim },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  rowSelected: { backgroundColor: t.accentSoft },
  day: { ...mono(t, 12, 'medium'), width: 58, textTransform: 'uppercase' },
  daySelected: { color: t.amber },
  cond: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  condText: { ...label(t, 12), color: t.muted, flexShrink: 1 },
  num: { ...mono(t, 13), width: 42, textAlign: 'right' },
  lo: { color: t.muted },
  hi: { fontFamily: mono(t, 13, 'medium').fontFamily },
  rain: { ...mono(t, 13), width: 40, textAlign: 'right', color: t.dim },
  rainWet: { color: t.cyan },
  detail: { gap: 8, paddingTop: 10 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailCell: { width: '50%', paddingRight: 12, paddingVertical: 4 },
})

export default function ForecastTile({ days, settings }) {
  const { styles, theme } = useStyles(makeStyles)
  const [selected, setSelected] = useState(0)
  if (!days?.length) return null

  const unit = settings.tempUnit
  const detail = days[Math.min(selected, days.length - 1)]
  const illumination = detail.astro?.moon_illumination

  const cells = [
    ['Rise', formatTime(detail.astro?.sunrise, settings.hourFormat)],
    ['Set', formatTime(detail.astro?.sunset, settings.hourFormat)],
    ['Max wind', `${Math.round(speedValue(detail.day.maxwind_kph ?? 0, settings.speedUnit))} ${speedLabel(settings.speedUnit)}`],
    ['Precip', `${fixed1(detail.day.totalprecip_mm ?? 0)} mm`],
    ['Humidity', `${detail.day.avghumidity ?? '--'}%`],
    ['Moon', `${moonAbbreviation(detail.astro?.moon_phase)}${illumination != null ? ` ${Math.round(illumination)}%` : ''}`],
  ]

  return (
    <Tile label="Forecast" meta={`${days.length} ${days.length === 1 ? 'day' : 'days'}`}>
      <View style={styles.head}>
        <Text style={[styles.headText, { width: 58 }]}>Day</Text>
        <Text style={[styles.headText, { flex: 1 }]}>Cond</Text>
        <Text style={[styles.headText, { width: 42, textAlign: 'right' }]}>Lo</Text>
        <Text style={[styles.headText, { width: 42, textAlign: 'right' }]}>Hi</Text>
        <Text style={[styles.headText, { width: 40, textAlign: 'right' }]}>Rain</Text>
      </View>

      {days.map((fd, i) => {
        const rain = fd.day.daily_chance_of_rain ?? 0
        const isSelected = i === selected
        return (
          <Pressable
            key={fd.date}
            onPress={() => setSelected(i)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={`${dayStamp(fd.date)}, ${fd.day.condition.text}, low ${fixed1(tempValue(fd.day.mintemp_c, unit))}, high ${fixed1(tempValue(fd.day.maxtemp_c, unit))}`}
            style={[styles.row, isSelected && styles.rowSelected]}
          >
            <Text style={[styles.day, isSelected && styles.daySelected]}>{dayStamp(fd.date)}</Text>
            <View style={styles.cond}>
              <ConditionIcon code={fd.day.condition.code} text={fd.day.condition.text} size={16} />
              <Text style={styles.condText} numberOfLines={1}>
                {shortCondition(fd.day.condition.text)}
              </Text>
            </View>
            <Text style={[styles.num, styles.lo]}>{fixed1(tempValue(fd.day.mintemp_c, unit))}</Text>
            <Text style={[styles.num, { fontFamily: styles.hi.fontFamily }]}>{fixed1(tempValue(fd.day.maxtemp_c, unit))}</Text>
            <Text style={[styles.rain, rain > 0 && styles.rainWet]}>{rain}%</Text>
          </Pressable>
        )
      })}

      <View style={styles.detail}>
        <View style={styles.detailGrid}>
          {cells.map(([key, value]) => (
            <View key={key} style={styles.detailCell}>
              <KeyValue label={key} value={value} />
            </View>
          ))}
        </View>
      </View>
    </Tile>
  )
}
