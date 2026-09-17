import React, { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from './Icons'
import { IconButton } from './Tile'
import { label, mono, RADIUS, RTL, useStyles } from '../theme'
import { getSearchResults } from '../lib/api'
import { useFavorites } from '../context/FavoritesContext'
import { useI18n } from '../context/SettingsContext'
import { useNetworkState } from 'expo-network'

const makeStyles = t => ({
  screen: { flex: 1, backgroundColor: t.bg },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 12,
    backgroundColor: t.panel,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: RADIUS,
  },
  input: { flex: 1, ...mono(t, 14), padding: 0 },
  group: { ...label(t, 10), color: t.dim, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  itemName: { ...mono(t, 14), flexShrink: 0 },
  itemRegion: { ...label(t, 11), color: t.dim, flex: 1, textAlign: RTL ? 'left' : 'right' },
  empty: { paddingHorizontal: 16, paddingVertical: 20, ...mono(t, 12), color: t.dim },
  separator: { height: 1, backgroundColor: t.border, marginHorizontal: 16 },
})

export default function SearchOverlay({ visible, onClose, onSelect }) {
  const { styles, theme } = useStyles(makeStyles)
  const { recents } = useFavorites()
  const { t } = useI18n()
  const network = useNetworkState()
  const noConnection = network?.isConnected === false || network?.isInternetReachable === false
  const [text, setText] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!visible) {
      setText('')
      setResults([])
      return undefined
    }
    const timer = setTimeout(() => inputRef.current?.focus(), 120)
    return () => clearTimeout(timer)
  }, [visible])

  useEffect(() => {
    const q = text.trim()
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    const timer = setTimeout(() => {
      getSearchResults(q, 8)
        .then(data => {
          if (cancelled) return
          setResults(Array.isArray(data) ? data : [])
          setLoading(false)
        })
        .catch(() => {
          if (!cancelled) setLoading(false)
        })
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [text])

  const showRecents = text.trim().length < 2
  const data = showRecents ? recents.slice(0, 6) : results

  const choose = place => {
    onSelect(place)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaProvider>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.bar}>
          <View style={styles.field}>
            <Icon name="search" size={14} color={theme.dim} />
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder={t('search.placeholder')}
              placeholderTextColor={theme.dim}
              style={styles.input}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              onSubmitEditing={() => {
                if (data[0]) choose(data[0])
                else if (text.trim()) choose({ name: text.trim() })
              }}
              accessibilityLabel={t('search.aria')}
            />
            {loading ? <ActivityIndicator size="small" color={theme.dim} /> : null}
          </View>
          <IconButton name="close" onPress={onClose} accessibilityLabel={t('search.close')} />
        </View>

        <Text style={styles.group}>{showRecents ? t('search.recent') : t('search.results')}</Text>
        <FlatList
          data={data}
          keyExtractor={(item, i) => `${item.lat}-${item.lon}-${item.name}-${i}`}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {noConnection
                ? t('offline.search')
                : showRecents
                  ? t('search.short')
                  : loading
                    ? t('search.searching')
                    : t('search.empty', { query: text.trim() })}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.item} onPress={() => choose(item)} accessibilityRole="button">
              <Icon name={showRecents ? 'history' : 'pin'} size={14} color={theme.dim} />
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemRegion} numberOfLines={1}>
                {[item.region, item.country].filter(Boolean).join(', ')}
              </Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  )
}
