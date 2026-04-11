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
import { formatCurrency, formatAppDate, triggerHapticNotification, triggerHapticImpact, isPerformanceMode, ImpactStyle } from '@/src/lib/utils'
import { useSettings } from '@/src/context/SettingsContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import StatsCard from '@/src/components/StatsCard'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import { useDashboard } from '@/src/context/DashboardContext'
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
import { format } from 'date-fns'
import { LineChart } from 'react-native-chart-kit'

const screenWidth = Dimensions.get('window').width

export default function DashboardScreen() {
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const { showToast, showAlert } = useAlert()
  const { settings } = useSettings()
  const router = useRouter()
  
  const { 
    stats, recentPayments, topPending, chartData: contextChartData, 
    isChartEmpty, loading, refreshing, fetchDashboardData 
  } = useDashboard()

  const [focusKey, setFocusKey] = useState(0)
  const [timeRange, setTimeRange] = useState<'7d' | '1m' | '3m' | '6m'>('1m')
  const [selectedPoint, setSelectedPoint] = useState<{ label: string; in: number; out: number } | null>(null)
  const [chartLoading, setChartLoading] = useState(false)

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(false) // Use cache if available
      setFocusKey(prev => prev + 1)
    }, [fetchDashboardData])
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

  const onRefresh = () => {
    triggerHapticNotification()
    fetchDashboardData(true)
  }

  if (loading) return <LoadingSpinner message="Loading dashboard..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View key={focusKey} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, settings.compactMode && { padding: 12 }]}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              tintColor={colors.primary} 
              title="Syncing LendTrack..."
              titleColor={colors.primary}
              colors={[colors.primary]}
              progressBackgroundColor={colors.surface}
            />
          }
          showsVerticalScrollIndicator={false}
        >
        {/* Header */}
        <Animated.View 
          entering={isPerformanceMode() ? FadeInDown : FadeInDown.duration(400).springify()} 
          style={styles.header}
        >
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Welcome back</Text>
            <Text style={[styles.title, { color: colors.text }]}>Dashboard</Text>
            <View style={styles.syncRow}>
              <View style={[styles.syncDot, { backgroundColor: '#10b981' }]} />
              <Text style={[styles.pullHint, { color: colors.textTertiary }]}>Swipe down to sync data</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.settingsButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => {
              triggerHapticImpact()
              router.navigate('/(tabs)/settings')
            }}
            activeOpacity={0.7}
          >
            <Settings size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </Animated.View>

        {/* Elite Hero Portfolio Card */}
        <Animated.View 
          entering={isPerformanceMode() ? FadeInDown : FadeInDown.delay(50).duration(500).springify()} 
          style={[
            styles.heroCard, 
            { backgroundColor: colors.primary },
            settings.compactMode && { padding: 16, marginTop: 0, borderRadius: 16 }
          ]}
        >
          <View style={styles.heroGlow} />
          <Text style={[styles.heroLabel, settings.compactMode && { fontSize: 11 }]}>Total Portfolio Disbursed</Text>
          <Text 
            style={[styles.heroBalance, settings.compactMode && { fontSize: 30, marginBottom: 16 }]} 
            adjustsFontSizeToFit 
            numberOfLines={1}
          >
            {formatCurrency(stats.principalDisbursed)}
          </Text>
          
          <View style={styles.heroSubRow}>
            <View style={styles.heroSubBlock}>
              <View style={[styles.heroSubIcon, settings.compactMode && { width: 24, height: 24 }]}><TrendingUp size={settings.compactMode ? 12 : 14} color="#fff" /></View>
              <View>
                <Text style={[styles.heroSubLabel, settings.compactMode && { fontSize: 9 }]}>Collected</Text>
                <Text style={[styles.heroSubValue, settings.compactMode && { fontSize: 13 }]}>{formatCurrency(stats.totalCollected)}</Text>
              </View>
            </View>
            <View style={[styles.heroSubDivider, settings.compactMode && { height: 20, marginHorizontal: 8 }]} />
            <View style={styles.heroSubBlock}>
              <View style={[styles.heroSubIcon, settings.compactMode && { width: 24, height: 24 }]}><CircleDollarSign size={settings.compactMode ? 12 : 14} color="#fff" /></View>
              <View>
                <Text style={[styles.heroSubLabel, settings.compactMode && { fontSize: 9 }]}>Profit</Text>
                <Text style={[styles.heroSubValue, settings.compactMode && { fontSize: 13 }]}>{formatCurrency(stats.expectedProfit)}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Floating Quick Action Grid */}
        <Animated.View 
          entering={isPerformanceMode() ? FadeInDown : FadeInDown.delay(100).duration(500).springify()} 
          style={[styles.actionGrid, settings.compactMode && { marginTop: -14, marginBottom: 10 }]}
        >
          <TouchableOpacity 
            style={[styles.actionPillar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }, settings.compactMode && { paddingVertical: 10 }]} 
            activeOpacity={0.8}
            onPress={() => {
              triggerHapticImpact(ImpactStyle.Medium)
              router.push('/(tabs)/customers/new')
            }}
          >
            <View style={[styles.actionPillarIcon, { backgroundColor: `${colors.primary}15` }, settings.compactMode && { width: 36, height: 36, marginBottom: 4 }]}>
              <UserPlus size={settings.compactMode ? 18 : 22} color={colors.primary} />
            </View>
            <Text style={[styles.actionPillarText, { color: colors.text }]}>Client</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionPillar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }, settings.compactMode && { paddingVertical: 10 }]} 
            activeOpacity={0.8}
            onPress={() => {
              triggerHapticImpact(ImpactStyle.Medium)
              if (stats.customerCount === 0) showAlert({title: 'No Customers', message: 'Please add a customer first.', type: 'warning'})
              else router.push('/(tabs)/loans/new')
            }}
          >
            <View style={[styles.actionPillarIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }, settings.compactMode && { width: 36, height: 36, marginBottom: 4 }]}>
              <Briefcase size={settings.compactMode ? 18 : 22} color="#3b82f6" />
            </View>
            <Text style={[styles.actionPillarText, { color: colors.text }]}>Loan</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionPillar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }, settings.compactMode && { paddingVertical: 10 }]} 
            activeOpacity={0.8}
            onPress={() => {
              triggerHapticImpact(ImpactStyle.Medium)
              if (stats.activeLoanCount === 0) showAlert({title: 'No Active Loans', message: 'You need an active loan to record payment.', type: 'warning'})
              else router.push('/(tabs)/payments/new')
            }}
          >
            <View style={[styles.actionPillarIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }, settings.compactMode && { width: 36, height: 36, marginBottom: 4 }]}>
              <Receipt size={settings.compactMode ? 18 : 22} color="#10b981" />
            </View>
            <Text style={[styles.actionPillarText, { color: colors.text }]}>Pay</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Pulse Alert for Red-Zone Overdue */}
        <Animated.View entering={isPerformanceMode() ? FadeInDown : FadeInDown.delay(150).duration(400).springify()}>
          {stats.totalPending > 0 ? (
            <TouchableOpacity 
              style={[
                styles.pulseCard, 
                settings.compactMode && { padding: 12, marginBottom: 12 }
              ]} 
              activeOpacity={0.9} 
              onPress={() => router.push('/(tabs)/loans')}
            >
              <View style={styles.pulseLeft}>
                <View style={[styles.pulseIconBg, settings.compactMode && { width: 32, height: 32 }]}>
                  <AlertCircle size={settings.compactMode ? 16 : 20} color="#fff" />
                </View>
                <View>
                  <Text style={[styles.pulseTitle, settings.compactMode && { fontSize: 14 }]}>Attention Required</Text>
                  <Text style={[styles.pulseSub, settings.compactMode && { fontSize: 11 }]}>You have {formatCurrency(stats.totalPending)} pending collection</Text>
                </View>
              </View>
              <ArrowRight size={settings.compactMode ? 16 : 20} color="#fff" style={{ opacity: 0.8 }} />
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
        <Animated.View entering={isPerformanceMode() ? FadeInDown : FadeInDown.delay(200).duration(400).springify()}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.analyticsScroll}>
            <View style={[styles.analyticPill, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#eff6ff' }]}>
              <Users size={16} color="#3b82f6" />
              <Text style={[styles.analyticNum, { color: isDark ? '#fff' : '#1e3a8a' }]}>{stats.customerCount}</Text>
              <Text style={[styles.analyticLabel, { color: '#3b82f6' }]}>Clients</Text>
            </View>
            <View style={[styles.analyticPill, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#fffbeb' }]}>
              <TrendingUpDown size={16} color="#f59e0b" />
              <Text style={[styles.analyticNum, { color: isDark ? '#fff' : '#78350f' }]}>{stats.activeLoanCount}</Text>
              <Text style={[styles.analyticLabel, { color: '#f59e0b' }]}>Active</Text>
            </View>
            <View style={[styles.analyticPill, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#ecfdf5' }]}>
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={[styles.analyticNum, { color: isDark ? '#fff' : '#064e3b' }]}>{stats.completedLoanCount}</Text>
              <Text style={[styles.analyticLabel, { color: '#10b981' }]}>Settled</Text>
            </View>
          </ScrollView>
        </Animated.View>

        <Animated.View 
          entering={FadeInDown.delay(300).duration(400).springify()}
          style={[
            styles.section, 
            { 
              backgroundColor: isDark ? '#0f172a' : colors.surface, 
              borderColor: isDark ? '#1e293b' : colors.cardBorder,
              padding: settings.compactMode ? 12 : 16,
              marginBottom: settings.compactMode ? 12: 16
            }
          ]}
        >
          <View style={styles.sectionHeader}>
             <View>
              <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : colors.text }]}>
                Cash Flow Analysis
              </Text>
              {selectedPoint ? (
                <View style={styles.watcherRow}>
                  <Text style={[styles.pointWatcherValue, { color: '#10b981' }]}>
                    In: <Text style={{ color: isDark ? '#fff' : colors.text }}>{formatCurrency(selectedPoint.in)}</Text>
                  </Text>
                  <View style={[styles.vertDivider, { backgroundColor: isDark ? '#334155' : colors.border }]} />
                  <Text style={[styles.pointWatcherValue, { color: '#ef4444' }]}>
                    Out: <Text style={{ color: isDark ? '#fff' : colors.text }}>{formatCurrency(selectedPoint.out)}</Text>
                  </Text>
                </View>
              ) : (
                <Text style={[styles.watcherSub, { color: colors.textTertiary }]}>Returns (In) vs Investments (Out)</Text>
              )}
             </View>
             {isChartEmpty && (
               <View style={[styles.emptyBadge, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : colors.primaryBg }]}>
                 <Text style={[styles.emptyBadgeText, { color: isDark ? '#60a5fa' : colors.primary }]}>LIVE TRACKING</Text>
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
                    triggerHapticImpact(ImpactStyle.Light)
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
                  labels: contextChartData.labels,
                  datasets: [
                    { 
                      data: isChartEmpty ? [10, 25, 45, 30, 55, 40, 60] : contextChartData.inData,
                      color: (opacity = 1) => `rgba(16, 185, 129, ${isChartEmpty ? 0.3 : 1})`, // Neon Green
                      strokeWidth: 4
                    },
                    { 
                      data: isChartEmpty ? [60, 40, 55, 30, 45, 25, 10] : contextChartData.outData,
                      color: (opacity = 1) => `rgba(239, 68, 68, ${isChartEmpty ? 0.3 : 1})`, // Neon Red
                      strokeWidth: 4
                    }
                  ],
                }}
                width={Math.max(screenWidth - 64, contextChartData.inData.length * (timeRange === '7d' ? 45 : 35))}
                height={200}
                withInnerLines={true}
                withOuterLines={false}
                withDots={!isChartEmpty}
                chartConfig={{
                  backgroundColor: isDark ? '#0f172a' : colors.surface,
                  backgroundGradientFrom: isDark ? '#0f172a' : colors.surface,
                  backgroundGradientTo: isDark ? '#0f172a' : colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => isDark 
                    ? `rgba(255, 255, 255, ${opacity * 0.05})` 
                    : `rgba(99, 102, 241, ${opacity * 0.08})`, 
                  labelColor: () => isDark ? '#475569' : colors.textSecondary,
                  propsForLabels: {
                    fontSize: 10,
                    fontWeight: '600'
                  },
                  fillShadowGradientFromOpacity: 0,
                  fillShadowGradientToOpacity: 0,
                  propsForDots: {
                    r: settings.compactMode ? "4" : "5",
                    strokeWidth: "2",
                    stroke: isDark ? "#0f172a" : "#fff" 
                  }
                }}
                bezier
                onDataPointClick={({ value, index }) => {
                  triggerHapticImpact()
                  setSelectedPoint({
                    label: Object.keys(contextChartData.labels).length > 0 ? contextChartData.labels[index] || "Date" : "Date",
                    in: contextChartData.inData[index] || 0,
                    out: contextChartData.outData[index] || 0
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
          entering={FadeInDown.delay(350).duration(400).springify()}
          style={[
            styles.section, 
            { 
              backgroundColor: colors.surface, 
              borderColor: colors.cardBorder,
              padding: settings.compactMode ? 12 : 16,
              marginBottom: settings.compactMode ? 12 : 16
            }
          ]}
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
                <View key={payment.id} style={[styles.timelineItem, settings.compactMode && { paddingVertical: 8 }]}>
                  {/* Vertical Track Line */}
                  {index !== recentPayments.length - 1 && (
                    <View style={[styles.timelineLine, { backgroundColor: colors.border }, settings.compactMode && { top: 30 }]} />
                  )}
                  {/* Timeline Avatar Node */}
                  <View style={[styles.timelineDot, { backgroundColor: `${colors.primary}15` }, settings.compactMode && { width: 32, height: 32, marginRight: 12 }]}>
                    <Text style={{ color: colors.primary, fontWeight: '800', fontSize: settings.compactMode ? 12 : 14 }}>
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
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  syncDot: { width: 6, height: 6, borderRadius: 3, opacity: 0.8 },
  pullHint: { fontSize: 11, fontWeight: '600', letterSpacing: 0.2 },

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
