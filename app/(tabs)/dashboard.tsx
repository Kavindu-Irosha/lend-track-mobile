import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { supabase } from '@/src/lib/supabase'
import { formatCurrency } from '@/src/lib/utils'
import StatsCard from '@/src/components/StatsCard'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import { useAlert } from '@/src/context/AlertContext'
import { 
  CreditCard, 
  Receipt, 
  AlertCircle, 
  Calendar, 
  Settings, 
  ChevronRight, 
  Calculator,
  CheckCircle2
} from 'lucide-react-native'
import { format } from 'date-fns'
import { LineChart } from 'react-native-chart-kit'

const screenWidth = Dimensions.get('window').width

export default function DashboardScreen() {
  const { colors, isDark } = useTheme()
  const { user, signOut } = useAuth()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [focusKey, setFocusKey] = useState(0)
  const [stats, setStats] = useState({ 
    totalGiven: 0, 
    totalCollected: 0, 
    totalPending: 0, 
    principalDisbursed: 0, 
    expectedProfit: 0,
    totalCredits: 0
  })
  const [customerCount, setCustomerCount] = useState(0)
  const [activeLoanCount, setActiveLoanCount] = useState(0)
  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [topPending, setTopPending] = useState<any[]>([])
  const [chartData, setChartData] = useState<{ labels: string[]; data: number[] }>({ 
    labels: ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Day 30'], 
    data: [0, 0, 0, 0, 0, 0, 0] 
  })
  const [isChartEmpty, setIsChartEmpty] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      // Fetch loans with payments and customers
      const { data: loans } = await supabase
        .from('loans')
        .select('*, payments(amount), customers(id, name)')

      // Fetch recent payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*, loans(id, customers(id, name))')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch chart data (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

      const { data: chartPayments } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .gte('payment_date', thirtyDaysAgoStr)

      // Build chart data (show 7 markers for mobile readability)
      const last30DaysMap: Record<string, number> = {}
      for (let i = 29; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const formattedDate = format(d, 'MMM dd')
        last30DaysMap[formattedDate] = 0
      }

      if (chartPayments) {
        chartPayments.forEach((p) => {
          const d = new Date(p.payment_date)
          const label = format(d, 'MMM dd')
          if (last30DaysMap[label] !== undefined) {
            last30DaysMap[label] += Number(p.amount)
          }
        })
      }

      const allLabels = Object.keys(last30DaysMap)
      const allData = Object.values(last30DaysMap)
      const hasAnyData = allData.some(v => v > 0)
      
      // Show every 7th label for mobile
      const displayLabels = allLabels.map((l, i) => (i % 7 === 0 ? l : ''))

      if (hasAnyData) {
        setChartData({ labels: displayLabels, data: allData })
        setIsChartEmpty(false)
      } else {
        // Keep dummy labels but 0 data
        setChartData({ labels: displayLabels, data: allData.length > 0 ? allData : [0, 0, 0, 0, 0, 0, 0] })
        setIsChartEmpty(true)
      }

      // Calculate stats
      let totalGiven = 0
      let totalCollected = 0
      let totalPending = 0
      let principalDisbursed = 0
      let expectedProfit = 0
      const pendingList: any[] = []

      let totalCredits = 0
      ;(loans || []).forEach((loan) => {
        principalDisbursed += Number(loan.amount)
        expectedProfit += Number(loan.interest)
        
        const loanTotal = Number(loan.amount) + Number(loan.interest)
        totalGiven += loanTotal
        const paidForLoan = loan.payments?.reduce(
          (sum: number, p: any) => sum + Number(p.amount), 0
        ) || 0
        totalCollected += paidForLoan
        const remaining = loanTotal - paidForLoan
        
        if (remaining > 0) {
          totalPending += remaining
          pendingList.push({
            ...loan,
            remaining,
            customerName: loan.customers?.name || 'Unknown',
            customerId: loan.customers?.id,
          })
        } else if (remaining < 0) {
          totalCredits += Math.abs(remaining)
        }
      })

      pendingList.sort((a, b) => b.remaining - a.remaining)

      setStats({ 
        totalGiven, 
        totalCollected, 
        totalPending, 
        principalDisbursed, 
        expectedProfit,
        totalCredits 
      })
      setRecentPayments(payments || [])
      setTopPending(pendingList.slice(0, 5))
      setActiveLoanCount(pendingList.length)

      // Fetch customer count
      const { count } = await supabase.from('customers').select('*', { count: 'exact', head: true })
      setCustomerCount(count || 0)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchData()
      setFocusKey(prev => prev + 1)
    }, [fetchData])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchData()
  }

  if (loading) return <LoadingSpinner message="Loading dashboard..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View key={focusKey} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back</Text>
            <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => router.push('/(tabs)/settings')}
            activeOpacity={0.7}
          >
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (customerCount === 0) {
                showAlert({
                  title: 'No Customers',
                  message: 'Please add a customer first before issuing a loan.',
                  type: 'warning'
                })
              } else {
                router.push('/(tabs)/loans/new')
              }
            }}
            activeOpacity={0.8}
          >
            <CreditCard size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Issue Loan</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
            onPress={() => {
              if (activeLoanCount === 0) {
                showAlert({
                  title: 'No Active Loans',
                  message: 'You need at least one active loan to record a payment.',
                  type: 'warning'
                })
              } else {
                router.push('/(tabs)/payments/new')
              }
            }}
            activeOpacity={0.8}
          >
            <Receipt size={18} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Add Payment</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <StatsCard 
              icon={CreditCard} 
              label="Investment" 
              value={formatCurrency(stats.principalDisbursed)} 
              containerStyle={{ flex: 1 }}
            />
            <StatsCard 
              icon={Calculator} 
              label="Expected Profit" 
              value={formatCurrency(stats.expectedProfit)} 
              color={colors.primary}
              containerStyle={{ flex: 1 }}
            />
          </View>
          <StatsCard icon={Receipt} label="Total Collected" value={formatCurrency(stats.totalCollected)} color={colors.success} />
          {stats.totalCredits > 0 ? (
            <View style={styles.statsRow}>
              <View style={{ flex: 1 }}>
                <StatsCard icon={AlertCircle} label="Outstanding" value={formatCurrency(stats.totalPending)} color={colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <StatsCard icon={CheckCircle2} label="Customer Credits" value={formatCurrency(stats.totalCredits)} color={colors.primary} />
              </View>
            </View>
          ) : (
            <StatsCard icon={AlertCircle} label="Total Outstanding" value={formatCurrency(stats.totalPending)} color={colors.warning} />
          )}
        </Animated.View>

        {/* Chart */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(400).springify()}
          style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <View style={styles.sectionHeader}>
             <Text style={[styles.sectionTitle, { color: colors.text }]}>
               Collections (Last 30 Days)
             </Text>
             {isChartEmpty && (
               <View style={[styles.emptyBadge, { backgroundColor: colors.warningBg }]}>
                 <Text style={[styles.emptyBadgeText, { color: colors.warning }]}>Waiting for data</Text>
               </View>
             )}
          </View>
          {chartData.data.length > 0 && (
            <LineChart
              data={{
                labels: chartData.labels,
                datasets: [{ data: chartData.data }],
              }}
              width={screenWidth - 64}
              height={200}
              withInnerLines={false}
              withOuterLines={false}
              withDots={false}
              chartConfig={{
                backgroundColor: 'transparent',
                backgroundGradientFrom: colors.surface,
                backgroundGradientTo: colors.surface,
                decimalPlaces: 0,
                color: () => isChartEmpty ? colors.textTertiary : colors.primary,
                labelColor: () => colors.textTertiary,
                propsForLabels: {
                  fontSize: 10,
                },
                fillShadowGradientFrom: isChartEmpty ? colors.textTertiary : colors.primary,
                fillShadowGradientTo: 'transparent',
                fillShadowGradientFromOpacity: 0.1,
                fillShadowGradientToOpacity: 0,
              }}
              bezier
              style={styles.chart}
            />
          )}
        </Animated.View>

        {/* Recent Payments */}
        <Animated.View 
          entering={FadeInDown.delay(400).duration(400).springify()}
          style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Payments</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/payments')}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View all</Text>
            </TouchableOpacity>
          </View>
          {recentPayments.length === 0 ? (
            <View style={styles.emptyContainer}>
               <Text style={[styles.emptyText, { color: colors.textTertiary }]}>🎉 You're all caught up!</Text>
               <Text style={styles.emptySub}>No payments recorded yet.</Text>
            </View>
          ) : (
            recentPayments.map((payment) => (
              <View key={payment.id} style={[styles.listItem, { borderBottomColor: colors.border }]}>
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemName, { color: colors.primary }]}>
                    {payment.loans?.customers?.name || 'Unknown'}
                  </Text>
                  <View style={styles.listItemMeta}>
                    <Calendar size={13} color={colors.textTertiary} />
                    <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>
                      {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
                <View style={[styles.amountBadge, { backgroundColor: colors.successBg }]}>
                  <Text style={[styles.amountBadgeText, { color: colors.success }]}>
                    + {formatCurrency(payment.amount)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Animated.View>

        {/* Top Pending */}
        <Animated.View 
          entering={FadeInDown.delay(500).duration(400).springify()}
          style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder, marginBottom: 24 }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Pending Loans</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/loans')}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View active</Text>
            </TouchableOpacity>
          </View>
          {topPending.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No pending loans.</Text>
          ) : (
            topPending.map((loan) => (
              <TouchableOpacity
                key={loan.id}
                style={[styles.listItem, { borderBottomColor: colors.border }]}
                onPress={() => router.push(`/(tabs)/customers/${loan.customerId}`)}
                activeOpacity={0.7}
              >
                <View style={styles.listItemContent}>
                  <Text style={[styles.listItemName, { color: colors.text }]}>{loan.customerName}</Text>
                  <View style={styles.listItemMeta}>
                    <Calendar size={13} color={colors.textTertiary} />
                    <Text style={[styles.listItemDate, { color: colors.textSecondary }]}>
                      Due: {format(new Date(loan.due_date), 'MMM d, yyyy')}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.pendingAmount, { color: colors.textSecondary }]}>
                  {formatCurrency(loan.remaining)} left
                </Text>
              </TouchableOpacity>
            ))
          )}
        </Animated.View>
      </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 14, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  settingsButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  quickActions: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, gap: 8 },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsGrid: { gap: 12, marginBottom: 20 },
  statsRow: { flexDirection: 'row', gap: 12 },
  section: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAll: { fontSize: 13, fontWeight: '600' },
  chart: { marginTop: 8, borderRadius: 12, marginLeft: -16 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  listItemContent: { flex: 1 },
  listItemName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  listItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listItemDate: { fontSize: 12 },
  amountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  amountBadgeText: { fontSize: 12, fontWeight: '600' },
  pendingAmount: { fontSize: 13, fontWeight: '500' },
  emptyContainer: { paddingVertical: 24, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  emptySub: { fontSize: 12, color: '#9ca3af' },
  emptyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  emptyBadgeText: { fontSize: 10, fontWeight: '700' },
})
