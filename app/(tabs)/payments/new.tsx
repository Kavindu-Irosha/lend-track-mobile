import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { supabase } from '@/src/lib/supabase'
import FormInput from '@/src/components/FormInput'
import { ArrowLeft, ChevronDown, Check, Calendar as CalendarIcon } from 'lucide-react-native'
import { format } from 'date-fns'
import { formatCurrency } from '@/src/lib/utils'
import * as Haptics from 'expo-haptics'
import { useAlert } from '@/src/context/AlertContext'
import DateTimePicker from '@react-native-community/datetimepicker'

interface ProcessedLoan {
  id: string
  customerName: string
  remaining: number
  total: number
  installmentAmount: number
  startDate: string
}

export default function NewPaymentScreen() {
  const { loan_id } = useLocalSearchParams<{ loan_id?: string }>()
  const { colors } = useTheme()
  const { user } = useAuth()
  const { showAlert } = useAlert()
  const router = useRouter()

  const [loans, setLoans] = useState<ProcessedLoan[]>([])
  const [selectedLoanId, setSelectedLoanId] = useState(loan_id || '')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date())
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [referenceId, setReferenceId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showLoanPicker, setShowLoanPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showMethodPicker, setShowMethodPicker] = useState(false)

  const paymentMethods = ['cash', 'bank_transfer', 'ez_cash', 'other']

  // Auto-generate reference ID on mount
  useEffect(() => {
    const randomId = Math.random().toString(36).substring(2, 9).toUpperCase()
    setReferenceId(`REF-${randomId}`)
  }, [])

  useFocusEffect(
    useCallback(() => {
      async function fetchLoans() {
        const { data } = await supabase
          .from('loans')
          .select('id, amount, interest, installment_type, start_date, customers(name), payments(amount)')
          .order('created_at', { ascending: false })

        const processed = (data || []).map((loan) => {
          const loanTotal = Number(loan.amount) + Number(loan.interest)
          const paid = loan.payments?.reduce(
            (sum: number, p: any) => sum + Number(p.amount), 0
          ) || 0
          const remaining = loanTotal - paid

          // Estimate installment for auto-fill (can be improved with business logic)
          // For now, let's assume a default installment divisor if not fully tracked
          const divisor = loan.installment_type === 'daily' ? 30 : (loan.installment_type === 'weekly' ? 4 : 1)
          const installmentAmount = Math.min(remaining, Math.ceil(loanTotal / divisor))

          return {
            id: loan.id,
            customerName: (loan.customers as any)?.name || 'Unknown',
            remaining,
            total: loanTotal,
            installmentAmount,
            startDate: loan.start_date
          }
        }).filter((loan) => loan.remaining > 0 || loan.id === loan_id)

        setLoans(processed)
        
        if (processed.length === 0) {
          showAlert({
            title: 'No Active Loans',
            message: 'There are no active loans to record a payment for.',
            type: 'warning'
          })
          router.back()
          return
        }

        if (loan_id) setSelectedLoanId(loan_id)
      }
      fetchLoans()
    }, [loan_id, showAlert])
  )

  // Auto-fill amount when loan changes
  useEffect(() => {
    const loan = loans.find(l => l.id === selectedLoanId)
    if (loan && !amount) {
      setAmount(loan.installmentAmount.toString())
    }
  }, [selectedLoanId, loans])

  const selectedLoan = loans.find((l) => l.id === selectedLoanId)

  const handleSave = async (forceOverpayment = false) => {
    if (!selectedLoanId || !amount || !paymentDate) {
      setError('Please fill in all required fields')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      showAlert({
        title: 'Invalid Amount',
        message: 'The payment amount must be greater than zero.',
        type: 'warning'
      })
      return
    }

    if (selectedLoan && new Date(paymentDate) < new Date(selectedLoan.startDate)) {
      showAlert({
        title: 'Invalid Date',
        message: `The payment date cannot be before the loan's start date (${format(new Date(selectedLoan.startDate), 'MMM dd, yyyy')}).`,
        type: 'warning'
      })
      return
    }

    if (selectedLoan && amountNum > selectedLoan.remaining && !forceOverpayment) {
      const overpaid = amountNum - selectedLoan.remaining
      showAlert({
        title: 'Over-payment Detected',
        message: `This payment exceeds the remaining balance by Rs. ${overpaid.toLocaleString()}. This will be applied as a credit to future loan installments. Continue?`,
        type: 'warning',
        buttons: [
          { text: 'Adjust Amount', style: 'cancel' },
          { 
            text: 'Save as Credit', 
            style: 'default',
            onPress: () => handleSave(true) 
          }
        ]
      })
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: dbError } = await supabase.from('payments').insert({
        user_id: user?.id,
        loan_id: selectedLoanId,
        amount: parseFloat(amount),
        payment_date: format(paymentDate, 'yyyy-MM-dd'),
        payment_method: paymentMethod,
        reference_id: referenceId.trim() || null,
      })

      if (dbError) {
        setError(dbError.message)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.back()
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Record Payment</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            {/* Custom Loan Picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Loan *</Text>
              <TouchableOpacity
                style={[styles.pickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => setShowLoanPicker(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.pickerText, { color: selectedLoan ? colors.text : colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {selectedLoan
                    ? `${selectedLoan.customerName} - Remaining: ${formatCurrency(selectedLoan.remaining)}`
                    : 'Select a loan'}
                </Text>
                <ChevronDown size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Selected loan info */}
            {selectedLoan && (
              <View style={[styles.loanInfoCard, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.loanInfoText, { color: colors.primary }]}>
                  Total: {formatCurrency(selectedLoan.total)} • Remaining: {formatCurrency(selectedLoan.remaining)}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Payment Amount (Rs) *"
                  required
                  placeholder="1000"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Date *</Text>
                <TouchableOpacity
                  style={[styles.datePickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                  onPress={() => setShowDatePicker(true)}
                >
                   <Text style={{ color: colors.text }}>{format(paymentDate, 'MMM dd, yyyy')}</Text>
                   <CalendarIcon size={16} color={colors.textTertiary} />
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={paymentDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, date) => {
                      setShowDatePicker(false)
                      if (date) setPaymentDate(date)
                    }}
                  />
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Method *</Text>
                  <TouchableOpacity
                    style={[styles.pickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                    onPress={() => setShowMethodPicker(true)}
                  >
                    <Text style={{ color: colors.text }}>
                      {paymentMethod.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Text>
                    <ChevronDown size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.halfField}>
                <FormInput
                  label="Reference ID"
                  placeholder="TxnID0123"
                  value={referenceId}
                  onChangeText={setReferenceId}
                />
              </View>
            </View>

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
                onPress={() => handleSave()}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Record Payment'}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Method Picker Modal */}
      <Modal visible={showMethodPicker} transparent animationType="fade">
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
          activeOpacity={1}
          onPress={() => setShowMethodPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface, maxHeight: '40%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Method</Text>
            </View>
            <FlatList
              data={paymentMethods}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setPaymentMethod(item)
                    setShowMethodPicker(false)
                  }}
                >
                  <Text style={[styles.modalItemTitle, { color: colors.text }]}>
                    {item.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </Text>
                  {item === paymentMethod && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Loan Picker Modal */}
      <Modal visible={showLoanPicker} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select a Loan</Text>
              <TouchableOpacity onPress={() => setShowLoanPicker(false)}>
                <Text style={[styles.modalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={loans}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setSelectedLoanId(item.id)
                    setShowLoanPicker(false)
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemContent}>
                    <Text style={[styles.modalItemTitle, { color: colors.text }]}>{item.customerName}</Text>
                    <Text style={[styles.modalItemSub, { color: colors.textSecondary }]}>
                      Remaining: {formatCurrency(item.remaining)}
                    </Text>
                  </View>
                  {item.id === selectedLoanId && <Check size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 300 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  formCard: { borderRadius: 16, padding: 20, borderWidth: 1 },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerText: { fontSize: 15, flex: 1 },
  loanInfoCard: { padding: 12, borderRadius: 10, marginBottom: 16 },
  loanInfoText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  errorBox: { padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '500' },
  datePickerTrigger: {
    height: 48,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: '600' },
  saveButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { fontSize: 16, fontWeight: '600' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  modalItemContent: { flex: 1 },
  modalItemTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  modalItemSub: { fontSize: 13 },
})
