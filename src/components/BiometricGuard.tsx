import React, { useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useSecurity } from '@/src/context/SecurityContext'
import { useAuth } from '@/src/context/AuthContext'
import { useTheme } from '@/src/context/ThemeContext'
import { Fingerprint, Lock, ShieldCheck } from 'lucide-react-native'
import Animated, { 
  FadeIn, 
  ZoomIn, 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming,
  interpolate,
  withDelay,
  Easing,
} from 'react-native-reanimated'

export default function BiometricGuard() {
  const { authenticate, isAuthenticated, isBiometricEnabled, loading } = useSecurity()
  const { user } = useAuth()
  const { colors } = useTheme()
  
  // Dual-Phase Ripple Animations
  const pulse1 = useSharedValue(0)
  const pulse2 = useSharedValue(0)
  const rotation = useSharedValue(0)
  
  useEffect(() => {
    // Pulse 1: Faster, tight ripple
    pulse1.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false)
    
    // Pulse 2: Slower, delayed wide ripple
    pulse2.value = withDelay(800, withRepeat(withTiming(1, { duration: 2500, easing: Easing.out(Easing.quad) }), -1, false))
    
    // Constant slow rotation for the "scanning scope"
    rotation.value = withRepeat(withTiming(360, { duration: 15000, easing: Easing.linear }), -1, false)
  }, [])

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse1.value, [0, 1], [0.8, 1.8]) }],
    opacity: interpolate(pulse1.value, [0, 0.5, 1], [0, 0.4, 0]),
  }))

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse2.value, [0, 1], [0.8, 2.2]) }],
    opacity: interpolate(pulse2.value, [0, 0.5, 1], [0, 0.2, 0]),
  }))

  const rotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }]
  }))

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse1.value, [0, 0.5, 1], [1, 1.05, 1]) }]
  }))

  if (isAuthenticated || !isBiometricEnabled || loading || !user) return null

  return (
    <Animated.View 
      entering={FadeIn.duration(800)} 
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 9999, justifyContent: 'center', alignItems: 'center', padding: 40 }]}
    >
      <Animated.View entering={ZoomIn.duration(600).springify()} style={styles.content}>
        <View style={styles.animationMasterContainer}>
          {/* Ripple 1 */}
          <Animated.View style={[styles.ripple, { borderColor: colors.primary }, ring1Style]} />
          {/* Ripple 2 */}
          <Animated.View style={[styles.ripple, { borderColor: colors.primary }, ring2Style]} />
          
          {/* Rotating "Scope" Ring */}
          <Animated.View style={[styles.scopeRing, { borderColor: colors.primary + '30' }, rotateStyle]} />
          
          <Animated.View style={[styles.iconContainer, { backgroundColor: colors.primaryBg }, iconStyle]}>
            <View style={[styles.innerGlow, { backgroundColor: colors.primary + '10' }]} />
            <Fingerprint size={52} color={colors.primary} />
          </Animated.View>
        </View>
        
        <View style={styles.textSection}>
          <Text style={[styles.title, { color: colors.text }]}>LendTrack Guard</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Secure end-to-end encryption active.{"\n"}Please verify your identity to continue.
          </Text>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={authenticate}
          activeOpacity={0.9}
        >
          <View style={styles.buttonContent}>
            <ShieldCheck size={22} color="#fff" />
            <Text style={styles.buttonText}>Authenticate</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Lock size={14} color={colors.textTertiary} />
          <Text style={[styles.footerText, { color: colors.textTertiary }]}>
            Biometric data is processed locally
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    width: '100%',
  },
  animationMasterContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  ripple: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
  },
  scopeRing: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  iconContainer: {
    width: 110,
    height: 110,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  innerGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 35,
  },
  textSection: {
    alignItems: 'center',
    marginBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  button: {
    width: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 60,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})
