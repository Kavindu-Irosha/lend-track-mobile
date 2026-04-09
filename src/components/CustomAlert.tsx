import React, { useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native'
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  ZoomOut,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
  withDelay,
} from 'react-native-reanimated'
import { useTheme } from '@/src/context/ThemeContext'
import { useAlert } from '@/src/context/AlertContext'
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  LucideIcon,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const { width } = Dimensions.get('window')

const ALERT_CONFIG: Record<string, { 
  Icon: LucideIcon; 
  color: string; 
  bgGradient: string;
  haptic: Haptics.NotificationFeedbackType 
}> = {
  info: { Icon: Info, color: '#3b82f6', bgGradient: 'rgba(59,130,246,0.12)', haptic: Haptics.NotificationFeedbackType.Success },
  success: { Icon: CheckCircle2, color: '#10b981', bgGradient: 'rgba(16,185,129,0.12)', haptic: Haptics.NotificationFeedbackType.Success },
  warning: { Icon: ShieldAlert, color: '#f59e0b', bgGradient: 'rgba(245,158,11,0.12)', haptic: Haptics.NotificationFeedbackType.Warning },
  error: { Icon: XCircle, color: '#ef4444', bgGradient: 'rgba(239,68,68,0.12)', haptic: Haptics.NotificationFeedbackType.Error },
}

export default function CustomAlert() {
  const { colors, isDark } = useTheme()
  const { alert, visible, hideAlert } = useAlert()
  const iconScale = useSharedValue(0)

  useEffect(() => {
    if (visible && alert?.type) {
      const hapticType = ALERT_CONFIG[alert.type]?.haptic || Haptics.NotificationFeedbackType.Success
      Haptics.notificationAsync(hapticType)
      // Bounce animation for icon
      iconScale.value = withSequence(
        withSpring(1.3, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12 })
      )
    } else {
      iconScale.value = 0
    }
  }, [visible, alert?.type])

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }]
  }))

  if (!alert) return null

  const config = ALERT_CONFIG[alert.type || 'info']
  const Icon = config.Icon

  const handleButtonPress = (onPress?: () => void) => {
    hideAlert()
    if (onPress) {
      setTimeout(onPress, 150)
    }
  }

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={hideAlert}
    >
      <View style={styles.overlay}>
        <Animated.View 
          entering={FadeIn.duration(200)} 
          exiting={FadeOut.duration(150)} 
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
        >
          <Pressable style={{ flex: 1 }} onPress={hideAlert} />
        </Animated.View>

        <Animated.View
          entering={ZoomIn.duration(300).springify().damping(18).stiffness(200)}
          exiting={ZoomOut.duration(200)}
          style={[
            styles.alertCard,
            { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#e2e8f0' }
          ]}
        >
          {/* Color accent bar at top */}
          <View style={[styles.accentBar, { backgroundColor: config.color }]} />

          {/* Icon with double ring */}
          <View style={[styles.iconOuterRing, { backgroundColor: config.bgGradient }]}>
            <Animated.View style={[styles.iconInnerRing, { backgroundColor: config.color + '20' }, animatedIconStyle]}>
              <View style={[styles.iconCircle, { backgroundColor: config.color }]}>
                <Icon size={28} color="#fff" />
              </View>
            </Animated.View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{alert.title}</Text>

          {/* Message */}
          {alert.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {alert.message}
            </Text>
          )}

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {alert.buttons ? (
              alert.buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive'
                const isCancel = btn.style === 'cancel'
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      index > 0 && styles.marginLeft,
                      isDestructive ? { backgroundColor: '#ef4444' } :
                      isCancel ? { backgroundColor: isDark ? '#334155' : '#f1f5f9', borderWidth: 1, borderColor: isDark ? '#475569' : '#e2e8f0' } :
                      { backgroundColor: config.color }
                    ]}
                    onPress={() => handleButtonPress(btn.onPress)}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.buttonText,
                      isCancel ? { color: colors.textSecondary } : { color: '#fff' }
                    ]}>
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                )
              })
            ) : (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: config.color, flex: 1 }]}
                onPress={() => handleButtonPress()}
                activeOpacity={0.8}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>Got it</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  alertCard: {
    width: Math.min(width - 56, 340),
    borderRadius: 28,
    paddingTop: 0,
    paddingHorizontal: 28,
    paddingBottom: 28,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  accentBar: {
    width: '120%',
    height: 4,
    marginBottom: 24,
  },
  iconOuterRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  iconInnerRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
  },
  button: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  marginLeft: {
    marginLeft: 0,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
})
