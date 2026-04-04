import React, { useCallback, useState } from 'react'
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
import { Plus, Download, Receipt } from 'lucide-react-native'
import { format } from 'date-fns'
import { formatCurrency } from '@/src/lib/utils'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as Haptics from 'expo-haptics'
import { BarChart } from 'react-native-chart-kit'
import { Dimensions, Modal, ScrollView as RNScrollView } from 'react-native'
import Animated, { FadeInDown, FadeInRight, FadeOut, FadeIn, Layout, SlideInRight, SlideOutLeft, SlideInLeft, SlideOutRight } from 'react-native-reanimated'
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
        .gte('payment_date', format(startDate, 'yyyy-MM-dd'))
        .lte('payment_date', format(endDate, 'yyyy-MM-dd'))

      if (!reportPayments || reportPayments.length === 0) {
        showAlert({
          title: 'No Data',
          message: `No collections found for ${label}`,
          type: 'info'
        })
        return
      }

      await generateCollectionReport(reportPayments, label)
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

  const handleExport = () => {
    setShowExportModal(true)
  }

  if (loading) return <LoadingSpinner message="Loading payments..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View key={focusKey} style={{ flex: 1 }}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Payments</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.exportButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={handleExport}
              activeOpacity={0.7}
            >
              <DownloadIcon size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/(tabs)/payments/new')}
              activeOpacity={0.8}
            >
              <Plus size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* View Toggle */}
        <Animated.View
          layout={Layout.springify()}
          entering={FadeInDown.delay(100).duration(400).springify()}
          style={[styles.viewToggle, { backgroundColor: isDark ? '#ffffff10' : '#00000005' }]}
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
            <Animated.View
              key="recent-tab"
              entering={SlideInLeft.duration(400).springify()}
              exiting={SlideOutRight.duration(300)}
              style={{ flex: 1 }}
            >
              <FlatList
                data={payments}
                keyExtractor={(item) => item.id}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayments() }} tintColor={colors.primary} />}
                contentContainerStyle={payments.length === 0 ? styles.emptyContent : undefined}
                ListEmptyComponent={
                  <EmptyState
                    icon={Receipt}
                    title="No payments recorded"
                    description="Payments collected from customers will appear here."
                    actionLabel="Record Payment"
                    onAction={() => router.push('/(tabs)/payments/new')}
                  />
                }
                renderItem={({ item }) => (
                  <View style={{ backgroundColor: colors.surface }}>
                    <PaymentCard
                      amount={item.amount}
                      customerName={item.loans?.customers?.name || 'Unknown'}
                      paymentDate={item.payment_date}
                      onDelete={() => handleDeletePayment(item.id)}
                    />
                  </View>
                )}
              />
            </Animated.View>
          ) : (
            <Animated.View
              key="history-tab"
              entering={SlideInRight.duration(400).springify()}
              exiting={SlideOutLeft.duration(300)}
              style={{ flex: 1 }}
            >
              <RNScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPayments() }} tintColor={colors.primary} />}
                contentContainerStyle={styles.historyContent}
              >
                <View
                  style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                >
                  <View style={styles.chartHeader}>
                    <View>
                      <Text style={[styles.chartTitle, { color: colors.text }]}>12-Month Performance</Text>
                      <Text style={[styles.chartSubtitle, { color: colors.textTertiary }]}>Collection trends across the year</Text>
                    </View>
                    <View style={[styles.chartBadge, { backgroundColor: colors.primaryBg }]}>
                      <Text style={[styles.chartBadgeText, { color: colors.primary }]}>Live Data</Text>
                    </View>
                  </View>

                  <View style={styles.chartContainer}>
                    <BarChart
                      data={{
                        labels: historyData.map(h => h.label),
                        datasets: [{ data: historyData.map(h => h.total / 1000) }]
                      }}
                      width={screenWidth - 48}
                      height={220}
                      yAxisLabel="Rs."
                      yAxisSuffix="k"
                      chartConfig={{
                        backgroundColor: colors.surface,
                        backgroundGradientFrom: colors.surface,
                        backgroundGradientTo: colors.surface,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(${parseInt(colors.primary.slice(1, 3), 16)}, ${parseInt(colors.primary.slice(3, 5), 16)}, ${parseInt(colors.primary.slice(5, 7), 16)}, ${opacity})`,
                        labelColor: (opacity = 1) => colors.textTertiary,
                        style: { borderRadius: 16 },
                        barPercentage: 0.6,
                        propsForBackgroundLines: {
                          strokeDasharray: '',
                          stroke: colors.border,
                          strokeOpacity: 0.3
                        }
                      }}
                      style={{ marginVertical: 8, borderRadius: 16, marginLeft: -16 }}
                      fromZero
                      showValuesOnTopOfBars
                      flatColor={true}
                    />
                  </View>
                </View>

                <View style={styles.historyList}>
                  <Text style={[styles.historyListTitle, { color: colors.text }]}>Collection Breakdown</Text>
                  {historyData.slice().reverse().map((item, idx) => (
                    <View
                      key={idx}
                      style={[styles.historyItem, { borderBottomColor: colors.border }]}
                    >
                      <View style={styles.historyRowLeft}>
                        <View style={[styles.monthIndicator, { backgroundColor: item.total > 0 ? colors.primary : colors.textTertiary + '20' }]} />
                        <View>
                          <Text style={[styles.historyItemLabel, { color: colors.text }]}>{item.fullLabel}</Text>
                          <Text style={[styles.historyItemYear, { color: colors.textTertiary }]}>{item.year}</Text>
                        </View>
                      </View>
                      <Text style={[styles.historyItemVal, { color: item.total > 0 ? colors.primary : colors.textTertiary }]}>
                        {formatCurrency(item.total)}
                      </Text>
                    </View>
                  ))}
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
                <TouchableOpacity onPress={() => setShowExportModal(false)} style={styles.modalClose}>
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
                      <View style={[styles.optionIcon, { backgroundColor: colors.primaryBg }]}>
                        <Calendar size={18} color={colors.primary} />
                      </View>
                      <Text style={[styles.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                    </View>
                    <ChevronRight size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ))}

                {showCustomRange && (
                  <View style={[styles.customRangeBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.row}>
                      <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => { setPickerMode('start'); setShowPicker(true) }}
                      >
                        <Text style={styles.dateLabel}>Start</Text>
                        <Text style={[styles.dateVal, { color: colors.text }]}>{format(customRange.start, 'MMM dd, yyyy')}</Text>
                      </TouchableOpacity>
                      <View style={styles.dateSep} />
                      <TouchableOpacity
                        style={styles.dateBtn}
                        onPress={() => { setPickerMode('end'); setShowPicker(true) }}
                      >
                        <Text style={styles.dateLabel}>End</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 10 },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: { flexGrow: 1, padding: 16 },
  viewToggle: { flexDirection: 'row', backgroundColor: '#f3f4f620', marginHorizontal: 16, marginBottom: 16, padding: 4, borderRadius: 12 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  toggleText: { fontSize: 14, fontWeight: '600' },
  historyContent: { padding: 16, paddingBottom: 100 },
  chartCard: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 4 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  chartTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
  chartSubtitle: { fontSize: 13, marginTop: 2 },
  chartBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  chartBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  chartContainer: { alignItems: 'center' },
  historyList: { gap: 4, paddingBottom: 20 },
  historyListTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
  historyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  historyRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthIndicator: { width: 4, height: 24, borderRadius: 2 },
  historyItemLabel: { fontSize: 16, fontWeight: '600' },
  historyItemYear: { fontSize: 12, marginTop: 1 },
  historyItemVal: { fontSize: 16, fontWeight: '700' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700' },
  modalSubtitle: { fontSize: 14, marginTop: 2 },
  modalClose: { padding: 4 },
  optionsContainer: { gap: 4 },
  optionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1 },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  optionIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optionLabel: { fontSize: 16, fontWeight: '500' },
  customRangeBox: { marginTop: 12, padding: 16, borderRadius: 16, borderWidth: 1, gap: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  dateBtn: { flex: 1, gap: 4 },
  dateLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase' },
  dateVal: { fontSize: 15, fontWeight: '600' },
  dateSep: { width: 1, height: 24, backgroundColor: '#eee', marginHorizontal: 16 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 12 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
