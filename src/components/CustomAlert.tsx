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
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated'
import { useTheme } from '@/src/context/ThemeContext'
import { useAlert } from '@/src/context/AlertContext'
import {
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LucideIcon,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const { width } = Dimensions.get('window')

const ALERT_ICONS: Record<string, { Icon: LucideIcon; color: string; haptic: Haptics.NotificationFeedbackType }> = {
  info: { Icon: Info, color: '#3b82f6', haptic: Haptics.NotificationFeedbackType.Success },
  success: { Icon: CheckCircle2, color: '#22c55e', haptic: Haptics.NotificationFeedbackType.Success },
  warning: { Icon: AlertTriangle, color: '#f59e0b', haptic: Haptics.NotificationFeedbackType.Warning },
  error: { Icon: XCircle, color: '#ef4444', haptic: Haptics.NotificationFeedbackType.Error },
}

export default function CustomAlert() {
  const { colors, isDark } = useTheme()
  const { alert, visible, hideAlert } = useAlert()

  useEffect(() => {
    if (visible && alert?.type) {
      const hapticType = ALERT_ICONS[alert.type]?.haptic || Haptics.NotificationFeedbackType.Success
      Haptics.notificationAsync(hapticType)
    }
  }, [visible, alert?.type])

  if (!alert) return null

  const typeData = ALERT_ICONS[alert.type || 'info']
  const Icon = typeData.Icon

  const handleButtonPress = (onPress?: () => void) => {
    hideAlert()
    if (onPress) {
      setTimeout(onPress, 150) // Slight delay to let modal close
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
          entering={FadeIn} 
          exiting={FadeOut} 
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
        >
          <Pressable style={{ flex: 1 }} onPress={hideAlert} />
        </Animated.View>

        <Animated.View
          entering={SlideInUp.springify().damping(20).stiffness(150)}
          exiting={SlideOutDown}
          style={[
            styles.alertCard,
            { backgroundColor: colors.surface, borderColor: colors.cardBorder }
          ]}
        >
          <View style={[styles.iconWrapper, { backgroundColor: typeData.color + '15' }]}>
            <Icon size={32} color={typeData.color} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{alert.title}</Text>
          {alert.message && (
            <Text style={[styles.message, { color: colors.textSecondary }]}>
              {alert.message}
            </Text>
          )}

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
                      isDestructive ? { backgroundColor: colors.error } :
                      isCancel ? { backgroundColor: colors.border } :
                      { backgroundColor: colors.primary }
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
                style={[styles.button, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={() => handleButtonPress()}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>OK</Text>
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
    padding: 24,
  },
  alertCard: {
    width: Math.min(width - 48, 340),
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marginLeft: {
    marginLeft: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
})
