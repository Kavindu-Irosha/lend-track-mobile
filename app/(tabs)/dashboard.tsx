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
import { formatCurrency, formatAppDate } from '@/src/lib/utils'
import { useSettings } from '@/src/context/SettingsContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
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
  Calendar as CalendarIcon,
  Users,
  UserPlus,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  TrendingUpDown,
  CircleDollarSign,
  Briefcase
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { format } from 'date-fns'
import { LineChart } from 'react-native-chart-kit'

const screenWidth = Dimensions.get('window').width

export default function DashboardScreen() {
  const { colors, isDark } = useTheme()
  const { user, signOut } = useAuth()
  const { showAlert, showToast } = useAlert()
  const { settings } = useSettings()
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
  const [completedLoanCount, setCompletedLoanCount] = useState(0)
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
      let completedCountTracker = 0

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
        } else {
          completedCountTracker++
          if (remaining < 0) {
            totalCredits += Math.abs(remaining)
          }
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
      setCompletedLoanCount(completedCountTracker)
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

  // ---- Daily Morning Digest ----
  useEffect(() => {
    if (!settings.dailySummary || loading) return

    const checkAndShowDigest = async () => {
      const today = new Date().toISOString().split('T')[0]
      const lastShown = await AsyncStorage.getItem('@lendtrack_digest_last')
      if (lastShown === today) return

      // Count today's due collections
      const todayStr = today
      const { data: dueLoans } = await supabase
        .from('loans')
        .select('id, due_date, amount, interest, payments(amount)')

      let dueTodayCount = 0
      let overdueCount = 0
      let totalDueAmount = 0

      ;(dueLoans || []).forEach((loan: any) => {
        const loanTotal = Number(loan.amount) + Number(loan.interest)
        const paid = loan.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0
        const remaining = loanTotal - paid
        if (remaining <= 0) return

        const dueDate = loan.due_date?.split('T')[0]
        if (dueDate === todayStr) {
          dueTodayCount++
          totalDueAmount += remaining
        } else if (dueDate && dueDate < todayStr) {
          overdueCount++
        }
      })

      if (dueTodayCount > 0 || overdueCount > 0) {
        const parts: string[] = []
        if (dueTodayCount > 0) parts.push(`${dueTodayCount} collection${dueTodayCount > 1 ? 's' : ''} due today (${formatCurrency(totalDueAmount)})`)
        if (overdueCount > 0) parts.push(`${overdueCount} overdue loan${overdueCount > 1 ? 's' : ''}`)
        showToast({ message: parts.join(' · '), type: dueTodayCount > 0 ? 'info' : 'warning' })
      } else {
        showToast({ message: 'No collections due today ✓', type: 'success' })
      }

      await AsyncStorage.setItem('@lendtrack_digest_last', today)
    }

    // Small delay so it doesn't fire before data loads
    const timer = setTimeout(checkAndShowDigest, 1500)
    return () => clearTimeout(timer)
  }, [settings.dailySummary, loading])

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

        {/* Elite Hero Portfolio Card */}
        <Animated.View entering={FadeInDown.delay(50).duration(500).springify()} style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroGlow} />
          <Text style={styles.heroLabel}>Total Portfolio Disbursed</Text>
          <Text style={styles.heroBalance} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(stats.principalDisbursed)}</Text>
          
          <View style={styles.heroSubRow}>
            <View style={styles.heroSubBlock}>
              <View style={styles.heroSubIcon}><TrendingUp size={14} color="#fff" /></View>
              <View>
                <Text style={styles.heroSubLabel}>Collected Capital</Text>
                <Text style={styles.heroSubValue}>{formatCurrency(stats.totalCollected)}</Text>
              </View>
            </View>
            <View style={styles.heroSubDivider} />
            <View style={styles.heroSubBlock}>
              <View style={styles.heroSubIcon}><CircleDollarSign size={14} color="#fff" /></View>
              <View>
                <Text style={styles.heroSubLabel}>Expected Profit</Text>
                <Text style={styles.heroSubValue}>{formatCurrency(stats.expectedProfit)}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Floating Quick Action Grid */}
        <Animated.View entering={FadeInDown.delay(100).duration(500).springify()} style={styles.actionGrid}>
          <TouchableOpacity 
            style={[styles.actionPillar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} 
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              router.push('/(tabs)/customers/new')
            }}
          >
            <View style={[styles.actionPillarIcon, { backgroundColor: `${colors.primary}15` }]}>
              <UserPlus size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionPillarText, { color: colors.text }]}>New Client</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionPillar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} 
            activeOpacity={0.8}
             onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              if (customerCount === 0) showAlert({title: 'No Customers', message: 'Please add a customer first.', type: 'warning'})
              else router.push('/(tabs)/loans/new')
            }}
          >
            <View style={[styles.actionPillarIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Briefcase size={22} color="#3b82f6" />
            </View>
            <Text style={[styles.actionPillarText, { color: colors.text }]}>Issue Loan</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionPillar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} 
            activeOpacity={0.8}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              if (activeLoanCount === 0) showAlert({title: 'No Active Loans', message: 'You need an active loan to record payment.', type: 'warning'})
              else router.push('/(tabs)/payments/new')
            }}
          >
            <View style={[styles.actionPillarIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Receipt size={22} color="#10b981" />
            </View>
            <Text style={[styles.actionPillarText, { color: colors.text }]}>Payment</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Pulse Alert for Red-Zone Overdue */}
        <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
          {stats.totalPending > 0 ? (
            <TouchableOpacity style={styles.pulseCard} activeOpacity={0.9} onPress={() => router.push('/(tabs)/loans')}>
              <View style={styles.pulseLeft}>
                <View style={styles.pulseIconBg}>
                  <AlertCircle size={20} color="#fff" />
                </View>
                <View>
                  <Text style={styles.pulseTitle}>Attention Required</Text>
                  <Text style={styles.pulseSub}>You have {formatCurrency(stats.totalPending)} pending collection</Text>
                </View>
              </View>
              <ArrowRight size={20} color="#fff" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          ) : (
            stats.totalCredits > 0 && (
              <TouchableOpacity style={[styles.pulseCard, { backgroundColor: colors.primary }]} activeOpacity={0.9} onPress={() => router.push('/(tabs)/loans')}>
                <View style={styles.pulseLeft}>
                  <View style={[styles.pulseIconBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                    <CheckCircle2 size={20} color="#fff" />
                  </View>
                  <View>
                    <Text style={styles.pulseTitle}>Customer Credits Available</Text>
                    <Text style={styles.pulseSub}>You have {formatCurrency(stats.totalCredits)} in unclaimed credits</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )
          )}
        </Animated.View>

        {/* Horizontal Market Analytics Row */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.analyticsScroll}>
            <View style={[styles.analyticPill, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }]}>
              <Users size={16} color="#3b82f6" />
              <Text style={[styles.analyticNum, { color: isDark ? '#fff' : '#1e3a8a' }]}>{customerCount}</Text>
              <Text style={[styles.analyticLabel, { color: '#3b82f6' }]}>Clients</Text>
            </View>
            <View style={[styles.analyticPill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb' }]}>
              <TrendingUpDown size={16} color="#f59e0b" />
              <Text style={[styles.analyticNum, { color: isDark ? '#fff' : '#78350f' }]}>{activeLoanCount}</Text>
              <Text style={[styles.analyticLabel, { color: '#f59e0b' }]}>Active</Text>
            </View>
            <View style={[styles.analyticPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' }]}>
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={[styles.analyticNum, { color: isDark ? '#fff' : '#064e3b' }]}>{completedLoanCount}</Text>
              <Text style={[styles.analyticLabel, { color: '#10b981' }]}>Settled</Text>
            </View>
          </ScrollView>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(400).springify()}
          style={[styles.section, { backgroundColor: '#0f172a', borderColor: '#1e293b' }]}
        >
          <View style={styles.sectionHeader}>
             <View>
              <Text style={[styles.sectionTitle, { color: '#f8fafc' }]}>
                Cash Flow Analysis
              </Text>
              {selectedPoint ? (
                <View style={styles.watcherRow}>
                  <Text style={[styles.pointWatcherValue, { color: '#10b981' }]}>
                    In: <Text style={{ color: '#fff' }}>{formatCurrency(selectedPoint.in)}</Text>
                  </Text>
                  <View style={[styles.vertDivider, { backgroundColor: '#334155' }]} />
                  <Text style={[styles.pointWatcherValue, { color: '#ef4444' }]}>
                    Out: <Text style={{ color: '#fff' }}>{formatCurrency(selectedPoint.out)}</Text>
                  </Text>
                </View>
              ) : (
                <Text style={[styles.watcherSub, { color: '#94a3b8' }]}>Returns (In) vs Investments (Out)</Text>
              )}
             </View>
             {isChartEmpty && (
               <View style={[styles.emptyBadge, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
                 <Text style={[styles.emptyBadgeText, { color: '#60a5fa' }]}>LIVE TRACKING</Text>
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
                    timeRange === range.id 
                       ? { backgroundColor: '#3b82f6' } 
                       : { backgroundColor: 'rgba(255,255,255,0.05)' }
                  ]}
                >
                  <Text style={[
                    styles.rangeBtnText,
                    { color: timeRange === range.id ? '#fff' : '#64748b' }
                  ]}>
                    {range.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                <Text style={[styles.legendText, { color: '#94a3b8' }]}>Returns</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                <Text style={[styles.legendText, { color: '#94a3b8' }]}>Investments</Text>
              </View>
            </View>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chartWrapper}
            scrollEventThrottle={16}
          >
            <View style={[styles.chartContainer, chartLoading && { opacity: 0.4 }]}>
              {isChartEmpty && !chartLoading && (
                <View style={[styles.chartOverlay, { width: screenWidth - 64 }]}>
                  <CalendarIcon size={32} color="#475569" style={{ opacity: 0.3 }} />
                  <Text style={[styles.chartOverlayText, { color: '#475569' }]}>No movement found</Text>
                </View>
              )}
              {chartLoading && (
                <View style={[styles.chartOverlay, { width: screenWidth - 64, backgroundColor: 'transparent' }]}>
                  <ActivityIndicator color="#3b82f6" />
                </View>
              )}
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [
                    { 
                      data: isChartEmpty ? [10, 25, 45, 30, 55, 40, 60] : chartData.inData,
                      color: (opacity = 1) => `rgba(16, 185, 129, ${isChartEmpty ? 0.3 : 1})`, // Neon Green
                      strokeWidth: 4
                    },
                    { 
                      data: isChartEmpty ? [60, 40, 55, 30, 45, 25, 10] : chartData.outData,
                      color: (opacity = 1) => `rgba(239, 68, 68, ${isChartEmpty ? 0.3 : 1})`, // Neon Red
                      strokeWidth: 4
                    }
                  ],
                }}
                width={Math.max(screenWidth - 64, chartData.inData.length * (timeRange === '7d' ? 45 : 35))}
                height={200}
                withInnerLines={true}
                withOuterLines={false}
                withDots={!isChartEmpty}
                chartConfig={{
                  backgroundColor: '#0f172a',
                  backgroundGradientFrom: '#0f172a',
                  backgroundGradientTo: '#0f172a',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(255, 255, 255, ${opacity * 0.05})`, // Very subtle grid lines
                  labelColor: () => '#475569',
                  propsForLabels: {
                    fontSize: 10,
                    fontWeight: '600'
                  },
                  fillShadowGradientFromOpacity: 0, // Disabled messy uniform fill shadow
                  fillShadowGradientToOpacity: 0,
                  propsForDots: {
                    r: "5",
                    strokeWidth: "2",
                    stroke: "#0f172a" // Creates a beautiful ring effect around dots
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
          <Text style={[styles.panHint, { color: '#475569' }]}>
            {timeRange !== '7d' ? "← Swipe left/right to move →" : "Watch your daily collection trends"}
          </Text>
        </Animated.View>

        {/* Timeline: Recent Payments */}
        <Animated.View 
          entering={FadeInDown.delay(300).duration(400).springify()}
          style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
        >
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
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
            <View style={styles.timelineContainer}>
              {recentPayments.map((payment, index) => (
                <View key={payment.id} style={styles.timelineItem}>
                  {/* Vertical Track Line */}
                  {index !== recentPayments.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />
                  )}
                  {/* Timeline Avatar Node */}
                  <View style={[styles.timelineDot, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>
                      {(payment.loans?.customers?.name || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  
                  {/* Content Payload */}
                  <View style={styles.timelineContent}>
                    <View style={styles.timelineRow}>
                      <Text style={[styles.timelineName, { color: colors.text }]}>
                        {payment.loans?.customers?.name || 'Unknown'}
                      </Text>
                      <Text style={[styles.timelineAmount, { color: '#10b981' }]}>
                        +{formatCurrency(payment.amount)}
                      </Text>
                    </View>
                    <Text style={[styles.timelineDate, { color: colors.textSecondary }]}>
                      {formatAppDate(new Date(payment.payment_date), true)} • Repayment
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Urgent Pending Loans Slider */}
        <Animated.View entering={FadeInDown.delay(400).duration(400).springify()} style={{ marginBottom: 24 }}>
          <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Action Required</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/loans')}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View active</Text>
            </TouchableOpacity>
          </View>
          
          {topPending.length === 0 ? (
            <View style={[styles.emptyContainer, { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder }]}>
               <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No urgent pending loans found.</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}>
              {topPending.map((loan) => (
                <TouchableOpacity
                  key={loan.id}
                  style={[styles.urgentCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                  onPress={() => router.push(`/(tabs)/customers/${loan.customerId}?name=${encodeURIComponent(loan.customerName)}`)}
                  activeOpacity={0.9}
                >
                  <View style={styles.urgentHeader}>
                    <View style={[styles.urgentAvatar, { backgroundColor: `${colors.primary}15` }]}>
                      <Text style={[styles.urgentAvatarText, { color: colors.primary }]}>
                        {loan.customerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.urgentBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                      <AlertCircle size={10} color="#ef4444" />
                      <Text style={styles.urgentBadgeText}>Due</Text>
                    </View>
                  </View>
                  <View style={styles.urgentContent}>
                    <Text style={[styles.urgentName, { color: colors.textSecondary }]} numberOfLines={1}>{loan.customerName}</Text>
                    <Text style={[styles.urgentAmount, { color: colors.text }]}>{formatCurrency(loan.remaining)}</Text>
                  </View>
                  
                  <View style={[styles.urgentFooter, { borderTopColor: colors.border }]}>
                    <Calendar size={12} color={colors.textTertiary} />
                    <Text style={[styles.urgentDate, { color: colors.textSecondary }]}>
                      {formatAppDate(new Date(loan.due_date))}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
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

  // Hero Card Styles
  heroCard: { width: '100%', borderRadius: 24, padding: 24, marginTop: 4, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, overflow: 'hidden' },
  heroGlow: { position: 'absolute', top: -40, right: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: '#ffffff', opacity: 0.1 },
  heroLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 1 },
  heroBalance: { fontSize: 38, fontWeight: '800', color: '#fff', marginTop: 8, marginBottom: 24, letterSpacing: -1 },
  heroSubRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroSubBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroSubIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroSubLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  heroSubValue: { fontSize: 14, fontWeight: '700', color: '#fff', marginTop: 2 },
  heroSubDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: 16 },

  // Action Grid
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: -20, marginBottom: 16, paddingHorizontal: 10, zIndex: 10 },
  actionPillar: { flex: 1, backgroundColor: '#fff', paddingVertical: 14, borderRadius: 16, alignItems: 'center', borderWidth: 1, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6 },
  actionPillarIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionPillarText: { fontSize: 13, fontWeight: '700' },

  // Pulse Alert
  pulseCard: { backgroundColor: '#ef4444', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  pulseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pulseIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.15)', alignItems: 'center', justifyContent: 'center' },
  pulseTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  pulseSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '500', marginTop: 2 },

  // Analytics Horizontal Scroll
  analyticsScroll: { paddingBottom: 16, gap: 12 },
  analyticPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  analyticNum: { fontSize: 16, fontWeight: '800' },
  analyticLabel: { fontSize: 13, fontWeight: '600' },

  // Timeline UI
  timelineContainer: { marginTop: 4 },
  timelineItem: { flexDirection: 'row', paddingVertical: 12, position: 'relative' },
  timelineLine: { position: 'absolute', left: 20, top: 40, bottom: -10, width: 2, zIndex: 1 },
  timelineDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', zIndex: 2, marginRight: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  timelineContent: { flex: 1, justifyContent: 'center' },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  timelineName: { fontSize: 14, fontWeight: '700' },
  timelineAmount: { fontSize: 14, fontWeight: '800' },
  timelineDate: { fontSize: 12, fontWeight: '500' },

  // Urgent Pending Cards
  urgentCard: { width: 220, padding: 16, borderRadius: 20, borderWidth: 1, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  urgentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  urgentAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  urgentAvatarText: { fontSize: 15, fontWeight: '800' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  urgentBadgeText: { fontSize: 10, fontWeight: '800', color: '#ef4444', textTransform: 'uppercase' },
  urgentContent: { marginBottom: 16 },
  urgentName: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  urgentAmount: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  urgentFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1 },
  urgentDate: { fontSize: 12, fontWeight: '600' },

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
