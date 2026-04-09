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
  Shield,
  CreditCard,
  Wallet,
  Percent,
  FileText
} from 'lucide-react-native'
import { format } from 'date-fns'
import * as Haptics from 'expo-haptics'
import { useAlert } from '@/src/context/AlertContext'
import DateTimePicker from '@react-native-community/datetimepicker'
import { calculateInterestAmount, calculateDueDate, InterestType, PenaltyType, calculateEMI } from '@/src/lib/financial'
import { formatCurrency } from '@/src/lib/utils'
import { useSettings } from '@/src/context/SettingsContext'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'

type WizardStep = 1 | 2 | 3

export default function NewLoanScreen() {
  const { customer_id } = useLocalSearchParams<{ customer_id?: string }>()
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const { showAlert, showToast } = useAlert()
  const router = useRouter()

  const { settings } = useSettings()

  // Wizard State
  const [step, setStep] = useState<WizardStep>(1)

  // Form State
  const [customers, setCustomers] = useState<{ id: string; name: string; phone?: string }[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [customerId, setCustomerId] = useState(customer_id || '')
  const [amount, setAmount] = useState('')
  const [interestType, setInterestType] = useState<InterestType>('flat')
  const [interestValue, setInterestValue] = useState(settings.defaultInterestRate || '0')
  const [interestModel, setInterestModel] = useState<'flat' | 'reducing'>('flat')
  const [tenure, setTenure] = useState('1')
  const [installmentType, setInstallmentType] = useState<'daily' | 'weekly' | 'monthly'>(settings.defaultInstallmentType || 'monthly')
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
    if (step === 2) {
      const numAmount = Number(amount)
      if (!amount || isNaN(numAmount) || numAmount <= 0) {
        showToast({ message: 'Enter a valid positive amount.', type: 'warning' })
        return
      }
      if (numAmount > 100000000) {
        showToast({ message: 'Amount exceeds maximum allowed limit.', type: 'error' })
        return
      }
      const numInterest = Number(interestValue)
      if (isNaN(numInterest) || numInterest < 0) {
        showToast({ message: 'Interest must be a valid positive number.', type: 'warning' })
        return
      }
      if (interestType === 'percent' && numInterest > 100) {
        showToast({ message: 'Interest rate cannot exceed 100%.', type: 'error' })
        return
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setStep((prev) => (prev + 1) as WizardStep)
  }

  const prevStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setStep((prev) => (prev - 1) as WizardStep)
  }

  const handleSave = async () => {
    // Final Security Pass
    const now = new Date()
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(now.getFullYear() - 1)

    if (startDate < oneYearAgo) {
      showAlert({ title: 'Invalid Date', message: 'Start date cannot be older than 1 year.', type: 'error' })
      return
    }
    if (dueDate <= startDate) {
      showAlert({ title: 'Invalid Date', message: 'Due date must be after the start date.', type: 'error' })
      return
    }

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

  // Step indicator
  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepDotRow}>
          <View style={[
            styles.stepDot,
            { backgroundColor: step >= s ? colors.primary : isDark ? '#334155' : '#e2e8f0' }
          ]}>
            {step > s ? (
              <Check size={12} color="#fff" />
            ) : (
              <Text style={[styles.stepDotText, { color: step >= s ? '#fff' : colors.textTertiary }]}>{s}</Text>
            )}
          </View>
          {s < 3 && (
            <View style={[styles.stepLine, { backgroundColor: step > s ? colors.primary : isDark ? '#334155' : '#e2e8f0' }]} />
          )}
        </View>
      ))}
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        
        {/* Premium Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => successData ? router.dismissAll() : (step > 1 ? prevStep() : router.back())} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {successData ? 'Success' : step === 1 ? 'Select Borrower' : step === 2 ? 'Loan Terms' : 'Review & Confirm'}
            </Text>
            {!successData && (
              <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Step {step} of 3</Text>
            )}
          </View>
        </View>

        {/* Progress Steps */}
        {!successData && renderStepIndicator()}

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {successData ? (
            /* ===== SUCCESS SCREEN ===== */
            <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.successContainer}>
              <View style={[styles.successCircle, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                <View style={[styles.successIcon, { backgroundColor: '#10b981' }]}>
                  <Check size={36} color="#fff" />
                </View>
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Loan Issued!</Text>
              <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                {formatCurrency(totalPayable)} issued to {successData.customer}
              </Text>

              {/* Quick Summary Card */}
              <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <View style={styles.successRow}>
                  <Text style={[styles.successLabel, { color: colors.textTertiary }]}>Principal</Text>
                  <Text style={[styles.successValue, { color: colors.text }]}>{formatCurrency(successData.amount)}</Text>
                </View>
                <View style={[styles.successDivider, { backgroundColor: colors.border }]} />
                <View style={styles.successRow}>
                  <Text style={[styles.successLabel, { color: colors.textTertiary }]}>Interest</Text>
                  <Text style={[styles.successValue, { color: '#f59e0b' }]}>{formatCurrency(calculatedInterest)}</Text>
                </View>
                <View style={[styles.successDivider, { backgroundColor: colors.border }]} />
                <View style={styles.successRow}>
                  <Text style={[styles.successLabel, { color: colors.textTertiary }]}>Total Payable</Text>
                  <Text style={[styles.successValue, { color: colors.primary, fontSize: 18 }]}>{formatCurrency(totalPayable)}</Text>
                </View>
              </View>

              <View style={styles.successActions}>
                <TouchableOpacity style={[styles.shareButton, { backgroundColor: colors.primary }]} onPress={generateLoanSummary}>
                  <Share2 size={18} color="#fff" />
                  <Text style={styles.shareButtonText}>Share Summary PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.doneButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} onPress={() => router.replace('/(tabs)/loans')}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15 }}>Back to Loans</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <>
              {/* ===== STEP 1: SELECT BORROWER ===== */}
              {step === 1 && (
                <Animated.View
                  entering={FadeInRight.duration(300)}
                  exiting={FadeOutLeft.duration(200)}
                  style={styles.stepContainer}
                >
                  <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                    <User size={18} color={colors.textTertiary} />
                    <TextInput
                      placeholder="Search borrower by name or phone..."
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.searchInput, { color: colors.text }]}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                    />
                  </View>

                  {selectedCustomer && (
                    <Animated.View entering={FadeInDown.duration(300)} style={[styles.selectedBanner, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
                      <View style={[styles.selectedAvatar, { backgroundColor: colors.primary }]}>
                        <Text style={styles.selectedAvatarText}>{selectedCustomer.name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.selectedName, { color: colors.text }]}>{selectedCustomer.name}</Text>
                        <Text style={[styles.selectedPhone, { color: colors.textSecondary }]}>Selected Borrower</Text>
                      </View>
                      <CheckCircle2 size={24} color={colors.primary} />
                    </Animated.View>
                  )}

                  <Text style={[styles.listLabel, { color: colors.textTertiary }]}>
                    {filteredCustomers.length} client{filteredCustomers.length !== 1 ? 's' : ''} available
                  </Text>

                  <View style={styles.customerList}>
                    {filteredCustomers.map((item, index) => (
                      <Animated.View 
                        key={item.id} 
                        entering={FadeInDown.delay(index * 40).duration(300)}
                      >
                        <TouchableOpacity
                          style={[
                            styles.customerItem, 
                            { 
                              backgroundColor: customerId === item.id ? `${colors.primary}08` : colors.surface, 
                              borderColor: customerId === item.id ? colors.primary : colors.cardBorder 
                            }
                          ]}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCustomerId(item.id) }}
                          activeOpacity={0.8}
                        >
                          <View style={styles.customerRow}>
                            <View style={[styles.avatar, { backgroundColor: `${colors.primary}15` }]}>
                              <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 16 }}>
                                {item.name.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View>
                              <Text style={[styles.customerNameText, { color: colors.text }]}>{item.name}</Text>
                              {item.phone && (
                                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 2 }}>{item.phone}</Text>
                              )}
                            </View>
                          </View>
                          {customerId === item.id && (
                            <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                              <Check size={14} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </Animated.View>
                    ))}
                  </View>
                </Animated.View>
              )}

              {/* ===== STEP 2: LOAN TERMS ===== */}
              {step === 2 && (
                <Animated.View
                  entering={FadeInRight.duration(300)}
                  exiting={FadeOutLeft.duration(200)}
                  style={styles.stepContainer}
                >
                  {/* Live EMI Calculator Card */}
                  <Animated.View entering={FadeInDown.duration(400).springify()}>
                    <View style={[styles.emiCard, { backgroundColor: colors.primary }]}>
                      <View style={styles.emiGlow} />
                      <Text style={styles.emiLabel}>Installment Amount</Text>
                      <Text style={styles.emiValue}>{formatCurrency(installmentAmount)}</Text>
                      <View style={styles.emiMeta}>
                        <View style={styles.emiMetaItem}>
                          <Text style={styles.emiMetaLabel}>Interest</Text>
                          <Text style={styles.emiMetaValue}>{formatCurrency(calculatedInterest)}</Text>
                        </View>
                        <View style={[styles.emiMetaDivider]} />
                        <View style={styles.emiMetaItem}>
                          <Text style={styles.emiMetaLabel}>Total Payable</Text>
                          <Text style={styles.emiMetaValue}>{formatCurrency(totalPayable)}</Text>
                        </View>
                      </View>
                    </View>
                  </Animated.View>

                  {/* Interest Model Toggle */}
                  <Animated.View entering={FadeInDown.delay(50).duration(300)}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Interest Model</Text>
                    <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                      <TouchableOpacity onPress={() => setInterestModel('flat')} style={[styles.toggle, interestModel === 'flat' && { backgroundColor: colors.primary }]}>
                        <Text style={{ color: interestModel === 'flat' ? '#fff' : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>Flat Rate</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setInterestModel('reducing')} style={[styles.toggle, interestModel === 'reducing' && { backgroundColor: colors.primary }]}>
                        <Text style={{ color: interestModel === 'reducing' ? '#fff' : colors.textSecondary, fontWeight: '700', fontSize: 13 }}>EMI (Reducing)</Text>
                      </TouchableOpacity>
                    </View>
                  </Animated.View>

                  {/* Principal Amount */}
                  <Animated.View entering={FadeInDown.delay(80).duration(300)}>
                    <FormInput label="Principal Amount (Rs)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
                  </Animated.View>

                  {/* Interest Rate + Type */}
                  <View style={styles.row}>
                    <View style={{ flex: 1.2 }}>
                      <FormInput label={`Rate (${interestType === 'flat' ? 'Rs' : '%'})`} value={interestValue} onChangeText={setInterestValue} keyboardType="decimal-pad" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
                      <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                        <TouchableOpacity onPress={() => setInterestType('flat')} style={[styles.toggle, interestType === 'flat' && { backgroundColor: colors.primary }]}>
                          <Text style={{ color: interestType === 'flat' ? '#fff' : colors.textSecondary, fontWeight: '700' }}>Rs</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setInterestType('percent')} style={[styles.toggle, interestType === 'percent' && { backgroundColor: colors.primary }]}>
                          <Text style={{ color: interestType === 'percent' ? '#fff' : colors.textSecondary, fontWeight: '700' }}>%</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Tenure */}
                  <Animated.View entering={FadeInDown.delay(100).duration(300)}>
                    <FormInput label="Tenure (Installments)" value={tenure} onChangeText={setTenure} keyboardType="number-pad" />
                  </Animated.View>

                  {/* Penalty Section */}
                  <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />

                  <Animated.View entering={FadeInUp.duration(300)}>
                    <View style={styles.penaltyHeader}>
                      <View>
                        <Text style={[styles.penaltyTitle, { color: colors.text }]}>Late Payment Penalty</Text>
                        <Text style={{ color: colors.textTertiary, fontSize: 12 }}>Applied after 3-day grace</Text>
                      </View>
                      <TouchableOpacity 
                        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPenaltyEnabled(!penaltyEnabled) }} 
                        style={[styles.switchTrack, { backgroundColor: penaltyEnabled ? colors.primary : isDark ? '#334155' : '#cbd5e1' }]}
                      >
                        <Animated.View style={[styles.switchThumb, { transform: [{ translateX: penaltyEnabled ? 20 : 0 }] }]} />
                      </TouchableOpacity>
                    </View>
                  </Animated.View>

                  {penaltyEnabled && (
                    <Animated.View entering={FadeInDown.duration(200)} layout={Layout.duration(200)} style={styles.penaltyBody}>
                      <View style={styles.row}>
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Penalty Mode</Text>
                          <View style={[styles.toggleContainer, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                            <TouchableOpacity onPress={() => setPenaltyType('fixed')} style={[styles.toggle, penaltyType === 'fixed' && { backgroundColor: colors.primary }]}>
                              <Text style={{ color: penaltyType === 'fixed' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>One-time</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setPenaltyType('daily')} style={[styles.toggle, penaltyType === 'daily' && { backgroundColor: colors.primary }]}>
                              <Text style={{ color: penaltyType === 'daily' ? '#fff' : colors.textSecondary, fontWeight: '600' }}>Daily</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <FormInput label="Price / %" value={penaltyValue} onChangeText={setPenaltyValue} keyboardType="decimal-pad" />
                        </View>
                      </View>
                    </Animated.View>
                  )}

                  {/* Collateral */}
                  <View style={[styles.sectionDivider, { backgroundColor: colors.border }]} />
                  <Animated.View entering={FadeInDown.duration(300)} layout={Layout.duration(200)}>
                    <FormInput label="Collateral / Asset Description" value={collateralDetails} onChangeText={setCollateralDetails} multiline />
                  </Animated.View>
                </Animated.View>
              )}

              {/* ===== STEP 3: CONFIRMATION ===== */}
              {step === 3 && (
                <Animated.View
                  entering={FadeInRight.duration(300)}
                  exiting={FadeOutLeft.duration(200)}
                  style={styles.stepContainer}
                >
                  {/* Review Header */}
                  <View style={[styles.reviewHero, { backgroundColor: colors.primary }]}>
                    <View style={styles.reviewHeroGlow} />
                    <Text style={styles.reviewHeroLabel}>Total Payable Amount</Text>
                    <Text style={styles.reviewHeroValue}>{formatCurrency(totalPayable)}</Text>
                    <View style={styles.reviewHeroRow}>
                      <View style={styles.reviewHeroItem}>
                        <Text style={styles.reviewHeroItemLabel}>Principal</Text>
                        <Text style={styles.reviewHeroItemValue}>{formatCurrency(parseFloat(amount) || 0)}</Text>
                      </View>
                      <View style={styles.reviewHeroDivider} />
                      <View style={styles.reviewHeroItem}>
                        <Text style={styles.reviewHeroItemLabel}>Interest</Text>
                        <Text style={styles.reviewHeroItemValue}>{formatCurrency(calculatedInterest)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Review Details */}
                  <Animated.View entering={FadeInDown.delay(50).duration(300)}>
                    <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                      <View style={styles.reviewRow}>
                        <View style={[styles.reviewIcon, { backgroundColor: `${colors.primary}15` }]}>
                          <User size={16} color={colors.primary} />
                        </View>
                        <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Borrower</Text>
                        <Text style={[styles.reviewValue, { color: colors.text }]}>{selectedCustomer?.name}</Text>
                      </View>
                      <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.reviewRow}>
                        <View style={[styles.reviewIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                          <TrendingUp size={16} color="#f59e0b" />
                        </View>
                        <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Model</Text>
                        <Text style={[styles.reviewValue, { color: colors.text }]}>{interestModel === 'flat' ? 'Flat Rate' : 'EMI (Reducing)'}</Text>
                      </View>
                      <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.reviewRow}>
                        <View style={[styles.reviewIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                          <CalendarIcon size={16} color="#10b981" />
                        </View>
                        <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Schedule</Text>
                        <Text style={[styles.reviewValue, { color: colors.text }]}>{tenure} {installmentType} × {formatCurrency(installmentAmount)}</Text>
                      </View>
                      <View style={[styles.reviewDivider, { backgroundColor: colors.border }]} />
                      <View style={styles.reviewRow}>
                        <View style={[styles.reviewIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                          <Clock size={16} color="#ef4444" />
                        </View>
                        <Text style={[styles.reviewLabel, { color: colors.textSecondary }]}>Due Date</Text>
                        <Text style={[styles.reviewValue, { color: colors.text }]}>{format(dueDate, 'MMM d, yyyy')}</Text>
                      </View>
                    </View>
                  </Animated.View>

                  {/* Admin Note */}
                  <Animated.View entering={FadeInDown.delay(100).duration(300)} style={{ marginTop: 20 }}>
                    <FormInput label="Administrative Note (Optional)" value={purpose} onChangeText={setPurpose} placeholder="Internal tracking details..." multiline />
                  </Animated.View>

                  {/* Security Notice */}
                  <Animated.View entering={FadeInDown.delay(150).duration(300)}>
                    <View style={[styles.securityNotice, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff' }]}>
                      <Shield size={16} color="#3b82f6" />
                      <Text style={[styles.securityText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
                        This loan will be recorded and cannot be deleted while the balance is outstanding.
                      </Text>
                    </View>
                  </Animated.View>
                </Animated.View>
              )}
            </>
          )}
        </ScrollView>

        {/* Footer Button */}
        {!successData && (
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity 
              style={[
                styles.nextButton, 
                { backgroundColor: step === 3 ? '#10b981' : colors.primary },
                saving && { opacity: 0.6 }
              ]} 
              onPress={step === 3 ? handleSave : nextStep}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.nextButtonText}>
                {saving ? 'Processing...' : step === 3 ? 'Confirm & Issue Loan' : 'Continue'}
              </Text>
              {!saving && step < 3 && <ArrowRight size={18} color="#fff" />}
              {!saving && step === 3 && <Check size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Header
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },

  // Step Indicator
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 60, paddingBottom: 16 },
  stepDotRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stepDotText: { fontSize: 12, fontWeight: '800' },
  stepLine: { flex: 1, height: 3, borderRadius: 1.5, marginHorizontal: 4 },

  scrollContent: { padding: 16, paddingBottom: 32 },
  stepContainer: { flex: 1 },

  // Search
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 15, fontWeight: '500' },

  // Selected Banner
  selectedBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1.5, gap: 12, marginBottom: 16 },
  selectedAvatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  selectedAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  selectedName: { fontSize: 15, fontWeight: '700' },
  selectedPhone: { fontSize: 12, marginTop: 2 },

  listLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  customerList: { gap: 8 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  customerNameText: { fontSize: 15, fontWeight: '600' },
  customerItem: { padding: 14, borderRadius: 16, borderWidth: 1.5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  // EMI Card
  emiCard: { padding: 24, borderRadius: 24, marginBottom: 24, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  emiGlow: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: '#fff', opacity: 0.08 },
  emiLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  emiValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4, letterSpacing: -1 },
  emiMeta: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  emiMetaItem: { flex: 1 },
  emiMetaLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  emiMetaValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  emiMetaDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 16 },

  // Fields
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 24, alignItems: 'flex-start' },
  toggleContainer: { flexDirection: 'row', height: 48, borderRadius: 12, padding: 4 },
  toggle: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  sectionDivider: { height: 1, marginVertical: 24 },

  // Penalty
  penaltyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  penaltyTitle: { fontSize: 16, fontWeight: '700' },
  switchTrack: { width: 48, height: 28, borderRadius: 14, padding: 4, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  penaltyBody: { marginTop: 16, gap: 8 },

  // Review Hero
  reviewHero: { padding: 24, borderRadius: 24, marginBottom: 20, overflow: 'hidden', alignItems: 'center' },
  reviewHeroGlow: { position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: '#fff', opacity: 0.08 },
  reviewHeroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  reviewHeroValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4, letterSpacing: -1 },
  reviewHeroRow: { flexDirection: 'row', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', width: '100%' },
  reviewHeroItem: { flex: 1, alignItems: 'center' },
  reviewHeroItemLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  reviewHeroItemValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  reviewHeroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Review Card
  reviewCard: { padding: 16, borderRadius: 20, borderWidth: 1 },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  reviewIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reviewLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  reviewValue: { fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  reviewDivider: { height: 1, marginLeft: 48 },

  // Security Notice
  securityNotice: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginTop: 16 },
  securityText: { flex: 1, fontSize: 12, fontWeight: '500', lineHeight: 18 },

  // Footer
  footer: { padding: 16, borderTopWidth: 1, marginBottom: Platform.OS === 'ios' ? 20 : 0 },
  nextButton: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  nextButtonText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  // Success
  successContainer: { alignItems: 'center', paddingTop: 40 },
  successCircle: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  successTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  successSub: { fontSize: 15, textAlign: 'center', marginBottom: 32 },
  successCard: { width: '100%', padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 32 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  successLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  successValue: { fontSize: 16, fontWeight: '800' },
  successDivider: { height: 1 },
  successActions: { width: '100%', gap: 12 },
  shareButton: { padding: 18, borderRadius: 16, flexDirection: 'row', gap: 10, width: '100%', alignItems: 'center', justifyContent: 'center' },
  shareButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  doneButton: { padding: 18, borderRadius: 16, width: '100%', alignItems: 'center', borderWidth: 1 },
})
