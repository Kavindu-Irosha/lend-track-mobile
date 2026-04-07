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
import * as Haptics from 'expo-haptics'

export default function LoginScreen() {
  const { signIn, signUp } = useAuth()
  const { colors, isDark } = useTheme()
  const { showAlert } = useAlert()
  const { saveCredentials, isBiometricEnabled, authenticate, isAuthenticated } = useSecurity()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [hasAccountSetup, setHasAccountSetup] = useState<boolean>(false)

  // No longer auto-triggering biometrics on app start to prioritize the login form.
  
  // Track if this device has ever successfully launched an account
  React.useEffect(() => {
    async function checkAccountStatus() {
      const saved = await AsyncStorage.getItem('@has_account_setup')
      if (saved === 'true') {
        setHasAccountSetup(true)
      }
    }
    checkAccountStatus()
  }, [])

  const handleSubmit = async () => {
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
        // IMPROVED ERROR GUIDANCE
        // Supabase returns 'Invalid login credentials' for both missing user AND wrong password.
        // We use our local flag to provide better guidance for first-time users.
        const isInvalidCreds = error.includes('Invalid login credentials')
        const errorMessage = isInvalidCreds && !hasAccountSetup
          ? 'No user found, create an account'
          : error

        showAlert({
          title: 'Error',
          message: errorMessage,
          type: 'error'
        })
      } else {
        // SUCCESS - Mark that an account exists on this device
        await AsyncStorage.setItem('@has_account_setup', 'true')
        setHasAccountSetup(true)

        if (mode === 'signup') {
          showAlert({
            title: 'Success',
            message: 'Account created, redirecting...',
            type: 'success'
          })
          // Auto-login and redirect instead of moving to sign-in mode
          await saveCredentials(email.trim(), password)
          router.replace('/(tabs)/dashboard')
        } else {
          // Explicitly save for biometrics if enabled
          await saveCredentials(email.trim(), password)
          // Explicit redirect on sign in success
          router.replace('/(tabs)/dashboard')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="••••••••"
              placeholderTextColor={colors.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
            />
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
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            activeOpacity={0.7}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
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
  }
})
