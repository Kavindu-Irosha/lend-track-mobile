import React, { useEffect } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  interpolate,
  Extrapolate
} from 'react-native-reanimated'
import { useTheme } from '@/src/context/ThemeContext'

export default function LoadingSpinner({ message }: { message?: string }) {
  const { colors } = useTheme()
  const scale = useSharedValue(1)
  const rotation = useSharedValue(0)
  const opacity = useSharedValue(0.6)

  useEffect(() => {
    // Pulse animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    )

    // Continuous smooth rotation
    rotation.value = withRepeat(
      withTiming(360, { duration: 2000 }),
      -1,
      false
    )

    // Breathing text opacity
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    )
  }, [])

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` }
    ],
  }))

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }))

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.loaderWrapper, { backgroundColor: colors.primaryBg, borderColor: colors.cardBorder }]}>
        <Animated.Text style={[styles.emoji, animatedIconStyle]}>💰</Animated.Text>
      </View>
      {message && (
        <Animated.Text style={[styles.text, animatedTextStyle, { color: colors.primary }]}>
          {message}
        </Animated.Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loaderWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  emoji: {
    fontSize: 40,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
})
