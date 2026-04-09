import React, { useEffect } from 'react'
import { StyleSheet, Text, View, Platform } from 'react-native'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  SlideInDown,
  SlideOutDown,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated'
import { useAlert } from '@/src/context/AlertContext'
import { useTheme } from '@/src/context/ThemeContext'
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react-native'

const TOAST_COLORS: Record<string, { color: string; bg: (dark: boolean) => string }> = {
  success: { color: '#10b981', bg: (d) => d ? 'rgba(16,185,129,0.15)' : '#ecfdf5' },
  warning: { color: '#f59e0b', bg: (d) => d ? 'rgba(245,158,11,0.15)' : '#fffbeb' },
  error:   { color: '#ef4444', bg: (d) => d ? 'rgba(239,68,68,0.15)' : '#fef2f2' },
  info:    { color: '#3b82f6', bg: (d) => d ? 'rgba(59,130,246,0.15)' : '#eff6ff' },
}

export default function Toast() {
  const { toast } = useAlert()
  const { colors, isDark } = useTheme()

  if (!toast) return null

  const config = TOAST_COLORS[toast.type || 'info'] || TOAST_COLORS.info

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle2 size={18} color={config.color} />
      case 'warning': return <AlertTriangle size={18} color={config.color} />
      case 'error': return <XCircle size={18} color={config.color} />
      default: return <Info size={18} color={config.color} />
    }
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View 
        entering={SlideInDown.springify().damping(18).stiffness(200)} 
        exiting={SlideOutDown.duration(200)}
        style={[
          styles.toast, 
          { 
            backgroundColor: isDark ? '#1e293b' : '#fff',
            borderColor: isDark ? '#334155' : '#e2e8f0',
            shadowColor: '#000',
          }
        ]}
      >
        {/* Color accent line on the left */}
        <View style={[styles.accentLine, { backgroundColor: config.color }]} />
        
        <View style={[styles.iconArea, { backgroundColor: config.bg(isDark) }]}>
          {getIcon()}
        </View>
        <Text style={[styles.message, { color: colors.text }]}>
          {toast.message}
        </Text>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    zIndex: 10000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 20,
    paddingVertical: 14,
    paddingLeft: 4,
    borderRadius: 18,
    borderWidth: 1,
    minWidth: '80%',
    maxWidth: '90%',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    gap: 12,
    overflow: 'hidden',
  },
  accentLine: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  iconArea: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
})
