import React, { useEffect } from 'react'
import { StyleSheet, Text, View, Platform } from 'react-native'
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming,
  FadeInDown,
  FadeOutDown
} from 'react-native-reanimated'
import { useAlert } from '@/src/context/AlertContext'
import { useTheme } from '@/src/context/ThemeContext'
import { Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react-native'

export default function Toast() {
  const { toast } = useAlert()
  const { colors } = useTheme()

  if (!toast) return null

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle2 size={18} color={colors.success} />
      case 'warning': return <AlertTriangle size={18} color={colors.statusOverdue} />
      case 'error': return <XCircle size={18} color={colors.error} />
      default: return <Info size={18} color={colors.primary} />
    }
  }

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View 
        entering={FadeInDown.springify().damping(15)} 
        exiting={FadeOutDown}
        style={[
          styles.toast, 
          { 
            backgroundColor: colors.surface, 
            borderColor: colors.cardBorder,
            shadowColor: '#000',
          }
        ]}
      >
        <View style={styles.iconArea}>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: '80%',
    maxWidth: '90%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    gap: 10,
  },
  iconArea: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
})
