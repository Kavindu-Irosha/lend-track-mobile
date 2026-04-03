import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme } from '@/src/context/ThemeContext'
import { formatCurrency } from '@/src/lib/utils'
import { Calendar, User, ChevronRight } from 'lucide-react-native'
import { format } from 'date-fns'

interface LoanCardProps {
  customerName: string
  total: number
  paid: number
  remaining: number
  status: string
  dueDate: string
  onPress?: () => void
  onPay?: () => void
}

export default function LoanCard({
  customerName,
  total,
  paid,
  remaining,
  status,
  dueDate,
  onPress,
  onPay,
}: LoanCardProps) {
  const { colors } = useTheme()

  const statusColor =
    status === 'Completed'
      ? { bg: colors.statusCompletedBg, text: colors.statusCompleted }
      : status === 'Overdue'
      ? { bg: colors.statusOverdueBg, text: colors.statusOverdue }
      : { bg: colors.statusActiveBg, text: colors.statusActive }

  return (
    <TouchableOpacity
      style={[styles.card, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.topRow}>
        <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.badgeText, { color: statusColor.text }]}>{status}</Text>
        </View>
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatCurrency(total)}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <User size={14} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {customerName}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Calendar size={14} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Due: {format(new Date(dueDate), 'MMM d, yyyy')}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={[styles.smallLabel, { color: colors.textTertiary }]}>
            Paid: {formatCurrency(paid)}
          </Text>
          <Text style={[styles.remainingText, { color: colors.text }]}>
            Remaining: {formatCurrency(remaining)}
          </Text>
        </View>
        {remaining > 0 && onPay && (
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: colors.primaryBg }]}
            onPress={(e) => {
              e.stopPropagation?.()
              onPay()
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.payButtonText, { color: colors.primary }]}>Pay</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  smallLabel: {
    fontSize: 13,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  payButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
})
