import React, { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { KeyValue, Tile } from '../Tile'
import { ConditionIcon } from '../Icons'
import { label, mono, RTL, useStyles } from '../../theme'
import { useI18n } from '../../context/SettingsContext'
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
  headNum: { width: 42, textAlign: RTL ? 'left' : 'right' },
  headRain: { width: 40, textAlign: RTL ? 'left' : 'right' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  rowSelected: { backgroundColor: t.accentSoft },
  day: { ...mono(t, 12, 'medium'), width: 58, textTransform: RTL ? 'none' : 'uppercase' },
  daySelected: { color: t.amber },
  cond: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 },
  condText: { ...label(t, 12), color: t.muted, flexShrink: 1 },
  num: { ...mono(t, 13), width: 42, textAlign: RTL ? 'left' : 'right' },
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
  const { t, days: dayNames } = useI18n()
  const [selected, setSelected] = useState(0)
  if (!days?.length) return null

  const unit = settings.tempUnit
  const detail = days[Math.min(selected, days.length - 1)]
  const illumination = detail.astro?.moon_illumination

  const cells = [
    [t('label.rise'), formatTime(detail.astro?.sunrise, settings.hourFormat)],
    [t('label.set'), formatTime(detail.astro?.sunset, settings.hourFormat)],
    [t('label.maxWind'), `${Math.round(speedValue(detail.day.maxwind_kph ?? 0, settings.speedUnit))} ${speedLabel(settings.speedUnit)}`],
    [t('label.precip'), `${fixed1(detail.day.totalprecip_mm ?? 0)} mm`],
    [t('label.humidity'), `${detail.day.avghumidity ?? '--'}%`],
    [t('label.moon'), `${moonAbbreviation(detail.astro?.moon_phase)}${illumination != null ? ` ${Math.round(illumination)}%` : ''}`],
  ]

  return (
    <Tile label={t('tile.forecast')} meta={t(days.length === 1 ? 'meta.day' : 'meta.days', { count: days.length })}>
      <View style={styles.head}>
        <Text style={[styles.headText, { width: 58 }]}>{t('label.day')}</Text>
        <Text style={[styles.headText, { flex: 1 }]}>{t('label.cond')}</Text>
        <Text style={[styles.headText, styles.headNum]}>{t('label.lo')}</Text>
        <Text style={[styles.headText, styles.headNum]}>{t('label.hi')}</Text>
        <Text style={[styles.headText, styles.headRain]}>{t('label.rain')}</Text>
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
            accessibilityLabel={t('forecast.rowAria', {
              day: dayStamp(fd.date, { days: dayNames }),
              cond: fd.day.condition.text,
              lo: fixed1(tempValue(fd.day.mintemp_c, unit)),
              hi: fixed1(tempValue(fd.day.maxtemp_c, unit)),
            })}
            style={[styles.row, isSelected && styles.rowSelected]}
          >
            <Text style={[styles.day, isSelected && styles.daySelected]}>{dayStamp(fd.date, { days: dayNames })}</Text>
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
