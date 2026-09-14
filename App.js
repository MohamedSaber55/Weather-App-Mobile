import React from 'react'
import { ActivityIndicator, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts } from 'expo-font'
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono'
import {
  IBMPlexSansCondensed_400Regular,
  IBMPlexSansCondensed_500Medium,
  IBMPlexSansCondensed_600SemiBold,
} from '@expo-google-fonts/ibm-plex-sans-condensed'
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
