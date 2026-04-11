import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme } from '@/src/context/ThemeContext'
import { formatCurrency, formatAppDate, triggerHapticImpact, isPerformanceMode } from '@/src/lib/utils'
import { useSettings } from '@/src/context/SettingsContext'
import { Calendar, User, Receipt, Trash2 } from 'lucide-react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'

interface PaymentCardProps {
  amount: number
  customerName: string
  paymentDate: string
  index?: number
  onPress?: () => void
  onDelete?: () => void
}

export default function PaymentCard({
  amount,
  customerName,
  paymentDate,
  index = 0,
  onPress,
  onDelete,
}: PaymentCardProps) {
  const { colors } = useTheme()
  const { settings } = useSettings()
  const compact = settings.compactMode

  return (
    <Animated.View
      entering={isPerformanceMode() ? FadeInDown.delay(index * 20) : FadeInDown.delay(index * 30).duration(300).springify()}
    >
      <TouchableOpacity
        style={[styles.card, { borderBottomColor: colors.border, paddingVertical: compact ? 10 : 14 }]}
        onPress={() => {
          if (onPress) {
            triggerHapticImpact()
            onPress()
          }
        }}
        activeOpacity={0.7}
        disabled={!onPress}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.successBg, width: compact ? 36 : 44, height: compact ? 36 : 44, borderRadius: compact ? 18 : 22 }]}>
          <Receipt size={compact ? 16 : 20} color={colors.success} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.amount, { color: colors.text, fontSize: compact ? 13 : 15 }]}>
            {formatCurrency(amount)}
          </Text>
          <View style={styles.meta}>
            <User size={compact ? 10 : 12} color={colors.textTertiary} />
            <Text style={[styles.metaText, { color: colors.textSecondary, fontSize: compact ? 10 : 12 }]}>
              {customerName}
            </Text>
          </View>
        </View>
        <View style={styles.rightContainer}>
          <View style={styles.dateContainer}>
            <Calendar size={compact ? 12 : 14} color={colors.textTertiary} />
            <Text style={[styles.dateText, { color: colors.textSecondary, fontSize: compact ? 11 : 13 }]}>
              {formatAppDate(new Date(paymentDate))}
            </Text>
          </View>
          {onDelete && (
            <TouchableOpacity 
              onPress={(e) => {
                e.stopPropagation()
                triggerHapticImpact()
                onDelete()
              }} 
              style={[styles.deleteBtn, { backgroundColor: colors.errorBg }]}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  rightContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 13,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
