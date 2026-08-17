import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '@/src/context/AuthContext'
import { useTheme } from '@/src/context/ThemeContext'
import { useAlert } from '@/src/context/AlertContext'
import { useSecurity } from '@/src/context/SecurityContext'
import { useRouter } from 'expo-router'
import { triggerHapticImpact } from '@/src/lib/utils'
import * as Haptics from 'expo-haptics'
import { Eye, EyeOff } from 'lucide-react-native'
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated'

export default function LoginScreen() {
  const { signIn, signUp } = useAuth()
  const { colors, isDark } = useTheme()
  const { showAlert, showToast } = useAlert()
  const { isBiometricEnabled, authenticate, isAuthenticated } = useSecurity()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [hasAccountSetup, setHasAccountSetup] = useState<boolean>(false)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)

  // Track if this device has ever successfully launched an account & check lockouts
  React.useEffect(() => {
    async function checkAccountStatus() {
      const saved = await AsyncStorage.getItem('@has_account_setup')
      if (saved === 'true') {
        setHasAccountSetup(true)
      }
      
      const lockout = await AsyncStorage.getItem('@lockout_until')
      if (lockout) {
        const time = parseInt(lockout, 10)
        if (time > Date.now()) {
          setLockoutUntil(time)
        } else {
          await AsyncStorage.removeItem('@lockout_until')
          await AsyncStorage.removeItem('@failed_attempts')
        }
      }
    }
    checkAccountStatus()
  }, [])

  React.useEffect(() => {
    let interval: NodeJS.Timeout
    if (lockoutUntil) {
      interval = setInterval(() => {
        const remaining = lockoutUntil - Date.now()
        if (remaining <= 0) {
          setLockoutUntil(null)
          setTimeLeft(0)
          AsyncStorage.removeItem('@lockout_until')
          AsyncStorage.removeItem('@failed_attempts')
        } else {
          setTimeLeft(remaining)
        }
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [lockoutUntil])

  const handleSubmit = async () => {
    if (lockoutUntil && lockoutUntil > Date.now()) {
      const remainingMinutes = Math.ceil((lockoutUntil - Date.now()) / 60000)
      showAlert({
        title: 'Account Locked',
        message: `Too many failed attempts. Please try again in ${remainingMinutes} minutes.`,
        type: 'error'
      })
      return
    }

    if (!email.trim() || !password.trim()) {
      showAlert({
        title: 'Error',
        message: 'Please enter both email and password',
        type: 'error'
      })
      return
    }

    setLoading(true)
    try {
      const { error } = mode === 'signin'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password)

      if (error) {
        const isInvalidCreds = error.includes('Invalid login credentials')

        if (mode === 'signin' && isInvalidCreds) {
          const attemptsStr = await AsyncStorage.getItem('@failed_attempts')
          const attempts = attemptsStr ? parseInt(attemptsStr, 10) + 1 : 1
          
          if (attempts >= 5) {
            const unlockTime = Date.now() + 15 * 60 * 1000 // 15 mins
            await AsyncStorage.setItem('@lockout_until', unlockTime.toString())
            setLockoutUntil(unlockTime)
            showAlert({
              title: 'Account Locked',
              message: 'Too many failed attempts. Account locked for 15 minutes due to suspicious behavior.',
              type: 'error'
            })
          } else {
            await AsyncStorage.setItem('@failed_attempts', attempts.toString())
            showToast({
              message: `Invalid credentials. Attempt ${attempts} of 5.`,
              type: 'error',
              duration: 3000
            })
          }
        } else {
          const errorMessage = isInvalidCreds && !hasAccountSetup
            ? 'No user found, create an account'
            : error

          showAlert({
            title: 'Error',
            message: errorMessage,
            type: 'error'
          })
        }
      } else {
        // SUCCESS - Clear brute force trackers
        await AsyncStorage.removeItem('@failed_attempts')
        await AsyncStorage.removeItem('@lockout_until')
        
        // Mark that an account exists on this device
        await AsyncStorage.setItem('@has_account_setup', 'true')
        setHasAccountSetup(true)

        if (mode === 'signup') {
          showAlert({
            title: 'Success',
            message: 'Account created, redirecting...',
            type: 'success'
          })
          // Auto-login and redirect instead of moving to sign-in mode
          router.replace('/(tabs)/dashboard')
        } else {
          // Explicit redirect on sign in success
          router.replace('/(tabs)/dashboard')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(Math.max(0, ms) / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const isLocked = lockoutUntil && lockoutUntil > Date.now()

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Logo Section */}
        <View style={styles.logoSection}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.logoEmoji]}>💰</Text>
          </View>
          <Text style={[styles.appName, { color: colors.primary }]}>LendTrack</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
          </Text>
        </View>

        {/* Form Card */}
        {isLocked ? (
          <Animated.View entering={FadeInDown} exiting={FadeOutUp} style={[styles.lockedCard, { backgroundColor: isDark ? '#450a0a' : '#fee2e2', borderColor: isDark ? '#7f1d1d' : '#ef4444' }]}>
            <Animated.View entering={FadeInDown.delay(100).springify()} style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 48 }}>🔒</Text>
            </Animated.View>
            <Text style={[styles.lockedTitle, { color: isDark ? '#fca5a5' : '#b91c1c' }]}>Account Locked</Text>
            <Text style={[styles.lockedSub, { color: isDark ? '#f87171' : '#991b1b' }]}>For your security, please wait before trying again.</Text>
            <Text style={[styles.timerText, { color: isDark ? '#fecaca' : '#ef4444' }]}>{formatTime(timeLeft)}</Text>
          </Animated.View>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Email address</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="admin@lendtrack.com"
              placeholderTextColor={colors.textTertiary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
              />
              <TouchableOpacity
                style={styles.eyeIconContainer}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textTertiary} />
                ) : (
                  <Eye size={20} color={colors.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => {
              triggerHapticImpact()
              setMode(mode === 'signin' ? 'signup' : 'signin')
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 15,
    marginTop: 6,
  },
  card: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIconContainer: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  biometricSection: {
    alignItems: 'center',
    padding: 30,
    gap: 16,
  },
  biometricBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  biometricIcon: {
    fontSize: 48,
  },
  biometricTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  biometricDescription: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  fallbackBtn: {
    padding: 12,
  },
  fallbackText: {
    fontWeight: '600',
    fontSize: 15,
  },
  lockedCard: {
    padding: 32,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  lockedSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  }
})
