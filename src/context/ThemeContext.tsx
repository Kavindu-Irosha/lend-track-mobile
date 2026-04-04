import React, { createContext, useContext, useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from 'react-native-reanimated'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Colors, ThemeColors } from '@/src/constants/Colors'

type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
  mode: ThemeMode
  isDark: boolean
  colors: ThemeColors
  setMode: (mode: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'system',
  isDark: false,
  colors: Colors.light,
  setMode: () => {},
})

const THEME_KEY = '@lendtrack_theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme()
  const [mode, setModeState] = useState<ThemeMode>('system')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved)
      }
    })
  }, [])

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    AsyncStorage.setItem(THEME_KEY, newMode)
  }

  const isDark =
    mode === 'system' ? systemScheme === 'dark' : mode === 'dark'
  const colors = isDark ? Colors.dark : Colors.light

  const anim = useSharedValue(1)

  useEffect(() => {
    // Subtle zoom-in/out animation on theme change
    anim.value = withSequence(
      withTiming(0.98, { duration: 150 }),
      withTiming(1, { duration: 150 })
    )
  }, [isDark])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      flex: 1,
      transform: [{ scale: anim.value }],
      opacity: withTiming(anim.value, { duration: 300 })
    }
  })

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
