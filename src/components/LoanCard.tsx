import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useTheme } from '@/src/context/ThemeContext'
import { formatCurrency, formatAppDate } from '@/src/lib/utils'
import { useSettings } from '@/src/context/SettingsContext'
import { Calendar, User, ChevronRight, Trash2 } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

interface LoanCardProps {
  customerName: string
  total: number
  paid: number
  remaining: number
  status: string
  dueDate: string
  onPress?: () => void
  onPay?: () => void
  onDelete?: () => void
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
  onDelete,
}: LoanCardProps) {
  const { colors, isDark } = useTheme()
  const { settings } = useSettings()
  const compact = settings.compactMode

  const progress = Math.min(paid / total, 1)
  const isOverdue = status === 'Overdue'
  const isCompleted = status === 'Completed'

  const statusColor =
    isCompleted
      ? { bg: colors.successBg, text: colors.success }
      : isOverdue
      ? { bg: colors.errorBg, text: colors.error }
      : { bg: colors.primaryBg, text: colors.primary }

  return (
    <TouchableOpacity
      style={[
        styles.card, 
        { 
          backgroundColor: colors.surface, 
          borderColor: isOverdue ? colors.error : colors.cardBorder,
          borderWidth: 1,
          padding: compact ? 12 : 16,
          marginBottom: compact ? 10 : 16,
          borderRadius: compact ? 16 : 24,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: compact ? 0 : 0.03,
          shadowRadius: 12,
          elevation: compact ? 0 : 2,
        }
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
            {customerName}
          </Text>
          <View style={styles.headerRight}>
            {onDelete && (
              <TouchableOpacity 
                onPress={(e) => {
                  e.stopPropagation()
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                  onDelete()
                }}
                style={[styles.deleteButton, { backgroundColor: colors.errorBg }]}
              >
                <Trash2 size={16} color={colors.error} />
              </TouchableOpacity>
            )}
            <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
              <Text style={[styles.badgeText, { color: statusColor.text }]}>{status}</Text>
            </View>
          </View>
        </View>
        <Text style={[styles.totalAmount, { color: colors.textSecondary }]}>
          Total: <Text style={{ color: colors.text, fontWeight: '800' }}>{formatCurrency(total)}</Text>
        </Text>
      </View>

      {!compact && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>Repayment Progress</Text>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressBarFill, 
                { 
                  backgroundColor: isCompleted ? colors.success : colors.primary, 
                  width: `${progress * 100}%` 
                }
              ]} 
            />
          </View>
        </View>
      )}

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Current Balance</Text>
          <Text style={[styles.detailValue, { color: remaining > 0 ? colors.text : colors.success }]}>
            {formatCurrency(remaining)}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={[styles.detailLabel, { color: colors.textTertiary }]}>Next Due</Text>
          <View style={styles.dateRow}>
            <Calendar size={12} color={isOverdue ? colors.error : colors.textSecondary} />
            <Text style={[styles.detailValue, { color: isOverdue ? colors.error : colors.textSecondary, fontSize: 13 }]}>
              {formatAppDate(new Date(dueDate))}
            </Text>
          </View>
        </View>
      </View>

      {!isCompleted && onPay && (
        <TouchableOpacity
          style={[styles.payButton, { backgroundColor: colors.primary }]}
          onPress={(e) => {
            e.stopPropagation?.()
            onPay?.()
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.payButtonText}>Record Payment</Text>
          <ChevronRight size={16} color="#fff" />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  totalAmount: {
    fontSize: 13,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
