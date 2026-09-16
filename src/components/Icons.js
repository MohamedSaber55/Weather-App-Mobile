import React from 'react'
import Svg, { Circle, Path, Rect } from 'react-native-svg'
import { getCategory } from '../lib/conditions'
import { useTheme } from '../theme'

const P = d => ({ d })
const C = (cx, cy, r) => ({ cx, cy, r })
const CLOUD_HIGH = 'M7 14h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 5.1 4.5 4.5 0 0 0 7 14z'

// same geometry as the web app's icon set
export const ICON_PATHS = {
  search: [C(11, 11, 7), P('M20 20l-3.5-3.5')],
  locate: [C(12, 12, 7), C(12, 12, 2.5), P('M12 2v3M12 19v3M2 12h3M19 12h3')],
  sliders: [P('M4 7h10M18 7h2M4 17h4M12 17h8'), C(16, 7, 2), C(10, 17, 2)],
  moon: [P('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z')],
  sun: [C(12, 12, 4), P('M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4')],
  partly: [
    P('M8 2.5V4M2.5 8H4M4.1 4.1l1 1M11.9 4.1l-1 1'),
    P('M5.4 10.9A3.5 3.5 0 0 1 11.3 6.4'),
    P('M9 20h8.5a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.4 12.3 3.9 3.9 0 0 0 9 20z'),
  ],
  partlyNight: [
    P('M8.6 3a4 4 0 0 0 3.6 5.6 4.2 4.2 0 0 1-7.9-1.6A4.2 4.2 0 0 1 8.6 3z'),
    P('M9 20h8.5a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.4 12.3 3.9 3.9 0 0 0 9 20z'),
  ],
  cloud: [P('M7 18.5h10.5a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.6 9.6 4.5 4.5 0 0 0 7 18.5z')],
  fog: [P(CLOUD_HIGH), P('M4 17.5h16M7 21h10')],
  rain: [P(CLOUD_HIGH), P('M8 17.5l-1 3M12 17.5l-1 3M16 17.5l-1 3')],
  snow: [P(CLOUD_HIGH), P('M8 18h.01M12 18h.01M16 18h.01M10 21.5h.01M14 21.5h.01')],
  sleet: [P(CLOUD_HIGH), P('M8 17.5l-1 3M12 18h.01M16 17.5l-1 3M12 21.5h.01')],
  thunder: [P(CLOUD_HIGH), P('M12.5 14.5L10 18.5h4l-2.5 4')],
  dust: [
    P('M3 8h11a2.5 2.5 0 1 0-2.4-3.2'),
    P('M3 12h15.5a2.5 2.5 0 1 1-2.4 3.2'),
    P('M3 16h8'),
    P('M17 8.5h.01M20 12h.01M8 20h.01M13 19.5h.01'),
  ],
  plus: [P('M12 5v14M5 12h14')],
  home: [P('M4 11.5 12 4l8 7.5'), P('M6 10.5V20h12v-9.5'), P('M10 20v-5h4v5')],
  trash: [P('M4 7h16'), P('M9 7V5h6v2'), P('M6.5 7l1 13h9l1-13')],
  star: [P('M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z')],
  play: [P('M8 5.5v13l10-6.5z')],
  pause: [P('M9 5v14M15 5v14')],
  alert: [P('M12 3.5L2.5 20h19z'), P('M12 10v4.5M12 17.5h.01')],
  close: [P('M6 6l12 12M18 6L6 18')],
  rotate: [P('M20 11a8 8 0 1 0-2.3 5.7'), P('M20 4v7h-7')],
  chevronDown: [P('M6 9l6 6 6-6')],
  pin: [P('M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z'), C(12, 10, 2.3)],
  history: [P('M3.5 12a8.5 8.5 0 1 0 2.5-6'), P('M3 4v4h4M12 7.5V12l3 2')],
}

export function Icon({ name, size = 16, color, strokeWidth = 1.6, fill = 'none' }) {
  const theme = useTheme()
  const stroke = color || theme.muted
  const parts = ICON_PATHS[name] || []
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {parts.map((part, i) =>
        part.d ? (
          <Path
            key={i}
            d={part.d}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={fill}
          />
        ) : (
          <Circle key={i} cx={part.cx} cy={part.cy} r={part.r} stroke={stroke} strokeWidth={strokeWidth} fill={fill} />
        )
      )}
    </Svg>
  )
}

export function conditionIconName(code, isDay = true, text) {
  switch (getCategory(code, text)) {
    case 'clear':
      return isDay ? 'sun' : 'moon'
    case 'partly':
      return isDay ? 'partly' : 'partlyNight'
    case 'fog':
      return 'fog'
    case 'rain':
      return 'rain'
    case 'snow':
      return 'snow'
    case 'sleet':
      return 'sleet'
    case 'thunder':
      return 'thunder'
    case 'dust':
      return 'dust'
    default:
      return 'cloud'
  }
}

export function conditionColor(name, theme) {
  if (name === 'sun' || name === 'partly' || name === 'thunder') return theme.amber
  if (name === 'rain' || name === 'sleet') return theme.cyan
  if (name === 'moon' || name === 'partlyNight') return theme.mode === 'light' ? '#5b6bb5' : '#b9c6ff'
  if (name === 'dust') return '#c89b6a'
  return theme.muted
}

export function ConditionIcon({ code, isDay = true, text, size = 16, strokeWidth = 1.6 }) {
  const theme = useTheme()
  const name = conditionIconName(code, isDay, text)
  return <Icon name={name} size={size} color={conditionColor(name, theme)} strokeWidth={strokeWidth} />
}

export function Logo({ size = 22 }) {
  const theme = useTheme()
  return (
    <Svg width={size} height={size} viewBox="0 0 22 22">
      <Circle cx="11" cy="11" r="9.5" fill="none" stroke={theme.amber} strokeWidth="1.5" />
      <Circle cx="11" cy="11" r="4" fill={theme.amber} />
    </Svg>
  )
}

export { Rect }
export default Icon
