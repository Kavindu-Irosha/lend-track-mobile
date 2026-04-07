import React, { useCallback, useEffect, useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  FlatList,
  TextInput,
} from 'react-native'
import Animated, {
  FadeInRight,
  FadeOutLeft,
  Layout,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  SlideInLeft,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withSequence,
} from 'react-native-reanimated'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { supabase } from '@/src/lib/supabase'
import FormInput from '@/src/components/FormInput'
import {
  ArrowLeft,
  ChevronDown,
  Check,
  Calculator,
  Calendar as CalendarIcon,
  User,
  ArrowRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  Shield
} from 'lucide-react-native'
import { format } from 'date-fns'
import * as Haptics from 'expo-haptics'
import { useAlert } from '@/src/context/AlertContext'
import DateTimePicker from '@react-native-community/datetimepicker'
import { calculateInterestAmount, calculateDueDate, InterestType, PenaltyType, calculateEMI } from '@/src/lib/financial'
import { formatCurrency } from '@/src/lib/utils'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'

type WizardStep = 1 | 2 | 3

export default function NewLoanScreen() {
  const { customer_id } = useLocalSearchParams<{ customer_id?: string }>()
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const { showAlert, showToast } = useAlert()
  const router = useRouter()

  // Wizard State
  const [step, setStep] = useState<WizardStep>(1)

  // Form State
  const [customers, setCustomers] = useState<{ id: string; name: string; phone?: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [customerId, setCustomerId] = useState(customer_id || '')
  const [amount, setAmount] = useState('')
  const [interestType, setInterestType] = useState<InterestType>('flat')
  const [interestValue, setInterestValue] = useState('0')
  const [interestModel, setInterestModel] = useState<'flat' | 'reducing'>('flat')
  const [tenure, setTenure] = useState('1')
  const [installmentType, setInstallmentType] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [startDate, setStartDate] = useState(new Date())
  const [dueDate, setDueDate] = useState(new Date())
  const [penaltyEnabled, setPenaltyEnabled] = useState(false)
  const [penaltyType, setPenaltyType] = useState<PenaltyType>('fixed')
  const [penaltyValue, setPenaltyValue] = useState('0')
  const [collateralDetails, setCollateralDetails] = useState('')
  const [purpose, setPurpose] = useState('')
  const [saving, setSaving] = useState(false)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [successData, setSuccessData] = useState<{ id: string; customer: string; amount: number } | null>(null)

  // Calculations
  const calculatedInterest = useMemo(() => {
    if (interestModel === 'reducing') {
      const emi = calculateEMI(parseFloat(amount) || 0, parseFloat(interestValue) || 0, parseInt(tenure) || 1)
      return (emi * (parseInt(tenure) || 1)) - (parseFloat(amount) || 0)
    }
    return calculateInterestAmount(
      parseFloat(amount) || 0,
      parseFloat(interestValue) || 0,
      interestType
    )
  }, [amount, interestValue, interestType, interestModel, tenure])

  const totalPayable = (parseFloat(amount) || 0) + calculatedInterest
  const installmentAmount = Math.ceil(totalPayable / (parseInt(tenure) || 1))

  useEffect(() => {
    if (amount && tenure && installmentType) {
      const newDueDate = calculateDueDate(startDate, installmentType, parseInt(tenure) || 0)
      setDueDate(new Date(newDueDate))
    }
  }, [startDate, tenure, installmentType, amount])

  useFocusEffect(
    useCallback(() => {
      async function fetchCustomers() {
        const { data } = await supabase.from('customers').select('id, name, phone').order('name')
        setCustomers(data || [])
        if (customer_id) setCustomerId(customer_id)
      }
      fetchCustomers()
    }, [customer_id])
  )

  const selectedCustomer = customers.find((c) => c.id === customerId)
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery)
  )

  const nextStep = () => {
    if (step === 1 && !customerId) {
      showToast({ message: 'Select a borrower.', type: 'warning' })
      return
    }
    if (step === 2 && (!amount || isNaN(Number(amount)) || Number(amount) <= 0)) {
      showToast({ message: 'Enter a valid amount.', type: 'warning' })
      return
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setStep((prev) => (prev + 1) as WizardStep)
  }

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setStep((prev) => (prev - 1) as WizardStep)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error: dbError } = await supabase.from('loans').insert({
        user_id: user?.id,
        customer_id: customerId,
        amount: parseFloat(amount),
        interest: calculatedInterest,
        interest_model: interestModel,
        interest_type: interestType,
        interest_rate: parseFloat(interestValue) || 0,
        installment_type: installmentType,
        start_date: format(startDate, 'yyyy-MM-dd'),
        due_date: format(dueDate, 'yyyy-MM-dd'),
        penalty_enabled: penaltyEnabled,
        penalty_type: penaltyType,
        penalty_value: parseFloat(penaltyValue) || 0,
        collateral_details: collateralDetails.trim() || null,
        purpose: purpose.trim() || null,
      })

      if (dbError) throw dbError

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      setSuccessData({
        id: Math.random().toString(36).substring(2, 9).toUpperCase(),
        customer: selectedCustomer?.name || 'Customer',
        amount: parseFloat(amount)
      })
    } catch (err: any) {
      showAlert({ title: 'Error', message: err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const generateLoanSummary = async () => {
    if (!successData) return
    const html = `
      <html>
        <head>
          <style>
            body { font-family: -apple-system, system-ui, sans-serif; padding: 40px; color: #1f2937; line-height: 1.5; }
            .header { border-bottom: 4px solid #6366f1; padding-bottom: 20px; margin-bottom: 30px; position: relative; }
            .logo { font-size: 28px; font-weight: 900; color: #6366f1; margin: 0; }
            .title { font-size: 20px; font-weight: 700; color: #111827; margin-top: 4px; }
            
            .badge-container { border: 2px solid #6366f1; border-radius: 8px; padding: 4px 12px; display: inline-block; transform: rotate(-8deg); position: absolute; right: 0; top: 0; }
            .badge-text { color: #6366f1; font-weight: 900; font-size: 16px; margin: 0; }
            
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; margin-top: 40px; }
            .info-box h3 { font-size: 10px; color: #9ca3af; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 1px; }
            .info-box p { margin: 0; font-size: 16px; font-weight: 700; }
            
            .summary { margin-top: 50px; background: #f9fafb; padding: 30px; border-radius: 20px; border: 1px solid #e5e7eb; }
            .summary-label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; }
            .summary-value { font-size: 32px; font-weight: 900; color: #6366f1; }
            
            .footer { margin-top: 80px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px solid #eee; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="badge-container"><p class="badge-text">OFFICIAL</p></div>
            <p class="logo">LendTrack</p>
            <h1 class="title">Loan Issuance Summary</h1>
            <p style="color: #6b7280; font-size: 13px;">Generated on ${format(new Date(), 'PPP')}</p>
          </div>
          
          <div class="info-grid">
            <div class="info-box">
              <h3>Borrower Information</h3>
              <p>${successData.customer}</p>
            </div>
            <div class="info-box" style="text-align: right;">
              <h3>Reference ID</h3>
              <p>${successData.id}</p>
            </div>
          </div>

          <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
             <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
               <span style="color: #6b7280;">Principal Amount:</span>
               <span style="font-weight: 600;">${formatCurrency(successData.amount)}</span>
             </div>
             <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
               <span style="color: #6b7280;">Interest Model:</span>
               <span style="font-weight: 600;">${interestModel.toUpperCase()}</span>
             </div>
             <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
               <span style="color: #6b7280;">Installment Schedule:</span>
               <span style="font-weight: 600;">${installmentType.toUpperCase()}</span>
             </div>
             <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
               <span style="color: #6b7280;">Accrued Interest:</span>
               <span style="font-weight: 600;">${formatCurrency(calculatedInterest)}</span>
             </div>
          </div>
          
          <div class="summary">
            <p class="summary-label">Total Outstanding Commitment</p>
            <p class="summary-value">${formatCurrency(totalPayable)}</p>
          </div>
          
          <div class="footer">
            <p>This document serves as an electronic record of the loan agreement. Please retain for your records.</p>
          </div>
        </body>
      </html>
    `
    const { uri } = await Print.printToFileAsync({ html })
    await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => successData ? router.dismissAll() : (step > 1 ? prevStep() : router.back())} style={[styles.backButton, { backgroundColor: colors.surface }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>New Loan Issue</Text>
            {!successData && <Text style={[styles.stepText, { color: colors.textTertiary }]}>Step {step} of 3</Text>}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {successData ? (
            <Animated.View entering={FadeInDown} style={styles.successContainer}>
              <View style={[styles.successIcon, { backgroundColor: colors.successBg }]}><Check size={40} color={colors.success} /></View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Loan Issued!</Text>

              <View style={styles.successActions}>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.primary }]} onPress={generateLoanSummary}>
                  <Share2 size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>Share Summary</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.doneButton, { backgroundColor: '#2b2f33ff' }]} onPress={() => router.replace('/(tabs)/loans')}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
                </TouchableOpacity>

              </View>
            </Animated.View>
          ) : (
            <>
              {step === 1 && (
                <Animated.View
                  entering={FadeInRight.duration(300)}
                  exiting={FadeOutLeft.duration(200)}
                  style={styles.stepContainer}
                >
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Select Borrower</Text>
                  <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <TextInput
                      placeholder="Search borrower..."
                      placeholderTextColor={isDark ? "#FFFFFF" : "#888"}
                      style={[styles.searchInput, { color: colors.text }]}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>

                  <View style={styles.customerList}>
                    {filteredCustomers.map((item, index) => (
                      <Animated.View 
                        key={item.id} 
                        entering={FadeInDown.delay(index * 50).duration(300)}
                      >
                        <TouchableOpacity
                          style={[styles.customerItem, { backgroundColor: colors.surface, borderColor: customerId === item.id ? colors.primary : colors.cardBorder }]}
                          onPress={() => setCustomerId(item.id)}
                        >
                          <View style={styles.customerRow}>
                            <View style={[styles.avatar, { backgroundColor: colors.primaryBg }]}>
                              <User size={18} color={colors.primary} />
                            </View>
                            <Text style={[styles.customerNameText, { color: colors.text }]}>{item.name}</Text>
                          </View>
                          {customerId === item.id && <CheckCircle2 size={24} color={colors.primary} />}
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                </Animated.View>
              )}

              {step === 2 && (
                <Animated.View
                  entering={FadeInRight.duration(300)}
                  exiting={FadeOutLeft.duration(200)}
                  style={styles.stepContainer}
                >
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Loan Terms</Text>

                  <View style={styles.liveCalculationCard}>
                    <View style={[styles.calcBox, { backgroundColor: colors.primaryBg }]}>
                      <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>EMI Installment</Text>
                      <Text style={{ fontSize: 24, fontWeight: '800', color: colors.primary }}>{formatCurrency(installmentAmount)}</Text>
                    </View>
                  </View>

                  <Animated.View entering={FadeInDown.duration(300)}>
                    <View style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Interest Model</Text>
                        <View style={[styles.toggleContainer, { backgroundColor: colors.inputBg }]}>
                          <TouchableOpacity onPress={() => setInterestModel('flat')} style={[styles.toggle, interestModel === 'flat' && { backgroundColor: colors.primary }]}><Text style={{ color: interestModel === 'flat' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>Flat</Text></TouchableOpacity>
                          <TouchableOpacity onPress={() => setInterestModel('reducing')} style={[styles.toggle, interestModel === 'reducing' && { backgroundColor: colors.primary }]}><Text style={{ color: interestModel === 'reducing' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>EMI (Reducing)</Text></TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(300)}>
                    <FormInput label="Principal Amount (Rs)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
                  </Animated.View>

                  <View style={styles.row}>
                    <View style={{ flex: 1.2 }}>
                      <FormInput label={`Rate (${interestType === 'flat' ? 'Rs' : '%'})`} value={interestValue} onChangeText={setInterestValue} keyboardType="decimal-pad" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
                      <View style={[styles.toggleContainer, { backgroundColor: colors.inputBg }]}>
                        <TouchableOpacity onPress={() => setInterestType('flat')} style={[styles.toggle, interestType === 'flat' && { backgroundColor: colors.primary }]}><Text style={{ color: interestType === 'flat' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>Rs</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setInterestType('percent')} style={[styles.toggle, interestType === 'percent' && { backgroundColor: colors.primary }]}><Text style={{ color: interestType === 'percent' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>%</Text></TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <Animated.View entering={FadeInDown.duration(300)}>
                    <FormInput label="Tenure (Installments)" value={tenure} onChangeText={setTenure} keyboardType="number-pad" />
                  </Animated.View>

                  <View style={styles.sectionDivider} />

                  <Animated.View entering={FadeInUp.duration(300)}>
                    <View style={styles.penaltyHeader}>
                      <Text style={[styles.sectionTitleSmall, { color: colors.text }]}>Enable Penalty?</Text>
                      <TouchableOpacity onPress={() => setPenaltyEnabled(!penaltyEnabled)} style={[styles.checkbox, { backgroundColor: penaltyEnabled ? colors.primary : 'transparent', borderColor: colors.primary }]}>
                        {penaltyEnabled && <Check size={12} color="#fff" />}
                      </TouchableOpacity>
                    </View>
                  </Animated.View>

                  {penaltyEnabled && (
                    <Animated.View entering={FadeInDown.duration(200)} layout={Layout.duration(200)} style={styles.penaltyBody}>
                      <View style={styles.row}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.label, { color: colors.textSecondary }]}>Penalty Mode</Text>
                          <View style={[styles.toggleContainer, { backgroundColor: colors.inputBg }]}>
                            <TouchableOpacity onPress={() => setPenaltyType('fixed')} style={[styles.toggle, penaltyType === 'fixed' && { backgroundColor: colors.primary }]}><Text style={{ color: penaltyType === 'fixed' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>One-time</Text></TouchableOpacity>
                            <TouchableOpacity onPress={() => setPenaltyType('daily')} style={[styles.toggle, penaltyType === 'daily' && { backgroundColor: colors.primary }]}><Text style={{ color: penaltyType === 'daily' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>Daily</Text></TouchableOpacity>
                          </View>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <FormInput label="Price / %" value={penaltyValue} onChangeText={setPenaltyValue} keyboardType="decimal-pad" />
                        </View>
                      </View>
                      <Text style={styles.finePrint}>* Late after 3-day grace period</Text>
                    </Animated.View>
                  )}

                  <Animated.View entering={FadeInDown.duration(300)} layout={Layout.duration(200)}>
                    <View style={styles.sectionDivider} />
                    <FormInput label="Collateral / Asset Description" value={collateralDetails} onChangeText={setCollateralDetails} multiline />
                  </Animated.View>
                </Animated.View>
              )}

              {step === 3 && (
                <Animated.View
                  entering={FadeInRight.duration(300)}
                  exiting={FadeOutLeft.duration(200)}
                  style={styles.stepContainer}
                >
                  <Text style={[styles.stepTitle, { color: colors.text }]}>Confirmation</Text>

                  <Animated.View entering={FadeInDown.duration(300)}>
                    <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                      <View style={styles.reviewRow}>
                        <User size={16} color={colors.textTertiary} />
                        <Text style={{ color: colors.textSecondary, flex: 1 }}>Borrower</Text>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>{selectedCustomer?.name}</Text>
                      </View>
                      <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.reviewRow}>
                        <Clock size={16} color={colors.textTertiary} />
                        <Text style={{ color: colors.textSecondary, flex: 1 }}>Total Payable</Text>
                        <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 16 }}>{formatCurrency(totalPayable)}</Text>
                      </View>
                    </View>
                  </Animated.View>

                  <Animated.View entering={FadeInDown.duration(300)} style={{ marginTop: 24 }}>
                    <FormInput label="Administrative Note" value={purpose} onChangeText={setPurpose} placeholder="Internal tracking details..." multiline />
                  </Animated.View>
                </Animated.View>
              )}
            </>
          )}
        </ScrollView>

        {!successData && (
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.nextButton, { backgroundColor: step === 3 ? colors.success : colors.primary }]} onPress={step === 3 ? handleSave : nextStep}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>{saving ? '...Saving' : (step === 3 ? 'Confirm & Issue' : 'Next')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { padding: 10, borderRadius: 10 },
  title: { fontSize: 20, fontWeight: '800' },
  stepText: { fontSize: 12 },
  scrollContent: { padding: 16 },
  stepTitle: { fontSize: 22, fontWeight: '800', marginBottom: 20 },
  searchInput: { flex: 1, padding: 12, borderRadius: 12, fontSize: 15, fontWeight: '500' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  customerList: { gap: 10 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  customerNameText: { fontSize: 16, fontWeight: '600' },
  customerItem: { padding: 12, borderRadius: 16, borderWidth: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveCalculationCard: { marginBottom: 24 },
  calcBox: { padding: 20, borderRadius: 20, alignItems: 'center' },
  row: { flexDirection: 'row', marginBottom: 24, alignItems: 'flex-start' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  toggleContainer: { flexDirection: 'row', height: 48, borderRadius: 10, padding: 4 },
  toggle: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  sectionDivider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 24 },
  penaltyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleSmall: { fontSize: 16, fontWeight: '700' },
  checkbox: { width: 28, height: 28, borderWidth: 2, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  penaltyBody: { marginTop: 16, gap: 16 },
  finePrint: { fontSize: 12, color: '#9ca3af', marginTop: 4, fontStyle: 'italic' },
  reviewCard: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 16 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewDivider: { height: 1 },
  footer: { padding: 16, marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  nextButton: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  successContainer: { alignItems: 'center', padding: 20, marginTop: 40 },
  successIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '800', marginBottom: 20 },
  shareButton: { padding: 18, borderRadius: 16, flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  shareButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  doneButton: { padding: 18, borderRadius: 16, width: '100%', alignItems: 'center', marginBottom: 8 },
  goToLoansButton: { padding: 18, width: '100%', borderRadius: 16, alignItems: 'center' },
  successActions: { width: '100%', gap: 8, marginTop: 10 },
  stepContainer: { flex: 1 },
})
