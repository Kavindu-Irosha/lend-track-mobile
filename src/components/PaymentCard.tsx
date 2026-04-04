import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme } from '@/src/context/ThemeContext'
import { formatCurrency } from '@/src/lib/utils'
import { Calendar, User, Receipt, Trash2 } from 'lucide-react-native'
import { format } from 'date-fns'

interface PaymentCardProps {
  amount: number
  customerName: string
  paymentDate: string
  onPress?: () => void
  onDelete?: () => void
}

export default function PaymentCard({
  amount,
  customerName,
  paymentDate,
  onPress,
  onDelete,
}: PaymentCardProps) {
  const { colors } = useTheme()

  return (
    <TouchableOpacity
      style={[styles.card, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: colors.successBg }]}>
        <Receipt size={20} color={colors.success} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(amount)}
        </Text>
        <View style={styles.meta}>
          <User size={12} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {customerName}
          </Text>
        </View>
      </View>
      <View style={styles.rightContainer}>
        <View style={styles.dateContainer}>
          <Calendar size={14} color={colors.textTertiary} />
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            {format(new Date(paymentDate), 'MMM d, yyyy')}
          </Text>
        </View>
        {onDelete && (
          <TouchableOpacity 
            onPress={onDelete} 
            style={[styles.deleteBtn, { backgroundColor: colors.errorBg }]}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
