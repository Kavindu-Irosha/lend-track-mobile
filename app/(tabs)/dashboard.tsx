import React, { useCallback, useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
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
  CheckCircle2,
  Calendar as CalendarIcon
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
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
  const [chartData, setChartData] = useState<{ labels: string[]; inData: number[]; outData: number[] }>({ 
    labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'], 
    inData: [0, 0, 0, 0, 0, 0, 0],
    outData: [0, 0, 0, 0, 0, 0, 0]
  })
  const [isChartEmpty, setIsChartEmpty] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '1m' | '3m' | '6m'>('1m')
  const [selectedPoint, setSelectedPoint] = useState<{ label: string; in: number; out: number } | null>(null)
  const [chartLoading, setChartLoading] = useState(false)

  const fetchChartData = useCallback(async (range: '7d' | '1m' | '3m' | '6m', isSilent = false) => {
    if (!isSilent) setChartLoading(true)
    try {
      const rangeDays = range === '7d' ? 7 : range === '1m' ? 30 : range === '3m' ? 90 : 180
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - (rangeDays - 1))
      const startDateStr = startDate.toISOString().split('T')[0]

      const [paymentsRes, loansRes] = await Promise.all([
        supabase.from('payments').select('amount, payment_date').gte('payment_date', startDateStr),
        supabase.from('loans').select('amount, start_date').gte('start_date', startDateStr)
      ])

      const inMap: Record<string, number> = {}
      const outMap: Record<string, number> = {}

      for (let i = rangeDays - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const formattedDate = format(d, rangeDays <= 30 ? 'MMM dd' : 'MM/dd')
        inMap[formattedDate] = 0
        outMap[formattedDate] = 0
      }

      if (paymentsRes.data) {
        paymentsRes.data.forEach((p) => {
          const d = new Date(p.payment_date)
          const label = format(d, rangeDays <= 30 ? 'MMM dd' : 'MM/dd')
          if (inMap[label] !== undefined) inMap[label] += Number(p.amount)
        })
      }

      if (loansRes.data) {
        loansRes.data.forEach((l) => {
          const d = new Date(l.start_date)
          const label = format(d, rangeDays <= 30 ? 'MMM dd' : 'MM/dd')
          if (outMap[label] !== undefined) outMap[label] += Number(l.amount)
        })
      }

      const allLabels = Object.keys(inMap)
      const inValues = Object.values(inMap)
      const outValues = Object.values(outMap)
      const hasAnyData = inValues.some(v => v > 0) || outValues.some(v => v > 0)
      
      const labelStep = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 5 : rangeDays <= 90 ? 15 : 30
      const displayLabels = allLabels.map((l, i) => (i % labelStep === 0 ? l : ''))

      if (hasAnyData) {
        setChartData({ labels: displayLabels, inData: inValues, outData: outValues })
        setIsChartEmpty(false)
      } else {
        setChartData({ 
          labels: displayLabels, 
          inData: inValues.length > 0 ? inValues : [0, 0, 0, 0, 0, 0, 0],
          outData: outValues.length > 0 ? outValues : [0, 0, 0, 0, 0, 0, 0]
        })
        setIsChartEmpty(true)
      }
    } catch (err) {
      console.error('Chart fetch error:', err)
    } finally {
      if (!isSilent) setChartLoading(false)
    }
  }, [])

  const fetchData = useCallback(async (isInitial = true) => {
    if (isInitial) setLoading(true)
    try {
      // Fetch core dependencies in parallel
      const [loansResponse, paymentsResponse, customersResponse] = await Promise.all([
        supabase.from('loans').select('*, payments(amount), customers(id, name)'),
        supabase.from('payments').select('*, loans(id, customers(id, name))').order('payment_date', { ascending: false }).order('created_at', { ascending: false }).limit(5),
        supabase.from('customers').select('*', { count: 'exact', head: true })
      ])

      const loans = loansResponse.data
      const payments = paymentsResponse.data
      const customerCount = customersResponse.count || 0

      // Calculate chart data silently (part of full fetch)
      fetchChartData(timeRange, true)

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
      setCustomerCount(customerCount)
    } catch (err) {
      console.error('Dashboard fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [fetchChartData])

  useFocusEffect(
    useCallback(() => {
      let isMounted = true
      if (isMounted) {
        fetchData(true)
        setFocusKey(prev => prev + 1)
      }
      return () => { isMounted = false }
    }, [fetchData])
  )

  // Sub-effect: Only update chart when timeRange changes
  useEffect(() => {
    fetchChartData(timeRange)
  }, [timeRange, fetchChartData])

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
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              router.push('/(tabs)/settings')
            }}
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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
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
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
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

        {/* Stats Section Redesign */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.statsSection}>
          <StatsCard 
            variant="featured"
            icon={CreditCard} 
            label="Total Investment" 
            value={formatCurrency(stats.principalDisbursed)} 
            description={`Expected Profit: ${formatCurrency(stats.expectedProfit)}`}
            containerStyle={{ marginBottom: 12 }}
          />
          <View style={styles.statsGridRow}>
            <StatsCard 
              icon={Receipt} 
              label="Collected" 
              value={formatCurrency(stats.totalCollected)} 
              color={colors.success}
              containerStyle={{ flex: 1 }}
            />
            <StatsCard 
              icon={AlertCircle} 
              label={stats.totalCredits > 0 ? "Pending" : "Outstanding"}
              value={formatCurrency(stats.totalPending)} 
              color={colors.warning}
              containerStyle={{ flex: 1 }}
            />
          </View>
          {stats.totalCredits > 0 && (
            <StatsCard 
              icon={CheckCircle2} 
              label="Customer Credits" 
              value={formatCurrency(stats.totalCredits)} 
              color={colors.primary}
              containerStyle={{ marginTop: 12 }}
            />
          )}
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(400).springify()}
          style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <View style={styles.sectionHeader}>
             <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Cash Flow Analysis
              </Text>
              {selectedPoint ? (
                <View style={styles.watcherRow}>
                  <Text style={[styles.pointWatcherValue, { color: colors.primary }]}>
                    In: <Text style={{ color: colors.text }}>{formatCurrency(selectedPoint.in)}</Text>
                  </Text>
                  <View style={[styles.vertDivider, { backgroundColor: colors.cardBorder }]} />
                  <Text style={[styles.pointWatcherValue, { color: '#ef4444' }]}>
                    Out: <Text style={{ color: colors.text }}>{formatCurrency(selectedPoint.out)}</Text>
                  </Text>
                </View>
              ) : (
                <Text style={styles.watcherSub}>Returns (In) vs Investments (Out)</Text>
              )}
             </View>
             {isChartEmpty && (
               <View style={[styles.emptyBadge, { backgroundColor: colors.primaryBg }]}>
                 <Text style={[styles.emptyBadgeText, { color: colors.primary }]}>Live Tracking</Text>
               </View>
             )}
          </View>

          {/* Time Range Selector & Legend */}
          <View style={styles.topFilterBar}>
            <View style={styles.rangeSelector}>
              {[
                { id: '7d', label: '7D' },
                { id: '1m', label: '1M' },
                { id: '3m', label: '3M' },
                { id: '6m', label: '6M' }
              ].map((range) => (
                <TouchableOpacity
                  key={range.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setTimeRange(range.id as any)
                  }}
                  style={[
                    styles.rangeBtn,
                    timeRange === range.id && { backgroundColor: colors.primary }
                  ]}
                >
                  <Text style={[
                    styles.rangeBtnText,
                    { color: timeRange === range.id ? '#fff' : colors.textTertiary }
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.legendText, { color: colors.textTertiary }]}>Returns</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={[styles.legendText, { color: colors.textTertiary }]}>Investments</Text>
              </View>
            </View>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartWrapper}
            scrollEventThrottle={16}
          >
            <View style={[styles.chartContainer, chartLoading && { opacity: 0.5 }]}>
              {isChartEmpty && !chartLoading && (
                <View style={[styles.chartOverlay, { width: screenWidth - 64 }]}>
                  <CalendarIcon size={32} color={colors.textTertiary} style={{ opacity: 0.2 }} />
                  <Text style={[styles.chartOverlayText, { color: colors.textTertiary }]}>No movement found</Text>
                </View>
              )}
              {chartLoading && (
                <View style={[styles.chartOverlay, { width: screenWidth - 64, backgroundColor: 'transparent' }]}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [
                    { 
                      data: isChartEmpty ? [10, 25, 45, 30, 55, 40, 60] : chartData.inData,
                      color: (opacity = 1) => `#10b981`, // Green for Money In
                      strokeWidth: 2
                    },
                    { 
                      data: isChartEmpty ? [60, 40, 55, 30, 45, 25, 10] : chartData.outData,
                      color: (opacity = 1) => `#ef4444`, // Red for Money Out
                      strokeWidth: 2
                    }
                  ],
                }}
                width={Math.max(screenWidth - 64, chartData.inData.length * (timeRange === '7d' ? 45 : 35))}
                height={180}
                withInnerLines={false}
                withOuterLines={false}
                withDots={!isChartEmpty}
                chartConfig={{
                  backgroundColor: 'transparent',
                  backgroundGradientFrom: colors.surface,
                  backgroundGradientTo: colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => colors.primary,
                  labelColor: () => colors.textTertiary,
                  propsForLabels: {
                    fontSize: 10,
                  },
                  fillShadowGradientFrom: colors.primary,
                  fillShadowGradientTo: 'transparent',
                  fillShadowGradientFromOpacity: isChartEmpty ? 0.02 : 0.1,
                  fillShadowGradientToOpacity: 0,
                  propsForDots: {
                    r: "4",
                    strokeWidth: "0",
                  }
                }}
                bezier
                onDataPointClick={({ value, index }) => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setSelectedPoint({
                    label: Object.keys(chartData.labels).length > 0 ? chartData.labels[index] || "Date" : "Date",
                    in: chartData.inData[index] || 0,
                    out: chartData.outData[index] || 0
                  })
                }}
                style={styles.chart}
              />
            </View>
          </ScrollView>
          <Text style={[styles.panHint, { color: colors.textTertiary }]}>
            {timeRange !== '7d' ? "← Swipe left/right to move →" : "Watch your daily collection trends"}
          </Text>
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
                onPress={() => router.push(`/(tabs)/customers/${loan.customerId}?name=${encodeURIComponent(loan.customerName)}`)}
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
  statsSection: { marginBottom: 20 },
  statsGridRow: { flexDirection: 'row', gap: 12 },
  section: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  viewAll: { fontSize: 13, fontWeight: '600' },
  chartContainer: { position: 'relative' },
  chartOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 1,
    gap: 8,
  },
  chartOverlayText: { fontSize: 12, fontWeight: '600', opacity: 0.6 },
  chart: { marginTop: 4, borderRadius: 12, marginLeft: -16 },
  listItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  listItemContent: { flex: 1 },
  listItemName: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  listItemMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listItemDate: { fontSize: 12 },
  amountBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  amountBadgeText: { fontSize: 12, fontWeight: '600' },
  pendingAmount: { fontSize: 13, fontWeight: '500' },
  emptyContainer: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  emptyBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  emptyBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  rangeSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rangeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f610' },
  rangeBtnText: { fontSize: 12, fontWeight: '700' },
  chartWrapper: { paddingLeft: 8 },
  panHint: { fontSize: 10, textAlign: 'center', marginTop: 8, fontWeight: '600', opacity: 0.5 },
  pointWatcherValue: { fontSize: 13, fontWeight: '700' },
  watcherRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  watcherSub: { fontSize: 13, color: '#9ca3af', marginTop: 2, fontWeight: '500' },
  vertDivider: { width: 1, height: 12 },
  topFilterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  chartLegend: { flexDirection: 'row', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, fontWeight: '600' },
})
