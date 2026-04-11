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
import Animated, { 
  FadeInDown, 
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { supabase } from '@/src/lib/supabase'

import FormInput from '@/src/components/FormInput'
import { ArrowLeft, ChevronDown, Check, Calendar as CalendarIcon, CreditCard, Wallet, User, Clock } from 'lucide-react-native'
import { format } from 'date-fns'
import { formatCurrency, triggerHapticImpact, triggerHapticNotification, ImpactStyle, NotificationType } from '@/src/lib/utils'
import { useAlert } from '@/src/context/AlertContext'
import DateTimePicker from '@react-native-community/datetimepicker'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { FileText, Share2, ArrowRight } from 'lucide-react-native'

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
  const { colors, isDark } = useTheme()
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
  const [successData, setSuccessData] = useState<{ amount: number; customer: string } | null>(null)
  
  // Animation logic
  const successScale = useSharedValue(0)
  const animatedCheckmark = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }]
  }))

  useEffect(() => {
    if (successData) {
      successScale.value = withSequence(
        withSpring(1.2),
        withSpring(1)
      )
    }
  }, [successData])

  const paymentMethods = ['cash', 'bank_transfer', 'ez_cash', 'other']
  const methodLabels: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    ez_cash: 'eZ Cash',
    other: 'Other'
  }

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

  useEffect(() => {
    const loan = loans.find(l => l.id === selectedLoanId)
    if (loan && !amount) {
      setAmount(loan.installmentAmount.toString())
    }
  }, [selectedLoanId, loans])

  const selectedLoan = loans.find((l) => l.id === selectedLoanId)

  const handleSave = async () => {
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

    if (amountNum > 100000000) {
      showAlert({
        title: 'Security Limit Exceeded',
        message: 'Single payments cannot exceed the 100,000,000 processing limit.',
        type: 'error'
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

    if (selectedLoan && amountNum > selectedLoan.remaining) {
      const overpaid = amountNum - selectedLoan.remaining
      showAlert({
        title: 'Invalid Transaction',
        message: `This payment exceeds the remaining balance by Rs. ${overpaid.toLocaleString()}. You cannot pay more than the outstanding debt.`,
        type: 'error'
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
        triggerHapticNotification(NotificationType.Error)
      } else {
        triggerHapticNotification(NotificationType.Success)
        setSuccessData({
          amount: amountNum,
          customer: selectedLoan?.customerName || 'Customer'
        })
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const generateReceipt = async () => {
    if (!successData) return
    triggerHapticImpact(ImpactStyle.Light)
    
    const html = `
      <html>
        <head>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
            .header { text-align: center; margin-bottom: 50px; position: relative; border-bottom: 2px solid #f3f4f6; padding-bottom: 30px; }
            .logo { font-size: 32px; font-weight: 900; color: #6366f1; margin: 0; letter-spacing: -1px; }
            .subtitle { font-size: 13px; color: #9ca3af; text-transform: uppercase; letter-spacing: 2px; margin-top: 8px; font-weight: 600; }
            
            .badge-container { border: 4px solid #10b981; border-radius: 12px; padding: 8px 24px; display: inline-block; transform: rotate(-12deg); position: absolute; right: 10px; top: -10px; background: #fff; }
            .badge-text { color: #10b981; font-weight: 950; font-size: 28px; margin: 0; }
            
            .card { background: #fff; border-radius: 24px; padding: 40px; border: 1px solid #f3f4f6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
            .table { width: 100%; border-collapse: collapse; }
            .table-row { border-bottom: 1px solid #f3f4f6; }
            .table-row:last-child { border-bottom: none; }
            .label { padding: 20px 0; color: #9ca3af; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
            .value { padding: 20px 0; text-align: right; color: #111827; font-weight: 700; font-size: 17px; }
            
            .amount-box { text-align: center; margin-top: 40px; padding-top: 40px; border-top: 2px dashed #f3f4f6; }
            .amount-label { color: #9ca3af; font-size: 12px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; }
            .amount-val { font-size: 48px; font-weight: 900; color: #111827; margin: 0; }
            
            .footer { text-align: center; margin-top: 80px; color: #d1d5db; font-size: 12px; font-weight: 500; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="badge-container"><p class="badge-text">PAID</p></div>
            <h1 class="logo">LendTrack</h1>
            <p class="subtitle">Official Payment Receipt</p>
          </div>
          
          <div class="card">
            <table class="table">
              <tr class="table-row">
                <td class="label">Receipt Date</td>
                <td class="value">${format(new Date(), 'MMMM dd, yyyy')}</td>
              </tr>
              <tr class="table-row">
                <td class="label">Received From</td>
                <td class="value">${successData.customer}</td>
              </tr>
              <tr class="table-row">
                <td class="label">Payment Method</td>
                <td class="value">${methodLabels[paymentMethod]}</td>
              </tr>
              <tr class="table-row">
                <td class="label">Reference ID</td>
                <td class="value" style="font-family: monospace; font-size: 14px;">${referenceId}</td>
              </tr>
            </table>
            <div class="amount-box">
              <p class="amount-label">Total Amount Paid</p>
              <p class="amount-val">${formatCurrency(successData.amount)}</p>
            </div>
          </div>
          <p class="footer">Thank you for your payment. This is a computer-generated receipt and proof of transaction.</p>
        </body>
      </html>
    `
    try {
      const { uri } = await Print.printToFileAsync({ html })
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' })
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {!successData && (
          <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Record Payment</Text>
              <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Collect & log a repayment</Text>
            </View>
          </Animated.View>
        )}

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {successData ? (
            /* ===== SUCCESS SCREEN ===== */
            <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.successContainer}>
              <View style={[styles.successCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                <Animated.View style={[styles.successIcon, { backgroundColor: '#10b981' }, animatedCheckmark]}>
                  <Check size={36} color="#fff" />
                </Animated.View>
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Payment Recorded!</Text>
              <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                {formatCurrency(successData.amount)} received from {successData.customer}
              </Text>

              {/* Receipt Summary */}
              <View style={[styles.receiptCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textTertiary }]}>Amount</Text>
                  <Text style={[styles.receiptValue, { color: '#10b981' }]}>{formatCurrency(successData.amount)}</Text>
                </View>
                <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textTertiary }]}>Method</Text>
                  <Text style={[styles.receiptValue, { color: colors.text }]}>{methodLabels[paymentMethod]}</Text>
                </View>
                <View style={[styles.receiptDivider, { backgroundColor: colors.border }]} />
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: colors.textTertiary }]}>Reference</Text>
                  <Text style={[styles.receiptValue, { color: colors.text, fontSize: 13 }]}>{referenceId}</Text>
                </View>
              </View>

              <View style={styles.successActions}>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.primary }]} onPress={generateReceipt}>
                  <Share2 size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>Share Receipt PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={() => router.replace('/(tabs)/payments')}>
                  <Text style={[styles.doneButtonText, { color: colors.text }]}>Back to Payments</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <>
              {/* Loan Selector Card */}
              <Animated.View entering={FadeInDown.delay(50).duration(400).springify()}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <CreditCard size={16} color={colors.primary} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Select Loan</Text>
                </View>

                <TouchableOpacity
                  style={[styles.loanSelector, { backgroundColor: colors.surface, borderColor: selectedLoan ? colors.primary : colors.cardBorder }]}
                  onPress={() => setShowLoanPicker(true)}
                  activeOpacity={0.8}
                >
                  {selectedLoan ? (
                    <View style={styles.loanSelected}>
                      <View style={[styles.loanAvatar, { backgroundColor: `${colors.primary}15` }]}>
                        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>
                          {selectedLoan.customerName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.loanName, { color: colors.text }]}>{selectedLoan.customerName}</Text>
                        <Text style={[styles.loanInfo, { color: colors.textTertiary }]}>
                          Remaining: {formatCurrency(selectedLoan.remaining)}
                        </Text>
                      </View>
                      <ChevronDown size={18} color={colors.textTertiary} />
                    </View>
                  ) : (
                    <View style={styles.loanPlaceholder}>
                      <User size={18} color={colors.textTertiary} />
                      <Text style={[styles.loanPlaceholderText, { color: colors.textTertiary }]}>Select a loan to collect</Text>
                      <ChevronDown size={18} color={colors.textTertiary} />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Selected Loan Quick Stats */}
                {selectedLoan && (
                  <Animated.View entering={FadeInDown.duration(300)} style={styles.quickStats}>
                    <View style={[styles.qsCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.12)' : '#eff6ff' }]}>
                      <Text style={[styles.qsValue, { color: isDark ? '#93c5fd' : '#1e40af' }]}>{formatCurrency(selectedLoan.total)}</Text>
                      <Text style={[styles.qsLabel, { color: '#3b82f6' }]}>Total</Text>
                    </View>
                    <View style={[styles.qsCard, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2' }]}>
                      <Text style={[styles.qsValue, { color: isDark ? '#fca5a5' : '#991b1b' }]}>{formatCurrency(selectedLoan.remaining)}</Text>
                      <Text style={[styles.qsLabel, { color: '#ef4444' }]}>Due</Text>
                    </View>
                    <View style={[styles.qsCard, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : '#ecfdf5' }]}>
                      <Text style={[styles.qsValue, { color: isDark ? '#6ee7b7' : '#065f46' }]}>{formatCurrency(selectedLoan.installmentAmount)}</Text>
                      <Text style={[styles.qsLabel, { color: '#10b981' }]}>EMI</Text>
                    </View>
                  </Animated.View>
                )}
              </Animated.View>

              {/* Payment Details */}
              <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                    <Wallet size={16} color="#10b981" />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Details</Text>
                </View>

                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <FormInput
                        label="Amount (Rs) *"
                        required
                        placeholder="1000"
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.halfField}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Date *</Text>
                      <TouchableOpacity
                        style={[styles.datePickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                        onPress={() => setShowDatePicker(true)}
                      >
                         <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>{format(paymentDate, 'MMM dd, yyyy')}</Text>
                         <CalendarIcon size={16} color={colors.primary} />
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
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Method *</Text>
                      <TouchableOpacity
                        style={[styles.pickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                        onPress={() => setShowMethodPicker(true)}
                      >
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: '500' }}>
                          {methodLabels[paymentMethod]}
                        </Text>
                        <ChevronDown size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
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
                </View>
              </Animated.View>

              {error ? (
                <Animated.View entering={FadeInDown.duration(300)} style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' }]}>
                  <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
                </Animated.View>
              ) : null}

              {/* Footer Actions */}
              <Animated.View entering={FadeInUp.delay(150).duration(400).springify()} style={styles.actions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: '#10b981', opacity: saving ? 0.6 : 1 }]}
                  onPress={() => handleSave()}
                  disabled={saving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveText}>{saving ? 'Processing...' : 'Record Payment'}</Text>
                  {!saving && <Check size={18} color="#fff" />}
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Method Picker Modal */}
      <Modal visible={showMethodPicker} transparent animationType="fade">
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          activeOpacity={1}
          onPress={() => setShowMethodPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Payment Method</Text>
              <TouchableOpacity onPress={() => setShowMethodPicker(false)} style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
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
                  <Text style={[styles.modalItemTitle, { color: colors.text }]}>{methodLabels[item]}</Text>
                  {item === paymentMethod && (
                    <View style={[styles.modalCheck, { backgroundColor: colors.primary }]}>
                      <Check size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Loan Picker Modal */}
      <Modal visible={showLoanPicker} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Loan</Text>
              <TouchableOpacity onPress={() => setShowLoanPicker(false)} style={[styles.modalCloseBtn, { backgroundColor: colors.background }]}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={loans}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border, backgroundColor: item.id === selectedLoanId ? `${colors.primary}08` : 'transparent' }]}
                  onPress={() => {
                    triggerHapticImpact(ImpactStyle.Light)
                    setSelectedLoanId(item.id)
                    setShowLoanPicker(false)
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalItemContent}>
                    <View style={[styles.modalAvatar, { backgroundColor: `${colors.primary}15` }]}>
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 14 }}>
                        {item.customerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalItemTitle, { color: colors.text }]}>{item.customerName}</Text>
                      <Text style={[styles.modalItemSub, { color: colors.textTertiary }]}>
                        Remaining: {formatCurrency(item.remaining)}
                      </Text>
                    </View>
                  </View>
                  {item.id === selectedLoanId && (
                    <View style={[styles.modalCheck, { backgroundColor: colors.primary }]}>
                      <Check size={14} color="#fff" />
                    </View>
                  )}
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
  scrollContent: { padding: 16, paddingBottom: 120 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  // Loan Selector
  loanSelector: { borderRadius: 18, borderWidth: 1.5, padding: 16, marginBottom: 12 },
  loanSelected: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  loanAvatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  loanName: { fontSize: 16, fontWeight: '700' },
  loanInfo: { fontSize: 13, marginTop: 2 },
  loanPlaceholder: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  loanPlaceholderText: { flex: 1, fontSize: 15 },

  // Quick Stats
  quickStats: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  qsCard: { flex: 1, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 14, alignItems: 'center' },
  qsValue: { fontSize: 14, fontWeight: '800', letterSpacing: -0.3 },
  qsLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },

  // Card
  card: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  fieldLabel: { fontSize: 14, fontWeight: '500', marginBottom: 6 },
  pickerTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, height: 48, marginBottom: 16 },
  datePickerTrigger: { height: 48, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, marginBottom: 16 },

  // Error
  errorBox: { padding: 14, borderRadius: 14, marginTop: 12 },
  errorText: { fontSize: 13, fontWeight: '600' },

  // Actions
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: { flex: 0.35, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cancelText: { fontSize: 15, fontWeight: '700' },
  saveButton: { flex: 0.65, flexDirection: 'row', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 34 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalCloseBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10 },
  modalClose: { fontSize: 14, fontWeight: '600' },
  modalItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  modalItemContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  modalAvatar: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalItemTitle: { fontSize: 15, fontWeight: '600' },
  modalItemSub: { fontSize: 12, marginTop: 2 },
  modalCheck: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  // Success
  successContainer: { alignItems: 'center', paddingTop: 40 },
  successCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  successSub: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  receiptCard: { width: '100%', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 32 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  receiptLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  receiptValue: { fontSize: 16, fontWeight: '800' },
  receiptDivider: { height: 1 },
  successActions: { width: '100%', gap: 12 },
  shareButton: { padding: 18, borderRadius: 16, flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  doneButton: { padding: 18, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1 },
  doneButtonText: { fontSize: 15, fontWeight: '700' },
})
