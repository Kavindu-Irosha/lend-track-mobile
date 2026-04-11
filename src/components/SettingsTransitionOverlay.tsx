import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated'
import Animated from 'react-native-reanimated'
import { useTheme } from '@/src/context/ThemeContext'
import { useSettings } from '@/src/context/SettingsContext'
import { Settings as SettingsIcon, CheckCircle2 } from 'lucide-react-native'

export default function SettingsTransitionOverlay() {
  const { isApplying } = useSettings()
  const { colors, isDark } = useTheme()

  if (!isApplying) return null

  return (
    <Animated.View 
      entering={FadeIn.duration(300)} 
      exiting={FadeOut.duration(300)} 
      style={[
        StyleSheet.absoluteFill, 
        styles.container,
        { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }
      ]}
    >
      <Animated.View 
        entering={ZoomIn.duration(400).springify()}
        exiting={ZoomOut.duration(400)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.primaryBg }]}>
          <SettingsIcon size={32} color={colors.primary} />
          <Animated.View 
            style={[styles.checkNode, { backgroundColor: colors.success }]}
            entering={ZoomIn.delay(300)}
          >
            <CheckCircle2 size={12} color="#fff" />
          </Animated.View>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Applying Preferences</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>Optimizing your experience...</Text>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    padding: 32,
    borderRadius: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  checkNode: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  sub: {
    fontSize: 13,
    fontWeight: '500',
  },
})
