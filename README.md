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

## Building an installable APK

Android builds need a JDK 17 and the Android SDK; Gradle pulls the NDK itself
(about 3.5 GB in total the first time). No Android Studio required.

```bash
npx expo prebuild -p android     # generates android/
cd android
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

The APK lands in `android/app/build/outputs/apk/release/`. Dropping
`-PreactNativeArchitectures` builds for all four CPU types — it runs on any
phone but roughly triples the size (~29 MB vs ~80 MB).

### On Windows: two things bite

1. **The 260-character path limit.** CMake mirrors the full source path inside
   its object directory, so `node_modules/react-native-safe-area-context/...`
   ends up well past the limit and `ninja` fails with `Stat(...)`. Either enable
   long paths once (admin):

   ```
   reg add "HKLM\SYSTEM\CurrentControlSet\Control\FileSystem" /v LongPathsEnabled /t REG_DWORD /d 1 /f
   ```

   …or, without admin, shorten both halves of the path — build through a short
   junction and send CMake's output elsewhere:

   ```
   mklink /J C:\w "<this folder>"
   ```

   then in `android/app/build.gradle`, inside `android { }`:

   ```gradle
   externalNativeBuild { cmake { buildStagingDirectory = file("C:/x") } }
   ```

   and build from `C:\wndroid`. (Regenerate those after any `expo prebuild`,
   which overwrites `android/`.)

2. **Don't map the project to a drive root** (`subst W: <project>`). Expo's
   autolinking walks *up* for `package.json` and never checks the root itself,
   so it fails with `Couldn't find "package.json" up from path "W:ndroid"`.
   A junction one level down, like `C:\w`, avoids this.

### Signing

`android/app/wx-release.keystore` with its password in
`android/keystore.properties` — both gitignored. Keep backups: Android refuses
to install an update signed with a different key.

For a Play Store build or an iOS build, Expo's cloud service does it on Linux
(no path-limit games):

```bash
npx eas build -p android --profile production   # needs a free Expo account
```
