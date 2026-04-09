import React, { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAlert } from '@/src/context/AlertContext'
import { supabase } from '@/src/lib/supabase'
import PaymentCard from '@/src/components/PaymentCard'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'
import { Plus, Download, Receipt, TrendingUp, Wallet } from 'lucide-react-native'
import { format } from 'date-fns'
import { formatCurrency } from '@/src/lib/utils'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as Haptics from 'expo-haptics'
import { Dimensions, Modal, ScrollView as RNScrollView } from 'react-native'
import Animated, { FadeInDown, FadeInRight, FadeOut, FadeIn, Layout, SlideInRight, SlideOutLeft, SlideInLeft, SlideOutRight } from 'react-native-reanimated'
import { LineChart, BarChart } from 'react-native-chart-kit'
import { X, Calendar, ChevronRight, BarChart3, List, Download as DownloadIcon } from 'lucide-react-native'
import { startOfMonth, endOfMonth, subMonths, subDays } from 'date-fns'
import DateTimePicker from '@react-native-community/datetimepicker'
import { generateCollectionReport } from '@/src/lib/reports'

const screenWidth = Dimensions.get('window').width

export default function PaymentsScreen() {
  const { colors, isDark } = useTheme()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payments, setPayments] = useState<any[]>([])
  const [viewMode, setViewMode] = useState<'recent' | 'history'>('recent')
  const [historyData, setHistoryData] = useState<any[]>([])
  const [focusKey, setFocusKey] = useState(0)

  // Export Modal State
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [customRange, setCustomRange] = useState({ start: new Date(), end: new Date() })
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start')
  const [showPicker, setShowPicker] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<{ label: string; value: number } | null>(null)

  // Payment stats
  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const todayTotal = payments.filter(p => p.payment_date === today).reduce((s, p) => s + Number(p.amount), 0)
    const totalAll = payments.reduce((s, p) => s + Number(p.amount), 0)
    return { todayTotal, totalAll, count: payments.length }
  }, [payments])

  const fetchPayments = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('payments')
        .select('*, loans(id, customers(id, name))')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })

      setPayments(data || [])

      // Calculate history for past 12 months
      if (data) {
        const months: any = {}
        for (let i = 0; i < 12; i++) {
          const d = subMonths(new Date(), i)
          const key = format(d, 'yyyy-MM')
          months[key] = { label: format(d, 'MMM'), total: 0, fullLabel: format(d, 'MMMM yyyy'), year: format(d, 'yyyy') }
        }

        data.forEach(p => {
          const key = p.payment_date.substring(0, 7)
          if (months[key]) {
            months[key].total += Number(p.amount)
          }
        })

        setHistoryData(Object.values(months).reverse())
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const handleDownloadReport = async (rangeType: 'today' | '7days' | 'month' | 'lastmonth' | 'custom') => {
    setExportLoading(true)
    try {
      let startDate: Date
      let endDate: Date = new Date()
      let label: string

      switch (rangeType) {
        case 'today':
          startDate = new Date(); startDate.setHours(0, 0, 0, 0);
          label = format(startDate, 'MMM dd, yyyy')
          break
        case '7days':
          startDate = subDays(new Date(), 7)
          label = `Last 7 Days`
          break
        case 'month':
          startDate = startOfMonth(new Date())
          label = format(startDate, 'MMMM yyyy')
          break
        case 'lastmonth':
          const lm = subMonths(new Date(), 1)
          startDate = startOfMonth(lm); endDate = endOfMonth(lm);
          label = format(startDate, 'MMMM yyyy')
          break
        case 'custom':
          startDate = customRange.start; endDate = customRange.end;
          label = `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`
          break
      }

      const { data: reportPayments } = await supabase
        .from('payments')
        .select('*, loans(id, customers(name))')
        .gte('payment_date', format(startDate!, 'yyyy-MM-dd'))
        .lte('payment_date', format(endDate, 'yyyy-MM-dd'))

      if (!reportPayments || reportPayments.length === 0) {
        showAlert({
          title: 'No Data',
          message: `No collections found for ${label!}`,
          type: 'info'
        })
        return
      }

      await generateCollectionReport(reportPayments, label!)
      setShowExportModal(false)
    } finally {
      setExportLoading(false)
    }
  }

  useFocusEffect(
    useCallback(() => {
      fetchPayments()
      setFocusKey(prev => prev + 1)
    }, [fetchPayments])
  )

  const handleDeletePayment = (paymentId: string) => {
    showAlert({
      title: 'Delete Payment',
      message: 'Are you sure you want to delete this payment record?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('payments')
                .delete()
                .eq('id', paymentId)

              if (error) throw error

              fetchPayments()
            } catch (err: any) {
              showAlert({
                title: 'Error',
                message: err.message || 'Failed to delete payment',
                type: 'error'
              })
            }
          }
        }
      ]
    })
  }

  if (loading) return <LoadingSpinner message="Loading payments..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View key={focusKey} style={{ flex: 1 }}>

        {/* Premium Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>Collections</Text>
            <Text style={[styles.title, { color: colors.text }]}>Payment Center</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => setShowExportModal(true)}
              activeOpacity={0.7}
            >
              <DownloadIcon size={18} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/payments/new')}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Stats Strip */}
        <Animated.View entering={FadeInDown.delay(50).duration(400).springify()}>
          <RNScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? 'rgba(16,185,129,0.2)' : '#d1fae5' }]}>
                <TrendingUp size={14} color="#10b981" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#064e3b' }]}>{formatCurrency(stats.todayTotal)}</Text>
                <Text style={[styles.statLabel, { color: '#10b981' }]}>Today</Text>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? 'rgba(59,130,246,0.2)' : '#dbeafe' }]}>
                <Wallet size={14} color="#3b82f6" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#1e3a8a' }]}>{formatCurrency(stats.totalAll)}</Text>
                <Text style={[styles.statLabel, { color: '#3b82f6' }]}>All Time</Text>
              </View>
            </View>
            <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#f5f3ff' }]}>
              <View style={[styles.statIcon, { backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : '#ede9fe' }]}>
                <Receipt size={14} color="#8b5cf6" />
              </View>
              <View>
                <Text style={[styles.statValue, { color: isDark ? '#fff' : '#4c1d95' }]}>{stats.count}</Text>
                <Text style={[styles.statLabel, { color: '#8b5cf6' }]}>Records</Text>
              </View>
            </View>
          </RNScrollView>
        </Animated.View>

        {/* View Toggle */}
        <Animated.View
          layout={Layout.springify()}
          entering={FadeInDown.delay(100).duration(400).springify()}
          style={[styles.viewToggle, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
        >
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'recent' && { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setViewMode('recent')
            }}
            activeOpacity={0.9}
          >
            <List size={16} color={viewMode === 'recent' ? '#fff' : colors.textSecondary} />
            <Animated.Text layout={Layout} style={[styles.toggleText, { color: viewMode === 'recent' ? '#fff' : colors.textSecondary }]}>Recent</Animated.Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleBtn, viewMode === 'history' && { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              setViewMode('history')
            }}
            activeOpacity={0.9}
          >
            <BarChart3 size={16} color={viewMode === 'history' ? '#fff' : colors.textSecondary} />
            <Animated.Text layout={Layout} style={[styles.toggleText, { color: viewMode === 'history' ? '#fff' : colors.textSecondary }]}>History</Animated.Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ flex: 1 }}>
          {viewMode === 'recent' ? (
            /* ===== RECENT TAB ===== */
            <Animated.View
              key="recent-tab"
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={{ flex: 1 }}
            >
              <FlatList
                data={payments}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayments() }} tintColor={colors.primary} />}
                contentContainerStyle={payments.length === 0 ? styles.emptyContent : { paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                  <EmptyState
                    icon={Receipt}
                    title="No payments recorded"
                    description="Payments collected from customers will appear here."
                    actionLabel="Record Payment"
                    onAction={() => router.push('/(tabs)/payments/new')}
                  />
                }
                renderItem={({ item, index }) => (
                  <Animated.View 
                    entering={FadeInDown.delay(Math.min(index * 50, 500)).duration(350).springify()}
                  >
                    <PaymentCard
                      amount={item.amount}
                      customerName={item.loans?.customers?.name || 'Unknown'}
                      paymentDate={item.payment_date}
                      onDelete={() => handleDeletePayment(item.id)}
                    />
                  </Animated.View>
                )}
              />
            </Animated.View>
          ) : (
            /* ===== HISTORY TAB ===== */
            <Animated.View
              key="history-tab"
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(200)}
              style={{ flex: 1 }}
            >
              <RNScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayments() }} tintColor={colors.primary} />}
                contentContainerStyle={styles.historyContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Chart Card */}
                <Animated.View
                  entering={FadeInDown.delay(100).duration(400).springify()}
                  style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                >
                  <View style={styles.chartHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>12-Month Performance</Text>
                      {selectedMonth ? (
                        <Text style={[styles.chartWatcherValue, { color: colors.primary }]}>
                          {selectedMonth.label}: <Text style={{ color: colors.text }}>{formatCurrency(selectedMonth.value)}</Text>
                        </Text>
                      ) : (
                        <Text style={[styles.chartSubtitle, { color: colors.textTertiary }]}>Collection trends across the year</Text>
                      )}
                    </View>
                    <View style={[styles.chartBadge, { backgroundColor: `${colors.primary}15` }]}>
                      <Text style={[styles.chartBadgeText, { color: colors.primary }]}>Live</Text>
                    </View>
                  </View>

                  <RNScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chartWrapper}
                  >
                    <View style={styles.chartContainer}>
                      <LineChart
                        data={{
                          labels: historyData.map(h => h.label),
                          datasets: [{ data: historyData.map(h => h.total / 1000) }]
                        }}
                        width={Math.max(screenWidth - 48, historyData.length * 60)}
                        height={200}
                        withInnerLines={false}
                        withOuterLines={false}
                        withDots={true}
                        chartConfig={{
                          backgroundColor: 'transparent',
                          backgroundGradientFrom: colors.surface,
                          backgroundGradientTo: colors.surface,
                          decimalPlaces: 0,
                          color: (opacity = 1) => colors.primary,
                          labelColor: () => colors.textTertiary,
                          style: { borderRadius: 16 },
                          propsForDots: {
                            r: "5",
                            strokeWidth: "2",
                            stroke: colors.primary,
                          },
                          fillShadowGradientFrom: colors.primary,
                          fillShadowGradientTo: 'transparent',
                          fillShadowGradientFromOpacity: 0.15,
                          fillShadowGradientToOpacity: 0,
                        }}
                        bezier
                        onDataPointClick={({ value, index }: { value: number; index: number }) => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                          setSelectedMonth({
                            label: historyData[index]?.fullLabel || "Date",
                            value: value * 1000
                          })
                        }}
                        style={styles.chart}
                      />
                    </View>
                  </RNScrollView>
                  <Text style={[styles.panHint, { color: colors.textTertiary }]}>
                     ← Swipe to navigate months →
                  </Text>
                </Animated.View>

                {/* Monthly Breakdown */}
                <View style={styles.historyList}>
                  <Text style={[styles.historyListTitle, { color: colors.text }]}>Monthly Breakdown</Text>
                  {historyData.slice().reverse().map((item, idx) => {
                    const maxTotal = Math.max(...historyData.map(h => h.total), 1)
                    const barWidth = (item.total / maxTotal) * 100
                    return (
                      <Animated.View
                        key={idx}
                        entering={FadeInDown.delay(100 + (idx * 40)).duration(350).springify()}
                        style={[styles.historyItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                      >
                        <View style={styles.historyRowLeft}>
                          <View style={[styles.monthDot, { backgroundColor: item.total > 0 ? colors.primary : colors.textTertiary + '30' }]} />
                          <View>
                            <Text style={[styles.historyItemLabel, { color: colors.text }]}>{item.fullLabel}</Text>
                          </View>
                        </View>
                        <Text style={[styles.historyItemVal, { color: item.total > 0 ? colors.primary : colors.textTertiary }]}>
                          {formatCurrency(item.total)}
                        </Text>
                      </Animated.View>
                    )
                  })}
                </View>
              </RNScrollView>
            </Animated.View>
          )}
        </View>

        {/* Export Selection Modal */}
        <Modal visible={showExportModal} transparent animationType="fade">
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>Export Collections</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Select a collection period</Text>
                </View>
                <TouchableOpacity onPress={() => setShowExportModal(false)} style={[styles.modalClose, { backgroundColor: colors.background }]}>
                  <X size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                {[
                  { id: 'today', label: 'Today', icon: 'clock' },
                  { id: '7days', label: 'Last 7 Days', icon: 'calendar' },
                  { id: 'month', label: 'This Month', icon: 'calendar' },
                  { id: 'lastmonth', label: 'Last Month', icon: 'calendar' },
                  { id: 'custom', label: 'Custom Range', icon: 'settings' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[styles.optionItem, { borderBottomColor: colors.border }]}
                    onPress={() => {
                      if (opt.id === 'custom') setShowCustomRange(!showCustomRange)
                      else handleDownloadReport(opt.id as any)
                    }}
                    disabled={exportLoading}
                  >
                    <View style={styles.optionLeft}>
                      <View style={[styles.optionIcon, { backgroundColor: `${colors.primary}15` }]}>
                        <Calendar size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}

                {showCustomRange && (
                  <View style={[styles.customRangeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.rangeRow}>
                      <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => { setPickerMode('start'); setShowPicker(true) }}
                      >
                        <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>Start</Text>
                        <Text style={[styles.dateVal, { color: colors.text }]}>{format(customRange.start, 'MMM dd, yyyy')}</Text>
                      </TouchableOpacity>
                      <View style={[styles.dateSep, { backgroundColor: colors.border }]} />
                      <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => { setPickerMode('end'); setShowPicker(true) }}
                      >
                        <Text style={[styles.dateLabel, { color: colors.textTertiary }]}>End</Text>
                        <Text style={[styles.dateVal, { color: colors.text }]}>{format(customRange.end, 'MMM dd, yyyy')}</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      style={[styles.generateBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleDownloadReport('custom')}
                      disabled={exportLoading}
                    >
                      <DownloadIcon size={16} color="#fff" />
                      <Text style={styles.generateBtnText}>{exportLoading ? 'Processing...' : 'Generate Report'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {showPicker && (
            <DateTimePicker
              value={pickerMode === 'start' ? customRange.start : customRange.end}
              mode="date"
              onChange={(e, date) => {
                setShowPicker(false)
                if (date) setCustomRange(prev => ({ ...prev, [pickerMode]: date }))
              }}
            />
          )}
        </Modal>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },

  // Stats
  statsScroll: { paddingHorizontal: 16, gap: 12, paddingBottom: 16 },
  statCard: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16 },
  statIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  statLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginTop: 1 },

  // Toggle
  viewToggle: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, padding: 4, borderRadius: 14 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 },
  toggleText: { fontSize: 14, fontWeight: '700' },

  emptyContent: { flexGrow: 1, padding: 16 },

  // History
  historyContent: { padding: 16, paddingBottom: 100 },
  chartCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 24, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  chartTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  chartSubtitle: { fontSize: 13, marginTop: 2 },
  chartBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chartBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  chartContainer: { alignItems: 'center' },
  chartWrapper: { paddingLeft: 8 },
  chartWatcherValue: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  panHint: { fontSize: 10, textAlign: 'center', marginTop: 8, fontWeight: '600', opacity: 0.5 },
  chart: { marginTop: 4, borderRadius: 12, marginLeft: -16 },

  historyList: { gap: 8, paddingBottom: 20 },
  historyListTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 12 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1 },
  historyRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthDot: { width: 10, height: 10, borderRadius: 5 },
  historyItemLabel: { fontSize: 15, fontWeight: '600' },
  historyItemVal: { fontSize: 16, fontWeight: '800' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  modalSubtitle: { fontSize: 14, marginTop: 2 },
  modalClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  optionsContainer: { gap: 4 },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  customRangeBox: { marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  rangeRow: { flexDirection: 'row', alignItems: 'center' },
  dateBtn: { flex: 1, gap: 4 },
  dateLabel: { fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  dateVal: { fontSize: 15, fontWeight: '600' },
  dateSep: { width: 1, height: 24, marginHorizontal: 16 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
