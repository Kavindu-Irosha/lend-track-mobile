import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { ArrowLeft, Calculator, Percent, Clock, CircleDollarSign, Check } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { calculateInterestAmount, calculateEMI, InterestType } from '@/src/lib/financial'
import { formatCurrency, triggerHapticImpact, ImpactStyle } from '@/src/lib/utils'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'

export default function CalculatorScreen() {
  const { colors, isDark } = useTheme()
  const router = useRouter()
  
  const [amount, setAmount] = useState('100000')
  const [interestRate, setInterestRate] = useState('10')
  const [tenure, setTenure] = useState('12')
  const [interestType, setInterestType] = useState<InterestType>('percent')
  const [model, setModel] = useState<'flat' | 'reducing'>('reducing')

  const results = useMemo(() => {
    const p = parseFloat(amount) || 0
    const r = parseFloat(interestRate) || 0
    const t = parseInt(tenure) || 1

    let totalInterest = 0
    let emi = 0

    if (model === 'reducing') {
      emi = calculateEMI(p, r, t)
      totalInterest = (emi * t) - p
    } else {
      totalInterest = calculateInterestAmount(p, r, interestType, t, 'monthly')
      emi = (p + totalInterest) / t
    }

    return {
      emi,
      totalInterest,
      totalPayable: p + totalInterest
    }
  }, [amount, interestRate, tenure, interestType, model])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Loan Calculator</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Result Card */}
          <Animated.View entering={FadeInDown.duration(500).springify()}>
            <View style={[styles.resultCard, { backgroundColor: colors.primary }]}>
              <View style={styles.glow} />
              <Text style={styles.resultLabel}>Monthly Installment</Text>
              <Text style={styles.resultValue}>{formatCurrency(results.emi)}</Text>
              
              <View style={styles.divider} />
              
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Interest</Text>
                  <Text style={styles.statValue}>{formatCurrency(results.totalInterest)}</Text>
                </View>
                <View style={styles.vertDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Payable</Text>
                  <Text style={styles.statValue}>{formatCurrency(results.totalPayable)}</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Model Switcher */}
          <View style={[styles.modelSwitcher, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
            <TouchableOpacity 
              onPress={() => { triggerHapticImpact(ImpactStyle.Light); setModel('reducing') }} 
              style={[styles.modelBtn, model === 'reducing' && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.modelBtnText, { color: model === 'reducing' ? '#fff' : colors.textSecondary }]}>Reducing (EMI)</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => { triggerHapticImpact(ImpactStyle.Light); setModel('flat') }} 
              style={[styles.modelBtn, model === 'flat' && { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.modelBtnText, { color: model === 'flat' ? '#fff' : colors.textSecondary }]}>Flat Interest</Text>
            </TouchableOpacity>
          </View>

          {/* Inputs */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Principal Amount</Text>
              <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                <CircleDollarSign size={18} color={colors.primary} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Interest Rate (%)</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Percent size={18} color={colors.primary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={interestRate}
                    onChangeText={setInterestRate}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>
              <View style={{ width: 16 }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Tenure (Months)</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
                  <Clock size={18} color={colors.primary} />
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={tenure}
                    onChangeText={setTenure}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={colors.textTertiary}
                  />
                </View>
              </View>
            </View>

            {model === 'flat' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Interest Type</Text>
                <View style={[styles.typeSwitcher, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                  <TouchableOpacity 
                    onPress={() => setInterestType('percent')} 
                    style={[styles.typeBtn, interestType === 'percent' && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.typeBtnText, { color: interestType === 'percent' ? '#fff' : colors.textSecondary }]}>Percentage (%)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setInterestType('flat')} 
                    style={[styles.typeBtn, interestType === 'flat' && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[styles.typeBtnText, { color: interestType === 'flat' ? '#fff' : colors.textSecondary }]}>Fixed Amount (Rs)</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff' }]}>
            <Calculator size={16} color="#3b82f6" />
            <Text style={[styles.infoText, { color: isDark ? '#93c5fd' : '#1e40af' }]}>
              {model === 'reducing' 
                ? "Reducing balance calculates interest on the remaining principal, common for bank loans." 
                : "Flat interest calculates interest on the total principal for the entire duration."}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  // Result Card
  resultCard: { borderRadius: 24, padding: 24, marginBottom: 24, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  glow: { position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: '#fff', opacity: 0.1 },
  resultLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  resultValue: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 8, letterSpacing: -1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  statItem: { flex: 1 },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', marginBottom: 4 },
  statValue: { color: '#fff', fontSize: 16, fontWeight: '800' },
  vertDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 20 },

  // Model Switcher
  modelSwitcher: { flexDirection: 'row', padding: 4, borderRadius: 14, marginBottom: 24 },
  modelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  modelBtnText: { fontSize: 14, fontWeight: '700' },

  // Form
  form: { gap: 20 },
  inputGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: '600' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  input: { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row' },

  // Type Switcher
  typeSwitcher: { flexDirection: 'row', padding: 4, borderRadius: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  typeBtnText: { fontSize: 12, fontWeight: '700' },

  // Info Card
  infoCard: { flexDirection: 'row', padding: 16, borderRadius: 16, gap: 12, marginTop: 32 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '500', lineHeight: 18 }
})
