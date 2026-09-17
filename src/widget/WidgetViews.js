import React from 'react'
import { FlexWidget, SvgWidget, TextWidget } from 'react-native-android-widget'
import { ICON_PATHS } from '../components/Icons'
import { DARK, LIGHT } from '../theme'
import { translator } from '../lib/i18n'

const LATIN = { mono: 'IBMPlexMono-Regular', monoMedium: 'IBMPlexMono-Medium', cond: 'IBMPlexSansCondensed-SemiBold' }
const ARABIC = { mono: 'IBMPlexSansArabic-Regular', monoMedium: 'IBMPlexSansArabic-Medium', cond: 'IBMPlexSansArabic-SemiBold' }

// set once per render from the summary's language, then read by the text helpers
let MONO = LATIN.mono
let MONO_MEDIUM = LATIN.monoMedium
let COND = LATIN.cond
let UPPER = true

const iconTint = (name, t) => {
  if (name === 'sun' || name === 'partly' || name === 'thunder') return t.amber
  if (name === 'rain' || name === 'sleet') return t.cyan
  if (name === 'moon' || name === 'partlyNight') return t.mode === 'light' ? '#5b6bb5' : '#b9c6ff'
  if (name === 'dust') return '#c89b6a'
  return t.muted
}

// the app's stroke icons, as SVG strings the widget runtime can rasterize
function iconSvg(name, color, strokeWidth = 1.7) {
  const parts = ICON_PATHS[name] || ICON_PATHS.cloud
  const body = parts
    .map(part =>
      part.d
        ? `<path d="${part.d}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
        : `<circle cx="${part.cx}" cy="${part.cy}" r="${part.r}" stroke="${color}" stroke-width="${strokeWidth}" fill="none"/>`
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${body}</svg>`
}

const Icon = ({ name, size, theme, strokeWidth }) => (
  <SvgWidget svg={iconSvg(name, iconTint(name, theme), strokeWidth)} style={{ width: size, height: size }} />
)

const Label = ({ children, theme, size = 10, color }) => (
  <TextWidget
    text={UPPER ? String(children).toUpperCase() : String(children)}
    style={{ fontFamily: COND, fontSize: size, letterSpacing: UPPER ? size * 0.09 : 0, color: color || theme.muted }}
  />
)

const Mono = ({ children, theme, size = 12, color, medium }) => (
  <TextWidget
    text={String(children)}
    style={{ fontFamily: medium ? MONO_MEDIUM : MONO, fontSize: size, color: color || theme.text }}
  />
)

// when the reading came from cache without a connection, label it
const stamp = d => (d.offline ? `OFF ${d.updated}` : `UPD ${d.updated}`)

const shell = theme => ({
  height: 'match_parent',
  width: 'match_parent',
  backgroundColor: theme.panel,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: theme.border,
  padding: 12,
  flexDirection: 'column',
})

const NoData = ({ theme, t }) => (
  <FlexWidget style={{ ...shell(theme), justifyContent: 'center', alignItems: 'center' }} clickAction="OPEN_APP">
    <Label theme={theme} size={11}>{t('widget.tapToLoad')}</Label>
  </FlexWidget>
)

/* 2x1 — temperature and condition at a glance */
function Compact({ d, theme }) {
  return (
    <FlexWidget
      style={{ ...shell(theme), flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10 }}
      clickAction="OPEN_APP"
      accessibilityLabel={`${d.city}, ${d.temp} degrees, ${d.condition}`}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
        <Icon name={d.icon} size={30} theme={theme} />
        <FlexWidget style={{ flexDirection: 'column' }}>
          <Mono theme={theme} size={26} medium>{`${d.temp}°`}</Mono>
          <Label theme={theme} size={9}>{d.city}</Label>
        </FlexWidget>
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
        <Mono theme={theme} size={11} color={theme.muted}>{`H ${d.hi}`}</Mono>
        <Mono theme={theme} size={11} color={theme.muted}>{`L ${d.lo}`}</Mono>
      </FlexWidget>
    </FlexWidget>
  )
}

/* 3x2 — the current conditions panel */
function Current({ d, theme }) {
  return (
    <FlexWidget style={shell(theme)} clickAction="OPEN_APP" accessibilityLabel={`${d.city}, ${d.temp} degrees, ${d.condition}`}>
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: 'match_parent' }}>
        <Label theme={theme} size={10} color={theme.text}>{d.city}</Label>
        <Mono theme={theme} size={9} color={theme.dim}>{stamp(d)}</Mono>
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent', marginTop: 6 }}>
        <Mono theme={theme} size={42} medium>{`${d.temp}°`}</Mono>
        <Icon name={d.icon} size={40} theme={theme} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'column', marginTop: 6 }}>
        <Label theme={theme} size={11} color={theme.text}>{d.condition}</Label>
        <Mono theme={theme} size={10} color={theme.muted}>
          {`FEELS ${d.feels}°  ·  H ${d.hi}  L ${d.lo}`}
        </Mono>
      </FlexWidget>
    </FlexWidget>
  )
}

/* 4x2 — next hours */
function Hourly({ d, theme }) {
  return (
    <FlexWidget style={shell(theme)} clickAction="OPEN_APP" accessibilityLabel={`${d.city} hourly forecast`}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8 }}>
          <Icon name={d.icon} size={22} theme={theme} />
          <Mono theme={theme} size={22} medium>{`${d.temp}°`}</Mono>
          <Label theme={theme} size={10}>{d.city}</Label>
        </FlexWidget>
        <Mono theme={theme} size={9} color={theme.dim}>{stamp(d)}</Mono>
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 10,
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        {d.hours.map(hour => (
          <FlexWidget key={hour.label} style={{ flexDirection: 'column', alignItems: 'center', flexGap: 3 }}>
            <Mono theme={theme} size={9} color={theme.dim}>{hour.label}</Mono>
            <Icon name={hour.icon} size={18} theme={theme} />
            <Mono theme={theme} size={12} medium>{`${hour.temp}°`}</Mono>
          </FlexWidget>
        ))}
      </FlexWidget>
    </FlexWidget>
  )
}

/* 4x3 — the full panel: current, days, and the extra readings */
function Forecast({ d, theme }) {
  return (
    <FlexWidget style={shell(theme)} clickAction="OPEN_APP" accessibilityLabel={`${d.city} forecast`}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 10 }}>
          <Icon name={d.icon} size={30} theme={theme} />
          <FlexWidget style={{ flexDirection: 'column' }}>
            <Mono theme={theme} size={28} medium>{`${d.temp}°`}</Mono>
            <Label theme={theme} size={9}>{`${d.city} · ${d.condition}`}</Label>
          </FlexWidget>
        </FlexWidget>
        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <Mono theme={theme} size={11} color={theme.muted}>{`H ${d.hi}  L ${d.lo}`}</Mono>
          <Mono theme={theme} size={9} color={theme.dim}>{stamp(d)}</Mono>
        </FlexWidget>
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'column',
          width: 'match_parent',
          marginTop: 8,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          flexGap: 2,
        }}
      >
        {d.days.map(day => (
          <FlexWidget
            key={day.label}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: 'match_parent', paddingVertical: 2 }}
          >
            <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8, width: 110 }}>
              <Label theme={theme} size={10} color={day.label === 'Today' ? theme.amber : theme.muted}>{day.label}</Label>
              <Icon name={day.icon} size={16} theme={theme} />
            </FlexWidget>
            <Mono theme={theme} size={10} color={day.rain > 0 ? theme.cyan : theme.dim}>{`${day.rain}%`}</Mono>
            <Mono theme={theme} size={12}>{`${day.lo}  ${day.hi}`}</Mono>
          </FlexWidget>
        ))}
      </FlexWidget>

      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginTop: 6,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
        <Mono theme={theme} size={9} color={theme.dim}>{`WIND ${d.wind}`}</Mono>
        <Mono theme={theme} size={9} color={theme.dim}>{`RH ${d.humidity}%`}</Mono>
        {d.uv != null ? <Mono theme={theme} size={9} color={theme.dim}>{`UV ${d.uv}`}</Mono> : null}
        {d.aqi != null ? <Mono theme={theme} size={9} color={theme.dim}>{`AQI ${d.aqi}/6`}</Mono> : null}
      </FlexWidget>
    </FlexWidget>
  )
}

const VIEWS = { WxCompact: Compact, WxCurrent: Current, WxHourly: Hourly, WxForecast: Forecast }

export function renderWidgetView(widgetName, data) {
  const theme = data?.theme === 'light' ? LIGHT : DARK
  const arabic = (data?.language || 'en') === 'ar'
  const faces = arabic ? ARABIC : LATIN
  MONO = faces.mono
  MONO_MEDIUM = faces.monoMedium
  COND = faces.cond
  UPPER = !arabic
  const t = translator(data?.language || 'en')
  if (!data) return <NoData theme={theme} t={t} />
  const View = VIEWS[widgetName] || Current
  return <View d={data} theme={theme} />
}

export const WIDGET_NAMES = Object.keys(VIEWS)
