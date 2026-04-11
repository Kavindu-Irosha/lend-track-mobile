import React, { useEffect } from 'react'
import { APP_VERSION } from '../constants/version'
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  useColorScheme,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  FadeOut,
  SharedValue,
} from 'react-native-reanimated'
import { isPerformanceMode } from '../lib/utils'

const { width: SCREEN_WIDTH } = Dimensions.get('window')

interface SplashScreenProps {
  onFinish: () => void
}

export default function AnimatedSplash({ onFinish }: SplashScreenProps) {
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  // Animation values
  const logoScale = useSharedValue(0)
  const logoRotate = useSharedValue(0)
  const titleOpacity = useSharedValue(0)
  const titleTranslateY = useSharedValue(20)
  const subtitleOpacity = useSharedValue(0)
  const subtitleTranslateY = useSharedValue(15)
  const shimmerPosition = useSharedValue(-1)
  const dot1 = useSharedValue(0)
  const dot2 = useSharedValue(0)
  const dot3 = useSharedValue(0)
  const glowScale = useSharedValue(0.8)
  const containerOpacity = useSharedValue(1)

  const colors = {
    bg: isDark ? '#09090b' : '#f9fafb',
    primary: isDark ? '#818cf8' : '#6366f1',
    primaryLight: isDark ? '#a5b4fc' : '#818cf8',
    primaryBg: isDark ? 'rgba(99,102,241,0.15)' : '#eef2ff',
    glowColor: isDark ? 'rgba(129,140,248,0.25)' : 'rgba(99,102,241,0.12)',
    text: isDark ? '#fafafa' : '#111827',
    textSecondary: isDark ? '#a1a1aa' : '#6b7280',
    dotColor: isDark ? '#818cf8' : '#6366f1',
    dotBg: isDark ? 'rgba(129,140,248,0.2)' : 'rgba(99,102,241,0.1)',
    shimmerColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.7)',
  }

  useEffect(() => {
    // 1. Logo bounces in with slight rotation
    if (isPerformanceMode()) {
      logoScale.value = withTiming(1, { duration: 300 })
      logoRotate.value = 0
    } else {
      logoScale.value = withSequence(
        withTiming(1.15, { duration: 500, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) })
      )
      logoRotate.value = withSequence(
        withTiming(-8, { duration: 250, easing: Easing.out(Easing.quad) }),
        withTiming(6, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) })
      )
    }

    // 2. Title fades in and slides up
    titleOpacity.value = withDelay(isPerformanceMode() ? 100 : 400, withTiming(1, { duration: 500 }))
    titleTranslateY.value = withDelay(isPerformanceMode() ? 100 : 400, withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }))

    // 3. Subtitle fades in
    subtitleOpacity.value = withDelay(isPerformanceMode() ? 200 : 700, withTiming(1, { duration: 400 }))
    subtitleTranslateY.value = withDelay(isPerformanceMode() ? 200 : 700, withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) }))

    // 4. Shimmer sweep across the title
    if (!isPerformanceMode()) {
      shimmerPosition.value = withDelay(
        900,
        withRepeat(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          -1,
          false
        )
      )
    }

    // 5. Loading dots bounce
    dot1.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    )
    dot2.value = withDelay(
      950,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    )
    dot3.value = withDelay(
      1100,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      )
    )

    // 6. Glow pulse behind logo
    glowScale.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    )

    // 7. Auto-finish after 2.5 seconds (Faster in performance mode)
    const timeout = setTimeout(() => {
      onFinish()
    }, isPerformanceMode() ? 1200 : 2500)

    return () => clearTimeout(timeout)
  }, [])

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
  }))

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: interpolate(glowScale.value, [0.8, 1.3], [0.4, 0.8]),
  }))

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }))

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }))

  const makeDotStyle = (dotValue: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ translateY: interpolate(dotValue.value, [0, 1], [0, -10]) }],
      opacity: interpolate(dotValue.value, [0, 1], [0.3, 1]),
    }))

  const dot1Style = makeDotStyle(dot1)
  const dot2Style = makeDotStyle(dot2)
  const dot3Style = makeDotStyle(dot3)

  return (
    <Animated.View
      style={[styles.container, { backgroundColor: colors.bg }]}
      exiting={FadeOut.duration(400)}
    >
      {/* Background decorative circles */}
      <View style={[styles.bgCircle1, { backgroundColor: colors.glowColor }]} />
      <View style={[styles.bgCircle2, { backgroundColor: colors.glowColor }]} />

      {/* Center content */}
      <View style={styles.centerContent}>
        {/* Glow behind logo */}
        <Animated.View style={[styles.glow, { backgroundColor: colors.glowColor }, glowStyle]} />

        {/* Logo */}
        <Animated.View style={[styles.logoContainer, { backgroundColor: colors.primaryBg }, logoStyle]}>
          <Text style={styles.logoEmoji}>💰</Text>
        </Animated.View>

        {/* Title */}
        <Animated.View style={titleStyle}>
          <Text style={[styles.title, { color: colors.text }]}>
            Lend<Text style={{ color: colors.primary }}>Track</Text>
          </Text>
        </Animated.View>

        {/* Subtitle */}
        <Animated.View style={subtitleStyle}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Smart Loan Management
          </Text>
        </Animated.View>

        {/* Loading dots */}
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, { backgroundColor: colors.dotColor }, dot1Style]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.dotColor }, dot2Style]} />
          <Animated.View style={[styles.dot, { backgroundColor: colors.dotColor }, dot3Style]} />
        </View>
      </View>

      {/* Bottom version text */}
      <Animated.View style={[styles.bottomSection, subtitleStyle]}>
        <Text style={[styles.versionText, { color: colors.textSecondary }]}>
          Version {APP_VERSION}
        </Text>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -80,
    right: -80,
    opacity: 0.5,
  },
  bgCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: -40,
    left: -60,
    opacity: 0.4,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    top: -25,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  logoEmoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 40,
    height: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  bottomSection: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '400',
  },
})
