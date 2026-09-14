# WX Weather — mobile

The phone version of the [Weather-App](../Weather-App) dashboard, built with
**Expo (React Native)**. Same instrument-panel design, same data, same rules —
graphite tiles, IBM Plex Mono figures, gauges, one scrolling screen.

## Run it on your phone

1. Install **Expo Go** (App Store / Play Store).
2. In this folder:

```bash
npm install     # first time only
npm start
```

3. Scan the QR code in the terminal with Expo Go (Android) or the Camera app (iOS).
   The phone and this computer must be on the same Wi-Fi. If the office network
   blocks it, run `npx expo start --tunnel` instead.

`npm run web` opens a browser preview. Everything works there except the radar
map, which needs the native WebView.

## Panels

Temperature · Condition · Wind (compass) · Humidity · Pressure · 24-hour
temperature chart · 3-day forecast · Air quality · UV index · Moon · Advisories ·
Sun arc · Radar.

- **Drag across the chart** to read any hour (temperature, feels-like, UV, rain
  chance, wind).
- **Tap a forecast row** for that day's sunrise, sunset, max wind, precipitation,
  humidity and moon.
- **Radar** plays the last two hours of RainViewer frames; tap a bar to jump to a
  frame, tap the opacity label to cycle 100/75/50/25%.
- **Pull down** to refresh; the app also refreshes every 10 minutes and whenever
  you bring it back to the foreground.
- The search screen (magnifier) finds cities; the star tab saves the current one;
  settings (sliders) holds units, clock, theme and "use my current location".

## Data

[WeatherAPI.com](https://www.weatherapi.com) for weather, air quality and alerts;
[RainViewer](https://www.rainviewer.com) for radar tiles; OpenStreetMap for the
basemap. The API key ships in the bundle (there is no server), the same
trade-off the web app makes. To use a different key, create `.env`:

```
EXPO_PUBLIC_WEATHER_API_KEY=your_key_here
```

## Shared with the web app

`src/lib/units.js`, `src/lib/conditions.js` and `src/lib/countries.js` are copies
of the web app's files — plain JavaScript with no DOM use. Fix a rule (an
advisory, the US EPA air-quality scale, a condition code) in one place and copy
it to the other.

## Building an installable app

Expo Go is for development. For a real APK or an App Store build:

```bash
npx eas build -p android --profile preview   # needs a free Expo account
```
