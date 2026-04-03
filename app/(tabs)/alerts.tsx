import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import { formatCurrency } from '@/src/lib/utils'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  MessageCircle,
  CreditCard,
} from 'lucide-react-native'
import { format, differenceInDays } from 'date-fns'

export default function AlertsScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])

  const fetchAlerts = useCallback(async () => {
    try {
      const { data: loans } = await supabase
        .from('loans')
        .select('*, customers(id, name, phone), payments(amount)')

      const todayStr = format(new Date(), 'yyyy-MM-dd')
      const todayDate = new Date(todayStr)

      const alertList = (loans || [])
        .map((loan) => {
          const loanTotal = Number(loan.amount) + Number(loan.interest)
          const paid =
            loan.payments?.reduce(
              (sum: number, p: any) => sum + Number(p.amount),
              0
            ) || 0
          const remaining = loanTotal - paid

          if (remaining <= 0) return null

          const dueStr = format(new Date(loan.due_date), 'yyyy-MM-dd')
          const dueDate = new Date(dueStr)

          if (dueDate < todayDate) {
            const daysOverdue = differenceInDays(todayDate, dueDate)
            return {
              ...loan,
              remaining,
              type: 'overdue',
              days: daysOverdue,
              customerName: loan.customers?.name || 'Unknown',
              customerPhone: loan.customers?.phone,
              customerId: loan.customers?.id,
            }
          }

          if (dueStr === todayStr) {
            return {
              ...loan,
              remaining,
              type: 'today',
              days: 0,
              customerName: loan.customers?.name || 'Unknown',
              customerPhone: loan.customers?.phone,
              customerId: loan.customers?.id,
            }
          }

          return null
        })
        .filter(Boolean) as any[]

      alertList.sort((a, b) => {
        if (a.type === 'overdue' && b.type === 'today') return -1
        if (a.type === 'today' && b.type === 'overdue') return 1
        return b.days - a.days
      })

      setAlerts(alertList)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchAlerts()
    }, [fetchAlerts])
  )

  const sendWhatsAppReminder = (
    phone: string | null,
    name: string,
    amount: number
  ) => {
    if (!phone) return
    const cleanPhone = phone.replace(/\D/g, '')
    const formattedAmount = formatCurrency(amount)
    const message = encodeURIComponent(
      `Hello ${name}, this is a gentle reminder regarding your pending loan installment of ${formattedAmount}. Please make the payment at your earliest convenience.`
    )
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`)
  }

  if (loading) return <LoadingSpinner message="Loading alerts..." />

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Active Alerts</Text>
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              fetchAlerts()
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={
          alerts.length === 0 ? styles.emptyContent : styles.listContent
        }
        ListEmptyComponent={
          <EmptyState
            icon={AlertCircle}
            title="No active alerts"
            description="Everything is on track! All active loans are currently within their payment terms."
          />
        }
        renderItem={({ item }) => {
          const isOverdue = item.type === 'overdue'
          const bgColor = isOverdue ? colors.statusOverdueBg : colors.warningBg
          const iconColor = isOverdue ? colors.statusOverdue : colors.warning
          const IconComponent = isOverdue ? AlertTriangle : Clock

          return (
            <View
              style={[
                styles.alertCard,
                { backgroundColor: bgColor, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.alertTop}>
                <View
                  style={[
                    styles.alertIconContainer,
                    {
                      backgroundColor: isOverdue
                        ? 'rgba(239,68,68,0.15)'
                        : 'rgba(245,158,11,0.15)',
                    },
                  ]}
                >
                  <IconComponent size={22} color={iconColor} />
                </View>
                <View style={styles.alertInfo}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/(tabs)/customers/${item.customerId}`)
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.alertName, { color: colors.text }]}>
                      {item.customerName}
                    </Text>
                  </TouchableOpacity>
                  <Text style={[styles.alertDetail, { color: colors.textSecondary }]}>
                    {isOverdue
                      ? `Overdue by ${item.days} days (Due: ${format(new Date(item.due_date), 'MMM d')})`
                      : 'Due today'}
                  </Text>
                  <Text style={[styles.alertAmount, { color: colors.text }]}>
                    Pending: {formatCurrency(item.remaining)}
                  </Text>
                </View>
              </View>

              <View style={styles.alertActions}>
                {item.customerPhone && (
                  <TouchableOpacity
                    style={[styles.reminderButton, { backgroundColor: colors.successBg }]}
                    onPress={() =>
                      sendWhatsAppReminder(
                        item.customerPhone,
                        item.customerName,
                        item.remaining
                      )
                    }
                    activeOpacity={0.7}
                  >
                    <MessageCircle size={14} color={colors.success} />
                    <Text style={[styles.reminderText, { color: colors.success }]}>
                      Reminder
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.paymentButton, { backgroundColor: colors.primaryBg }]}
                  onPress={() =>
                    router.push(`/(tabs)/payments/new?loan_id=${item.id}`)
                  }
                  activeOpacity={0.7}
                >
                  <CreditCard size={14} color={colors.primary} />
                  <Text style={[styles.paymentText, { color: colors.primary }]}>
                    Record Payment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  emptyContent: { flexGrow: 1, padding: 16 },
  alertCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  alertTop: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  alertIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  alertDetail: { fontSize: 12, marginBottom: 4 },
  alertAmount: { fontSize: 14, fontWeight: '600' },
  alertActions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reminderText: { fontSize: 12, fontWeight: '600' },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  paymentText: { fontSize: 12, fontWeight: '600' },
})
