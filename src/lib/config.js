// Client-side WeatherAPI key. The app talks to WeatherAPI directly, so the key
// ships inside the bundle and counts against that account's quota — the same
// trade-off the web version makes. Override it without editing source by putting
// EXPO_PUBLIC_WEATHER_API_KEY in a .env file at the project root.
export const WEATHER_API_KEY =
  process.env.EXPO_PUBLIC_WEATHER_API_KEY || '841319420b9143e1b02180335232302'

export default WEATHER_API_KEY
