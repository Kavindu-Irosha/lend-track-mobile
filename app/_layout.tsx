import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as NavigationBar from 'expo-navigation-bar'
import { Platform, View, AppState, type AppStateStatus } from 'react-native'
import { AuthProvider, useAuth } from '@/src/context/AuthContext'
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext'
import { SettingsProvider, useSettings } from '@/src/context/SettingsContext'
import { AlertProvider } from '@/src/context/AlertContext'
import { SecurityProvider, useSecurity } from '@/src/context/SecurityContext'
import CustomAlert from '@/src/components/CustomAlert'
import AnimatedSplash from '@/src/components/AnimatedSplash'
import BiometricGuard from '@/src/components/BiometricGuard'
import Toast from '@/src/components/Toast'
import ErrorBoundary from '@/src/components/ErrorBoundary'
import { DashboardProvider } from '@/src/context/DashboardContext'
import SettingsTransitionOverlay from '@/src/components/SettingsTransitionOverlay'
import { isPerformanceMode } from '@/src/lib/utils'

// Keep the native splash visible while we load resources
SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth()
  const { isAuthenticated, isBiometricEnabled, authenticate, loading: securityLoading } = useSecurity()
  const { colors, isDark } = useTheme()
  const segments = useSegments()
  const router = useRouter()
  const { settings } = useSettings()
  const [showSplash, setShowSplash] = useState(true)
  const [appReady, setAppReady] = useState(false)
  const isAuthenticating = React.useRef(false)
  const [canPromptBio, setCanPromptBio] = useState(false)

  // ---- Auto-Lock Timer ----
  const backgroundTimestamp = useRef<number>(0)
  const lastActivityRef = useRef<number>(Date.now())
  const autoLockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Track background/foreground
  useEffect(() => {
    const timerMinutes = settings.autoLockTimer
    if (timerMinutes === 'off' || !isBiometricEnabled || !user) return

    const timeoutMs = parseInt(timerMinutes) * 60 * 1000

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        backgroundTimestamp.current = Date.now()
      } else if (nextState === 'active' && backgroundTimestamp.current > 0) {
        const elapsed = Date.now() - backgroundTimestamp.current
        backgroundTimestamp.current = 0
        if (elapsed >= timeoutMs) {
          // Lock the app — require re-auth
          authenticate()
        }
      }
    }

    const sub = AppState.addEventListener('change', handleAppState)
    return () => sub.remove()
  }, [settings.autoLockTimer, isBiometricEnabled, user])

  // Delay biometric prompt slightly after start to allow native bridge to settle
  useEffect(() => {
    if (appReady && !showSplash) {
      const timer = setTimeout(() => {
        setCanPromptBio(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [appReady, showSplash])

  // Hide the native splash once our custom splash is showing
  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  // Wait for auth to resolve, then mark app ready
  useEffect(() => {
    if (!authLoading) {
      setAppReady(true)
    }
  }, [authLoading])

  // Sync Navigation Bar on Android (Dynamic Icons based on Theme only)
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark')
    }
  }, [isDark])

  // Handle navigation after splash finishes
  useEffect(() => {
    // Definitive Gate: Wait for splash to finish AND for biometric state to be fully loaded
    if (!appReady || showSplash || securityLoading) return

    // If biometrics are enabled, we only prompt for them if a user is actually logged in.
    // This allows the user to see the standard login form if they are logged out.
    if (user && isBiometricEnabled && !isAuthenticated) {
      // Added safety delay: only initiate if the startup cooldown has passed.
      if (!isAuthenticating.current && canPromptBio) {
        isAuthenticating.current = true
        authenticate().finally(() => {
          isAuthenticating.current = false
        })
      }
      return
    }

    // If the session is still restoring in the background, wait to avoid flickering.
    if (authLoading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!user && !inAuthGroup) {
      // User is not logged in, redirect to login screen
      router.replace('/(auth)/login')
    } else if (user && inAuthGroup) {
      // User is logged in, but on the auth screen, redirect to dashboard
      router.replace('/(tabs)/dashboard')
    }
  }, [user, appReady, showSplash, segments])

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false)
  }, [])

  const showRouter = !user || !isBiometricEnabled || isAuthenticated

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {showRouter ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: isPerformanceMode() ? 'fade' : 'slide_from_right',
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      )}
      {showSplash && <AnimatedSplash onFinish={handleSplashFinish} />}
      <BiometricGuard />
      <CustomAlert />
      <Toast />
      <SettingsTransitionOverlay />
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AlertProvider>
          <SecurityProvider>
            <AuthProvider>
              <DashboardProvider>
                <ErrorBoundary>
                  <RootLayoutNav />
                </ErrorBoundary>
              </DashboardProvider>
            </AuthProvider>
          </SecurityProvider>
        </AlertProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
