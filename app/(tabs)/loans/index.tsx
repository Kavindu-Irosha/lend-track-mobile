import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Modal,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import LoanCard from '@/src/components/LoanCard'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'
import { Plus, Search, CreditCard, Download, Calendar, X, ChevronRight, Trash2 } from 'lucide-react-native'
import { generateCollectionReport } from '@/src/lib/reports'
import * as Haptics from 'expo-haptics'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import DateTimePicker from '@react-native-community/datetimepicker'
import { formatCurrency } from '@/src/lib/utils'
import { useAlert } from '@/src/context/AlertContext'

export default function LoansScreen() {
  const { colors } = useTheme()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loans, setLoans] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [focusKey, setFocusKey] = useState(0)

  // Report Modal State
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
  const [customRange, setCustomRange] = useState({ start: new Date(), end: new Date() })
  const [showCustomRange, setShowCustomRange] = useState(false)
  const [pickerMode, setPickerMode] = useState<'start' | 'end'>('start')
  const [showPicker, setShowPicker] = useState(false)

  // Debounce: wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const fetchLoans = useCallback(async () => {
    try {
      let q = supabase
        .from('loans')
        .select('*, customers!inner(id, name), payments(amount)')
        .order('created_at', { ascending: false })

      if (debouncedQuery.trim()) {
        q = q.ilike('customers.name', `%${debouncedQuery.trim()}%`)
      }

      const { data } = await q

      const processed = (data || []).map((loan) => {
        const loanTotal = Number(loan.amount) + Number(loan.interest)
        const paid = loan.payments?.reduce(
          (sum: number, p: any) => sum + Number(p.amount), 0
        ) || 0
        const remaining = loanTotal - paid
        let status = 'Active'
        if (remaining <= 0) status = 'Completed'
        else if (new Date(loan.due_date) < new Date() && remaining > 0) status = 'Overdue'
        return {
          ...loan,
          customerName: loan.customers?.name || 'Unknown',
          customerId: loan.customers?.id,
          total: loanTotal,
          paid,
          remaining,
          computedStatus: status,
        }
      })

      setLoans(processed)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedQuery])

  const handleDownloadReport = async (rangeType: 'today' | '7days' | 'month' | 'lastmonth' | 'custom') => {
    setExportLoading(true)
    try {
      let startDate: Date
      let endDate: Date = new Date()
      let label: string

      switch (rangeType) {
        case 'today':
          startDate = new Date()
          startDate.setHours(0, 0, 0, 0)
          label = format(startDate, 'MMM dd, yyyy')
          break
        case '7days':
          startDate = subDays(new Date(), 7)
          label = `Last 7 Days (${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')})`
          break
        case 'month':
          startDate = startOfMonth(new Date())
          label = format(startDate, 'MMMM yyyy')
          break
        case 'lastmonth':
          const lastMonth = subMonths(new Date(), 1)
          startDate = startOfMonth(lastMonth)
          endDate = endOfMonth(lastMonth)
          label = format(startDate, 'MMMM yyyy')
          break
        case 'custom':
          startDate = customRange.start
          endDate = customRange.end
          label = `${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd, yyyy')}`
          break
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('*, loans(id, customers(name))')
        .gte('payment_date', format(startDate, 'yyyy-MM-dd'))
        .lte('payment_date', format(endDate, 'yyyy-MM-dd'))
      
      if (!payments || payments.length === 0) {
        showAlert({
          title: 'No Data',
          message: `No payments found for ${label}`,
          type: 'info'
        })
        return
      }

      await generateCollectionReport(payments, label)
      setShowExportModal(false)
    } finally {
      setExportLoading(false)
    }
  }

  const handleDeleteLoan = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId)
    if (loan && loan.remaining > 0) {
      showAlert({
        title: 'Capital Protection Lock',
        message: `This loan still has an outstanding balance of ${formatCurrency(loan.remaining)}. You cannot delete an active debt.`,
        type: 'error'
      })
      return
    }

    showAlert({
      title: 'Delete Loan Record',
      message: 'Are you sure? This will permanentely remove the loan and its payment history from your records.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Forever', 
          style: 'destructive',
          onPress: async () => {
             try {
               Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
               const { error } = await supabase.from('loans').delete().eq('id', loanId)
               if (error) throw error
               
               Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
               fetchLoans()
             } catch (err: any) {
               showAlert({ title: 'Error', message: err.message, type: 'error' })
             }
          }
        }
      ]
    })
  }

  useFocusEffect(
    useCallback(() => {
      fetchLoans()
      setFocusKey(prev => prev + 1)
    }, [fetchLoans])
  )

  if (loading) return <LoadingSpinner message="Loading loans..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View key={focusKey} style={{ flex: 1 }}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>All Loans</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.reportButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={() => setShowExportModal(true)}
            activeOpacity={0.7}
          >
            <Download size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/loans/new')}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by customer..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={{ flex: 1 }}>
        <FlatList
          data={loans}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoans() }} tintColor={colors.primary} />}
          contentContainerStyle={loans.length === 0 ? styles.emptyContent : undefined}
          ListEmptyComponent={
            <EmptyState
              icon={CreditCard}
              title="No loans found"
              description={query ? "No loans match your search criteria." : "Once you issue a loan, it will appear here."}
              actionLabel={query ? undefined : "New Loan"}
              onAction={query ? undefined : () => router.push('/(tabs)/loans/new')}
            />
          }
          renderItem={({ item }) => (
            <View style={[{ backgroundColor: colors.surface }]}>
              <LoanCard
                customerName={item.customerName}
                total={item.total}
                paid={item.paid}
                remaining={item.remaining}
                status={item.computedStatus}
                dueDate={item.due_date}
                onPress={() => router.push(`/(tabs)/customers/${item.customerId}`)}
                onPay={item.remaining > 0 ? () => router.push(`/(tabs)/payments/new?loan_id=${item.id}`) : undefined}
                onDelete={() => handleDeleteLoan(item.id)}
              />
            </View>
          )}
        />
      </Animated.View>

      {/* Export Selection Modal */}
      <Modal visible={showExportModal} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Export Report</Text>
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
                      {opt.id === 'custom' ? <Plus size={18} color={colors.primary} /> : <Calendar size={18} color={colors.primary} />}
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
                    <Download size={16} color="#fff" />
                    <Text style={styles.generateBtnText}>{exportLoading ? 'Processing...' : 'Generate Custom Report'}</Text>
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
              if (date) {
                setCustomRange(prev => ({ ...prev, [pickerMode]: date }))
              }
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  addButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  emptyContent: { flexGrow: 1, padding: 16 },
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
