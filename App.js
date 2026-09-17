import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
// deep imports: the package roots pull in every weight and italic
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular'
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium'
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold'
import { IBMPlexSansCondensed_400Regular } from '@expo-google-fonts/ibm-plex-sans-condensed/400Regular'
import { IBMPlexSansCondensed_500Medium } from '@expo-google-fonts/ibm-plex-sans-condensed/500Medium'
import { IBMPlexSansCondensed_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-condensed/600SemiBold'
import { IBMPlexSansArabic_400Regular } from '@expo-google-fonts/ibm-plex-sans-arabic/400Regular'
import { IBMPlexSansArabic_500Medium } from '@expo-google-fonts/ibm-plex-sans-arabic/500Medium'
import { IBMPlexSansArabic_600SemiBold } from '@expo-google-fonts/ibm-plex-sans-arabic/600SemiBold'
import { SettingsProvider, useSettings } from './src/context/SettingsContext'
import { FavoritesProvider } from './src/context/FavoritesContext'
import Dashboard from './src/screens/Dashboard'
import { DARK, useTheme } from './src/theme'

function Shell() {
  const theme = useTheme()
  const { loaded } = useSettings()

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.amber} />
      </View>
    )
  }

  return (
    <>
      <StatusBar style={theme.mode === 'light' ? 'dark' : 'light'} backgroundColor={theme.bg} />
      <Dashboard />
    </>
  )
}

export default function App() {
  const [fontsLoaded] = useFonts({
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
    IBMPlexSansCondensed_400Regular,
    IBMPlexSansCondensed_500Medium,
    IBMPlexSansCondensed_600SemiBold,
    // Plex Mono and Plex Sans Condensed have no Arabic glyphs
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
  })

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: DARK.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={DARK.amber} />
      </View>
    )
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <FavoritesProvider>
          <Shell />
        </FavoritesProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  )
}
