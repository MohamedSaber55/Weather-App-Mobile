import React, { useState } from 'react'
import { View } from 'react-native'
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg'
import { Tile } from '../Tile'
import { FONTS, useTheme } from '../../theme'
import { useI18n } from '../../context/SettingsContext'
import { clamp, clockHours, fixed1, formatTime, parseClock, speedLabel, speedValue, tempValue } from '../../lib/units'

const PAD = { l: 28, r: 8, t: 10, b: 22 }
const TIP_W = 158
const TIP_H = 58

function smoothPath(points) {
  const f = v => v.toFixed(1)
  let d = `M${f(points[0][0])} ${f(points[0][1])}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`
  }
  return d
}

export default function ChartTile({ day, current, location, settings, width }) {
  const theme = useTheme()
  const { t } = useI18n()
  const [hover, setHover] = useState(null)
  const hours = day?.hour || []
  const unit = settings.tempUnit
  const n = hours.length
  if (n < 2 || !width) return null

  const W = width
  const H = 190
  const temps = hours.map(h => tempValue(h.temp_c, unit))
  const minV = Math.min(...temps)
  const maxV = Math.max(...temps)
  const lo = minV - 3
  const hi = maxV + 2
  const step = hi - lo > 30 ? 10 : 5

  const x = i => PAD.l + (i * (W - PAD.l - PAD.r)) / (n - 1)
  const y = v => PAD.t + (1 - (v - lo) / (hi - lo)) * (H - PAD.t - PAD.b)
  const valueAt = idx => {
    const i = Math.floor(idx)
    const t = idx - i
    return temps[i] + ((temps[Math.min(i + 1, n - 1)] ?? temps[i]) - temps[i]) * t
  }

  const nowH = clamp(clockHours(location.localtime) ?? 0, 0, n - 1)
  const active = hover ?? nowH
  const activeX = x(active)
  const activeY = y(valueAt(active))

  const points = temps.map((v, i) => [x(i), y(v)])
  const line = smoothPath(points)
  const area = `${line} L${x(n - 1).toFixed(1)} ${H - PAD.b} L${x(0).toFixed(1)} ${H - PAD.b} Z`

  const grid = []
  for (let v = Math.ceil(lo / step) * step; v < hi; v += step) grid.push(v)

  const rise = clockHours(day.astro?.sunrise)
  const set = clockHours(day.astro?.sunset)
  const every = W < 360 ? 6 : 4

  const hourData = hover != null ? hours[hover] : null
  const nowHour = hours[Math.floor(nowH)] || hours[0]
  const tip = hourData
    ? {
        title: formatTime(hourData.time, settings.hourFormat),
        temp: tempValue(hourData.temp_c, unit),
        feels: tempValue(hourData.feelslike_c, unit),
        uv: hourData.uv,
        rain: hourData.chance_of_rain ?? 0,
        wind: speedValue(hourData.wind_kph ?? 0, settings.speedUnit),
      }
    : {
        title: `${formatTime(location.localtime, settings.hourFormat)} · ${t('label.now')}`,
        temp: tempValue(current.temp_c, unit),
        feels: tempValue(current.feelslike_c, unit),
        uv: current.uv,
        rain: nowHour?.chance_of_rain ?? 0,
        wind: speedValue(current.wind_kph ?? 0, settings.speedUnit),
      }
  const tipX = activeX + 10 + TIP_W > W - PAD.r ? Math.max(PAD.l, activeX - 10 - TIP_W) : activeX + 10

  const pick = evt => {
    const px = evt.nativeEvent.locationX
    setHover(clamp(Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1)), 0, n - 1))
  }

  const hourLabel = h => {
    const c = parseClock(h.time)
    if (!c) return ''
    if (settings.hourFormat === 12) return `${c.h % 12 || 12}${c.h >= 12 ? 'p' : 'a'}`
    return String(c.h).padStart(2, '0')
  }

  return (
    <Tile label={t('tile.chart')} meta={t('meta.shadedNight', { unit })}>
      <View
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={pick}
        onResponderMove={pick}
        onResponderRelease={() => setHover(null)}
        onResponderTerminate={() => setHover(null)}
      >
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          {grid.map(v => (
            <G key={v}>
              <Path d={`M${PAD.l} ${y(v).toFixed(1)} H${W - PAD.r}`} stroke={theme.border} />
              <SvgText
                x={PAD.l - 6}
                y={(y(v) + 3.5).toFixed(1)}
                textAnchor="end"
                fontSize="10"
                fontFamily={FONTS.mono}
                fill={theme.dim}
              >
                {v}
              </SvgText>
            </G>
          ))}
          {rise != null && (
            <Rect x={PAD.l} y={PAD.t} width={Math.max(0, x(rise) - PAD.l)} height={H - PAD.t - PAD.b} fill={theme.night} opacity={0.55} />
          )}
          {set != null && (
            <Rect x={x(set)} y={PAD.t} width={Math.max(0, W - PAD.r - x(set))} height={H - PAD.t - PAD.b} fill={theme.night} opacity={0.55} />
          )}
          <Path d={area} fill={theme.amber} opacity={0.08} />
          <Path d={line} fill="none" stroke={theme.amber} strokeWidth={2} strokeLinecap="round" />
          <Path
            d={`M${activeX.toFixed(1)} ${PAD.t} V${H - PAD.b}`}
            stroke={theme.text}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
          <Circle cx={activeX.toFixed(1)} cy={activeY.toFixed(1)} r={4.5} fill={theme.amber} stroke={theme.panel} strokeWidth={2} />
          <G x={tipX.toFixed(1)} y={PAD.t + 4}>
            <Rect width={TIP_W} height={TIP_H} rx={4} fill={theme.bg} stroke={theme.border} />
            <SvgText x={9} y={16} fontSize="9" fontFamily={FONTS.mono} fill={theme.dim}>
              {tip.title.toUpperCase()}
            </SvgText>
            <SvgText x={9} y={35} fontSize="14" fontFamily={FONTS.monoMedium} fill={theme.text}>
              {fixed1(tip.temp)}°
            </SvgText>
            <SvgText x={58} y={35} fontSize="10" fontFamily={FONTS.mono} fill={theme.muted}>
              {t('label.feelsShort')} {fixed1(tip.feels)}
            </SvgText>
            <SvgText x={9} y={50} fontSize="9" fontFamily={FONTS.mono} fill={theme.muted}>
              UV {tip.uv ?? '--'} · {t('label.rain')} {tip.rain}% · {Math.round(tip.wind)} {speedLabel(settings.speedUnit)}
            </SvgText>
          </G>
          {hours.map((h, i) =>
            i % every === 0 ? (
              <SvgText
                key={h.time}
                x={x(i).toFixed(1)}
                y={H - 6}
                textAnchor="middle"
                fontSize="10"
                fontFamily={FONTS.mono}
                fill={theme.dim}
              >
                {hourLabel(h)}
              </SvgText>
            ) : null
          )}
        </Svg>
      </View>
    </Tile>
  )
}
