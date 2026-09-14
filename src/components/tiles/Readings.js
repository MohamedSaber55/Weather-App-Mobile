import React from 'react'
import { Text, View } from 'react-native'
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg'
import { Bars, Gauge, GaugeRow, KeyValue, Note, Scale, Segments, Stat, Tile } from '../Tile'
import { ConditionIcon } from '../Icons'
import { AQI_COLORS, FONTS, label, mono, useStyles, useTheme } from '../../theme'
import {
  activityAdvice,
  aqiLevel,
  clothingAdvice,
  comfortLabel,
  conditionTitleByCategory,
  getCategory,
  moonIsWaning,
  rainAdvice,
  UV_RANGES,
  uvBurnTime,
  uvLevel,
  uvProtection,
} from '../../lib/conditions'
import {
  clamp,
  clockHours,
  dayLength,
  fixed1,
  formatTime,
  formatVisibility,
  parseClock,
  speedLabel,
  speedValue,
  tempValue,
} from '../../lib/units'

const makeStyles = t => ({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tempReadout: { flexDirection: 'row', alignItems: 'flex-start' },
  tempValue: { ...mono(t, 64, 'medium'), letterSpacing: -2, lineHeight: 68 },
  tempDegree: { ...mono(t, 22), color: t.muted, marginTop: 6 },
  sub: { flexDirection: 'row', gap: 18 },
  subText: { ...mono(t, 12), color: t.muted },
  subStrong: { ...mono(t, 12, 'medium'), color: t.text },
  condition: { fontFamily: FONTS.condMedium, fontSize: 18, letterSpacing: 0.6, textTransform: 'uppercase', color: t.text },
  conditionTitle: { fontFamily: FONTS.condMedium, fontSize: 26, letterSpacing: 0.5, textTransform: 'uppercase', color: t.text },
  conditionSub: { ...mono(t, 12), color: t.muted, textTransform: 'uppercase', marginTop: 4 },
  stats: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: t.border, paddingTop: 10 },
  rail: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  railEnd: { ...mono(t, 11), color: t.muted },
  railTrack: { flex: 1, height: 2, backgroundColor: t.border },
  railFill: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: t.amber, opacity: 0.55 },
  railTick: { position: 'absolute', top: -6, width: 2, height: 14, backgroundColor: t.text },
  bigValue: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  numXl: { ...mono(t, 40, 'medium'), lineHeight: 44 },
  numLg: { ...mono(t, 30, 'medium'), lineHeight: 34 },
  numSub: { ...mono(t, 13), color: t.dim },
  unit: { ...mono(t, 13), color: t.muted },
  windValues: { gap: 6, flex: 1 },
  gust: { ...mono(t, 11), color: t.muted },
  uvBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 46 },
  uvBar: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  uvBarFill: { width: '100%', maxWidth: 14, backgroundColor: t.amber, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  uvBarLabel: { ...mono(t, 8), color: t.dim },
  advRow: { flexDirection: 'row', gap: 12, paddingVertical: 9 },
  advTag: { ...mono(t, 10, 'bold'), color: t.amber, letterSpacing: 0.8, textTransform: 'uppercase', width: 62 },
  advText: { fontFamily: FONTS.cond, fontSize: 15, lineHeight: 20, color: t.text, flex: 1 },
  divider: { borderTopWidth: 1, borderTopColor: t.border },
  moonRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  moonPhase: { ...label(t, 13), color: t.text },
  moonRise: { ...mono(t, 11), color: t.muted, textTransform: 'uppercase' },
  sunRow: { gap: 10 },
})

/* ---------- temperature ---------- */

export function TemperatureTile({ current, day, settings }) {
  const { styles, theme } = useStyles(makeStyles)
  const unit = settings.tempUnit
  const temp = tempValue(current.temp_c, unit)
  const low = tempValue(day?.mintemp_c ?? current.temp_c, unit)
  const high = tempValue(day?.maxtemp_c ?? current.temp_c, unit)
  const position = high > low ? clamp((temp - low) / (high - low), 0, 1) * 100 : 50

  return (
    <Tile label="Temperature" meta={`°${unit}`}>
      <View style={styles.row}>
        <View style={styles.tempReadout}>
          <Text style={styles.tempValue}>{fixed1(temp)}</Text>
          <Text style={styles.tempDegree}>°</Text>
        </View>
        <ConditionIcon code={current.condition.code} text={current.condition.text} isDay={current.is_day === 1} size={48} strokeWidth={1.4} />
      </View>
      <View style={styles.sub}>
        <Text style={styles.subText}>
          Feels <Text style={styles.subStrong}>{fixed1(tempValue(current.feelslike_c, unit))}°</Text>
        </Text>
        <Text style={styles.subText}>
          Dew{' '}
          <Text style={styles.subStrong}>
            {current.dewpoint_c != null ? `${fixed1(tempValue(current.dewpoint_c, unit))}°` : '--'}
          </Text>
        </Text>
      </View>
      <Text style={styles.condition} numberOfLines={2}>
        {current.condition.text} · {conditionTitleByCategory(getCategory(current.condition.code, current.condition.text))}
      </Text>
      <View style={styles.rail}>
        <Text style={styles.railEnd}>{fixed1(low)}</Text>
        <View style={styles.railTrack}>
          <View style={styles.railFill} />
          <View style={[styles.railTick, { left: `${position}%` }]} />
        </View>
        <Text style={styles.railEnd}>{fixed1(high)}</Text>
      </View>
    </Tile>
  )
}

/* ---------- condition ---------- */

export function ConditionTile({ current, hour, settings }) {
  const { styles } = useStyles(makeStyles)
  const isDay = current.is_day === 1
  const text = current.condition.text
  const vis = formatVisibility(current.vis_km ?? 0, settings.distanceUnit)

  return (
    <Tile label="Condition" meta={`Code ${current.condition.code}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <ConditionIcon code={current.condition.code} text={text} isDay={isDay} size={54} strokeWidth={1.4} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.conditionTitle} numberOfLines={2}>
            {text}
          </Text>
          <Text style={styles.conditionSub}>
            {isDay ? 'Day' : 'Night'} · {conditionTitleByCategory(getCategory(current.condition.code, text))}
          </Text>
        </View>
      </View>
      <View style={styles.stats}>
        <Stat label="Cloud" value={`${current.cloud ?? 0}%`} />
        <Stat label="Rain" value={`${hour?.chance_of_rain ?? 0}%`} />
        <Stat label="Vis" value={`${vis.value} ${vis.label}`} />
      </View>
    </Tile>
  )
}

/* ---------- wind ---------- */

function Compass({ degree = 0, size = 88 }) {
  const theme = useTheme()
  const c = size / 2
  const r = c - 4
  const ticks = []
  for (let i = 0; i < 36; i++) {
    const a = ((i * 10 - 90) * Math.PI) / 180
    const major = i % 9 === 0
    const r1 = major ? r - 9 : r - 5
    ticks.push(
      <Path
        key={i}
        d={`M${(c + r1 * Math.cos(a)).toFixed(1)} ${(c + r1 * Math.sin(a)).toFixed(1)} L${(c + r * Math.cos(a)).toFixed(1)} ${(c + r * Math.sin(a)).toFixed(1)}`}
        stroke={major ? theme.muted : theme.border}
        strokeWidth={major ? 1.5 : 1}
      />
    )
  }
  const lr = r - 18
  const letter = (text, deg) => {
    const a = ((deg - 90) * Math.PI) / 180
    return (
      <SvgText
        key={text}
        x={(c + lr * Math.cos(a)).toFixed(1)}
        y={(c + lr * Math.sin(a) + 3.5).toFixed(1)}
        textAnchor="middle"
        fontSize="9"
        fontFamily={FONTS.mono}
        fill={text === 'N' ? theme.text : theme.dim}
      >
        {text}
      </SvgText>
    )
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill="none" stroke={theme.border} />
      {ticks}
      {letter('N', 0)}
      {letter('E', 90)}
      {letter('S', 180)}
      {letter('W', 270)}
      <Path
        d={`M${c} ${c - r + 12} L${c + 5} ${c} L${c} ${c - 5} L${c - 5} ${c} Z`}
        fill={theme.amber}
        transform={`rotate(${degree} ${c} ${c})`}
      />
      <Path d={`M${c} ${c} L${c} ${c + r - 16}`} stroke={theme.dim} strokeWidth={1.5} transform={`rotate(${degree} ${c} ${c})`} />
      <Circle cx={c} cy={c} r={3} fill={theme.text} />
    </Svg>
  )
}

export function WindTile({ current, settings, style }) {
  const { styles } = useStyles(makeStyles)
  const unit = settings.speedUnit
  const degree = current.wind_degree ?? 0

  return (
    <Tile label="Wind" meta={`${current.wind_dir || '--'} ${degree}°`} style={style}>
      <View style={{ alignItems: 'center' }}>
        <Compass degree={degree} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <View style={styles.bigValue}>
          <Text style={styles.numLg}>{Math.round(speedValue(current.wind_kph ?? 0, unit))}</Text>
          <Text style={styles.unit}>{speedLabel(unit)}</Text>
        </View>
        <Text style={styles.gust}>G {Math.round(speedValue(current.gust_kph ?? 0, unit))}</Text>
      </View>
    </Tile>
  )
}

/* ---------- humidity & pressure ---------- */

export function HumidityTile({ current, settings, style }) {
  const { styles } = useStyles(makeStyles)
  const humidity = current.humidity ?? 0
  const vis = formatVisibility(current.vis_km ?? 0, settings.distanceUnit)

  return (
    <Tile label="Humidity" meta="RH" style={style}>
      <View style={styles.bigValue}>
        <Text style={styles.numXl}>{humidity}</Text>
        <Text style={styles.unit}>%</Text>
      </View>
      <Segments count={10} filled={Math.round(humidity / 10)} />
      <View style={{ gap: 8, marginTop: 2 }}>
        <KeyValue
          label="Dew"
          value={current.dewpoint_c != null ? `${fixed1(tempValue(current.dewpoint_c, settings.tempUnit))}°` : '--'}
        />
        <KeyValue label="Vis" value={`${vis.value} ${vis.label}`} />
      </View>
    </Tile>
  )
}

export function PressureTile({ current, settings, style }) {
  const { styles } = useStyles(makeStyles)
  const mb = current.pressure_mb ?? 0
  const hPa = { value: String(Math.round(mb)), label: 'hPa' }
  const inHg = { value: (mb * 0.0295299830714).toFixed(2), label: 'inHg' }
  const [main, alternate] = settings.pressureUnit === 'inHg' ? [inHg, hPa] : [hPa, inHg]

  return (
    <Tile label="Pressure" meta="MSL" style={style}>
      <View style={styles.bigValue}>
        <Text style={styles.numXl}>{main.value}</Text>
        <Text style={styles.unit}>{main.label}</Text>
      </View>
      <View style={{ gap: 8, marginTop: 'auto' }}>
        <KeyValue label={alternate.label} value={alternate.value} />
        <KeyValue label="Cloud" value={`${current.cloud ?? 0}%`} />
      </View>
    </Tile>
  )
}

/* ---------- air quality ---------- */

const POLLUTANTS = [
  { key: 'pm2_5', label: 'PM2.5', cap: 75 },
  { key: 'pm10', label: 'PM10', cap: 150 },
  { key: 'o3', label: 'O₃', cap: 180 },
  { key: 'no2', label: 'NO₂', cap: 100 },
]

export function AirQualityTile({ airQuality, style }) {
  const { styles } = useStyles(makeStyles)
  const raw = airQuality?.['us-epa-index']
  if (raw === undefined || raw === null) {
    return (
      <Tile label="Air quality" meta="US EPA" style={style}>
        <Note>No air quality data here.</Note>
      </Tile>
    )
  }

  const level = aqiLevel(raw)
  const ranges = AQI_COLORS.map((color, i) => ({ from: i, to: i + 1, color, active: i === level.index - 1 }))
  const rows = POLLUTANTS.filter(p => typeof airQuality[p.key] === 'number').map(p => ({
    label: p.label,
    percent: (airQuality[p.key] / p.cap) * 100,
    value: Math.round(airQuality[p.key]),
  }))

  return (
    <Tile label="Air quality" meta="US EPA" style={style}>
      <View style={{ alignItems: 'center' }}>
        <Gauge ranges={ranges} total={6} value={level.index - 0.5} accessibilityLabel={`Air quality ${level.label}`} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <View style={styles.bigValue}>
          <Text style={styles.numLg}>{level.index}</Text>
          <Text style={styles.numSub}>/6</Text>
        </View>
        <Text style={[styles.moonPhase, { flexShrink: 1, textAlign: 'right' }]}>{level.label}</Text>
      </View>
      <Bars rows={rows} />
      <Note>{level.advice}</Note>
    </Tile>
  )
}

/* ---------- UV ---------- */

export function UvTile({ uv, hours = [], nowHour, settings, style }) {
  const { styles, theme } = useStyles(makeStyles)
  const value = typeof uv === 'number' ? uv : 0
  const level = uvLevel(value)
  const ranges = UV_RANGES.map(r => ({ ...r, active: value >= r.from && value < r.to }))
  const daylight = hours.filter(h => {
    const c = parseClock(h.time)
    return c && c.h >= 7 && c.h <= 18
  })
  const peak = hours.reduce((best, h) => ((h.uv ?? 0) > (best?.uv ?? -1) ? h : best), null)

  return (
    <Tile label="UV index" meta={peak?.uv ? `Peak ${formatTime(peak.time, settings.hourFormat)}` : 'Today'} style={style}>
      <View style={{ alignItems: 'center' }}>
        <Gauge ranges={ranges} total={12} value={Math.min(value, 12)} accessibilityLabel={`UV index ${Math.round(value)}`} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <Text style={styles.numLg}>{Math.round(value)}</Text>
        <Text style={styles.moonPhase}>{level.label}</Text>
      </View>
      {daylight.length > 0 && (
        <View style={styles.uvBars}>
          {daylight.map(h => {
            const c = parseClock(h.time)
            const isNow = c && nowHour != null && c.h === Math.floor(nowHour)
            return (
              <View key={h.time} style={styles.uvBar}>
                <View
                  style={[
                    styles.uvBarFill,
                    { height: Math.max(2, ((h.uv ?? 0) / 11) * 30), opacity: isNow ? 1 : 0.35 },
                  ]}
                />
                <Text style={[styles.uvBarLabel, isNow && { color: theme.text }]}>{String(c.h).padStart(2, '0')}</Text>
              </View>
            )
          })}
        </View>
      )}
      <View style={{ gap: 8 }}>
        <KeyValue label="Burn time" value={uvBurnTime(value)} />
        <KeyValue label="Protect" value={uvProtection(value)} />
      </View>
    </Tile>
  )
}

/* ---------- sun & moon ---------- */

function SunArc({ progress, width }) {
  const theme = useTheme()
  const H = 96
  const base = H - 12
  const rx = width / 2 - 14
  const ry = H - 30
  const cx = width / 2
  const angle = Math.PI * (1 - progress)
  const x = cx + rx * Math.cos(angle)
  const y = base - ry * Math.sin(angle)

  return (
    <Svg width={width} height={H} viewBox={`0 0 ${width} ${H}`}>
      <Path d={`M0 ${base} H${width}`} stroke={theme.border} />
      <Path
        d={`M${cx - rx} ${base} A${rx} ${ry} 0 0 1 ${cx + rx} ${base}`}
        fill="none"
        stroke={theme.dim}
        strokeWidth={1.5}
        strokeDasharray="2 4"
      />
      {progress > 0 && (
        <Path
          d={`M${cx - rx} ${base} A${rx} ${ry} 0 0 1 ${x.toFixed(1)} ${y.toFixed(1)}`}
          fill="none"
          stroke={theme.amber}
          strokeWidth={1.5}
        />
      )}
      {progress > 0 && progress < 1 && <Circle cx={x.toFixed(1)} cy={y.toFixed(1)} r={7} fill={theme.amber} stroke={theme.panel} strokeWidth={3} />}
    </Svg>
  )
}

export function SunTile({ astro, localtime, settings, width }) {
  const { styles } = useStyles(makeStyles)
  const rise = clockHours(astro?.sunrise)
  const set = clockHours(astro?.sunset)
  const now = clockHours(localtime)
  const hasWindow = rise != null && set != null && set > rise && now != null
  const raw = hasWindow ? (now - rise) / (set - rise) : 0
  const progress = clamp(raw, 0, 1)
  const isNight = !hasWindow || raw <= 0 || raw >= 1

  return (
    <Tile label="Sun" meta={`Daylight ${dayLength(astro?.sunrise, astro?.sunset) || '--'}`}>
      <View style={styles.sunRow}>
        <SunArc progress={isNight ? 0 : progress} width={width} />
        <View style={{ gap: 8 }}>
          <KeyValue label="Rise" value={formatTime(astro?.sunrise, settings.hourFormat)} />
          <KeyValue label="Set" value={formatTime(astro?.sunset, settings.hourFormat)} />
          <KeyValue label="Elapsed" value={isNight ? 'Night' : `${Math.round(progress * 100)}%`} accent />
        </View>
      </View>
    </Tile>
  )
}

function MoonDisc({ illumination = 0, waning = false, size = 56 }) {
  const theme = useTheme()
  const r = size / 2 - 1
  const c = size / 2
  const k = clamp(illumination / 100, 0, 1)
  const rx = Math.abs(r * (1 - 2 * k))
  const sweep = k < 0.5 ? 0 : 1

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={r} fill={theme.bg} stroke={theme.border} />
      {k > 0.005 && (
        <Path
          d={`M${c} ${c - r} A${r} ${r} 0 0 1 ${c} ${c + r} A${rx.toFixed(2)} ${r} 0 0 ${sweep} ${c} ${c - r}z`}
          fill={theme.moonLit}
          transform={waning ? `scale(-1 1) translate(${-size} 0)` : undefined}
        />
      )}
    </Svg>
  )
}

export function MoonTile({ astro, settings, style }) {
  const { styles } = useStyles(makeStyles)
  const illumination = Number(astro?.moon_illumination)
  const phase = astro?.moon_phase || 'Moon'
  const rise = astro?.moonrise

  return (
    <Tile label="Moon" meta={Number.isFinite(illumination) ? `Illum ${Math.round(illumination)}%` : ''} style={style}>
      <View style={styles.moonRow}>
        <MoonDisc illumination={Number.isFinite(illumination) ? illumination : 0} waning={moonIsWaning(phase)} />
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <Text style={styles.moonPhase}>{phase}</Text>
          <Text style={styles.moonRise}>
            Rise {rise && /\d/.test(rise) ? formatTime(rise, settings.hourFormat) : '--'}
          </Text>
        </View>
      </View>
    </Tile>
  )
}

/* ---------- advisories ---------- */

export function AdvisoriesTile({ current, day }) {
  const { styles } = useStyles(makeStyles)
  const chanceOfRain = day?.daily_chance_of_rain ?? 0
  const activity = activityAdvice({
    category: getCategory(current.condition.code, current.condition.text),
    uv: current.uv,
    windKph: current.wind_kph,
    chanceOfRain,
  })
  const rain = rainAdvice(chanceOfRain)
  const rows = [
    { tag: 'Wear', text: clothingAdvice(current.feelslike_c).text },
    { tag: activity.tag, text: activity.text },
    rain && { tag: 'Rain', text: rain.text },
    {
      tag: 'Comfort',
      text: comfortLabel({ feelslikeC: current.feelslike_c, tempC: current.temp_c, humidity: current.humidity }).text,
    },
  ].filter(Boolean)

  return (
    <Tile label="Advisories" meta="Rule-based">
      <View>
        {rows.map((row, i) => (
          <View key={`${row.tag}-${i}`} style={[styles.advRow, i > 0 && styles.divider]}>
            <Text style={styles.advTag}>{row.tag}</Text>
            <Text style={styles.advText}>{row.text}</Text>
          </View>
        ))}
      </View>
    </Tile>
  )
}

export { Scale, GaugeRow }
