import React, { useCallback, useEffect, useState } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import * as SplashScreen from 'expo-splash-screen'
import * as NavigationBar from 'expo-navigation-bar'
import { Platform } from 'react-native'
import { AuthProvider, useAuth } from '@/src/context/AuthContext'
import { ThemeProvider, useTheme } from '@/src/context/ThemeContext'
import AnimatedSplash from '@/src/components/AnimatedSplash'

// Keep the native splash visible while we load resources
SplashScreen.preventAutoHideAsync()

function RootLayoutNav() {
  const { user, loading: authLoading } = useAuth()
  const { colors, isDark } = useTheme()
  const segments = useSegments()
  const router = useRouter()
  const [showSplash, setShowSplash] = useState(true)
  const [appReady, setAppReady] = useState(false)

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

  // Sync Navigation Bar on Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(colors.background)
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark')
    }
  }, [colors.background, isDark])

  // Handle navigation after splash finishes
  useEffect(() => {
    if (!appReady || showSplash) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)/dashboard')
    }
  }, [user, appReady, showSplash, segments])

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false)
  }, [])

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      {showSplash && <AnimatedSplash onFinish={handleSplashFinish} />}
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  )
}
