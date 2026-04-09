import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Linking,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import { formatCurrency, formatAppDate } from '@/src/lib/utils'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  MessageCircle,
  CreditCard,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react-native'
import { format, differenceInDays } from 'date-fns'
import { getWhatsAppReminder } from '@/src/lib/financial'
import * as Haptics from 'expo-haptics'

export default function AlertsScreen() {
  const { colors, isDark } = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [alerts, setAlerts] = useState<any[]>([])
  const [focusKey, setFocusKey] = useState(0)

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
      setFocusKey(prev => prev + 1)
    }, [fetchAlerts])
  )

  const sendWhatsAppReminder = (
    phone: string | null,
    name: string,
    amount: number,
    dueDate: string,
    isOverdue: boolean,
    penalty: number = 0
  ) => {
    if (!phone) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const cleanPhone = phone.replace(/\D/g, '')
    const message = encodeURIComponent(
      getWhatsAppReminder(name, amount, dueDate, isOverdue, penalty)
    )
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${message}`)
  }

  // Stats
  const stats = useMemo(() => {
    const overdueCount = alerts.filter(a => a.type === 'overdue').length
    const dueToday = alerts.filter(a => a.type === 'today').length
    const totalExposure = alerts.reduce((s, a) => s + a.remaining, 0)
    return { overdueCount, dueToday, totalExposure }
  }, [alerts])

  if (loading) return <LoadingSpinner message="Loading alerts..." />

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <Animated.View key={focusKey} style={{ flex: 1 }}>

        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Risk Monitor</Text>
            <Text style={[styles.title, { color: colors.text }]}>Alert Center</Text>
          </View>
          {alerts.length > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: '#ef4444' }]}>
              <Text style={styles.alertBadgeText}>{alerts.length}</Text>
            </View>
          )}
        </Animated.View>

        {/* Summary Strip */}
        {alerts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(50).duration(400).springify()} style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: isDark ? 'rgba(239,68,68,0.2)' : '#fee2e2' }]}>
                <AlertTriangle size={14} color="#ef4444" />
              </View>
              <View>
                <Text style={[styles.summaryValue, { color: isDark ? '#fca5a5' : '#991b1b' }]}>{stats.overdueCount}</Text>
                <Text style={[styles.summaryLabel, { color: '#ef4444' }]}>Overdue</Text>
              </View>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(245,158,11,0.12)' : '#fffbeb' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: isDark ? 'rgba(245,158,11,0.2)' : '#fef3c7' }]}>
                <Clock size={14} color="#f59e0b" />
              </View>
              <View>
                <Text style={[styles.summaryValue, { color: isDark ? '#fcd34d' : '#92400e' }]}>{stats.dueToday}</Text>
                <Text style={[styles.summaryLabel, { color: '#f59e0b' }]}>Due Today</Text>
              </View>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : '#f5f3ff' }]}>
              <View style={[styles.summaryIcon, { backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe' }]}>
                <ShieldAlert size={14} color="#8b5cf6" />
              </View>
              <View>
                <Text style={[styles.summaryValue, { color: isDark ? '#c4b5fd' : '#4c1d95', fontSize: 13 }]}>{formatCurrency(stats.totalExposure)}</Text>
                <Text style={[styles.summaryLabel, { color: '#8b5cf6' }]}>At Risk</Text>
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={{ flex: 1 }}>
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
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon={CheckCircle2}
                title="All Clear"
                description="No overdue loans or pending dues. All your clients are on track."
              />
            }
            renderItem={({ item, index }) => {
              const isOverdue = item.type === 'overdue'
              const severity = isOverdue && item.days > 30 ? 'critical' : isOverdue ? 'high' : 'medium'
              const dueDateFormatted = formatAppDate(new Date(item.due_date))

              return (
                <Animated.View
                  entering={FadeInDown.delay(Math.min(index * 50, 400)).duration(350).springify()}
                >
                  <View
                    style={[
                      styles.alertCard,
                      { 
                        backgroundColor: colors.surface, 
                        borderColor: colors.cardBorder,
                        borderLeftColor: isOverdue ? '#ef4444' : '#f59e0b',
                        borderLeftWidth: 4,
                      },
                    ]}
                  >
                    {/* Top Row */}
                    <View style={styles.alertTop}>
                      <View style={[styles.alertIconCircle, { backgroundColor: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)' }]}>
                        {isOverdue ? <AlertTriangle size={20} color="#ef4444" /> : <Clock size={20} color="#f59e0b" />}
                      </View>
                      <View style={styles.alertInfo}>
                        <TouchableOpacity
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                            router.push(`/(tabs)/customers/${item.customerId}`)
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.alertName, { color: colors.text }]}>
                            {item.customerName}
                          </Text>
                        </TouchableOpacity>
                        <Text style={[styles.alertDetail, { color: colors.textTertiary }]}>
                          {isOverdue
                            ? `Overdue ${item.days}d · Due: ${formatAppDate(new Date(item.due_date))}`
                            : 'Payment due today'}
                        </Text>
                      </View>

                      {/* Severity/Urgency Tag */}
                      <View style={[
                        styles.severityTag,
                        severity === 'critical' ? { backgroundColor: 'rgba(239,68,68,0.12)' } :
                        severity === 'high' ? { backgroundColor: 'rgba(245,158,11,0.12)' } :
                        { backgroundColor: 'rgba(59,130,246,0.12)' }
                      ]}>
                        <Text style={[
                          styles.severityText,
                          severity === 'critical' ? { color: '#ef4444' } :
                          severity === 'high' ? { color: '#f59e0b' } :
                          { color: '#3b82f6' }
                        ]}>
                          {severity === 'critical' ? 'CRITICAL' : severity === 'high' ? 'OVERDUE' : 'TODAY'}
                        </Text>
                      </View>
                    </View>

                    {/* Amount */}
                    <View style={[styles.amountRow, { borderTopColor: colors.border }]}>
                      <Text style={[styles.amountLabel, { color: colors.textTertiary }]}>Outstanding</Text>
                      <Text style={[styles.amountValue, { color: isOverdue ? '#ef4444' : colors.text }]}>{formatCurrency(item.remaining)}</Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.alertActions}>
                      {item.customerPhone && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5' }]}
                          onPress={() =>
                            sendWhatsAppReminder(
                              item.customerPhone,
                              item.customerName,
                              item.remaining,
                              dueDateFormatted,
                              isOverdue,
                              item.penalty_fee || 0
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <MessageCircle size={14} color="#10b981" />
                          <Text style={[styles.actionText, { color: '#10b981' }]}>
                            WhatsApp
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: isDark ? `rgba(99,102,241,0.12)` : '#eef2ff' }]}
                        onPress={() =>
                          router.push(`/(tabs)/payments/new?loan_id=${item.id}`)
                        }
                        activeOpacity={0.7}
                      >
                        <CreditCard size={14} color={colors.primary} />
                        <Text style={[styles.actionText, { color: colors.primary }]}>
                          Collect
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Animated.View>
              )
            }}
          />
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  alertBadge: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  alertBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  // Summary
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
  summaryCard: { flex: 1, padding: 12, borderRadius: 14, gap: 8, alignItems: 'center', flexDirection: 'row' },
  summaryIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  summaryLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 1 },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },
  emptyContent: { flexGrow: 1, padding: 16 },

  alertCard: { borderRadius: 18, padding: 16, borderWidth: 1, overflow: 'hidden' },
  alertTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  alertIconCircle: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  alertInfo: { flex: 1 },
  alertName: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  alertDetail: { fontSize: 12, fontWeight: '500' },
  
  // Severity Tag
  severityTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  severityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  // Amount Row
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 14, borderTopWidth: 1 },
  amountLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  amountValue: { fontSize: 18, fontWeight: '800' },

  alertActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 },
  actionText: { fontSize: 13, fontWeight: '700' },
})
