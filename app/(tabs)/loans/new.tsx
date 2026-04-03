import React, { useCallback, useState } from 'react'
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { supabase } from '@/src/lib/supabase'
import FormInput from '@/src/components/FormInput'
import { ArrowLeft, ChevronDown, Check } from 'lucide-react-native'
import { format } from 'date-fns'
import * as Haptics from 'expo-haptics'

export default function NewLoanScreen() {
  const { customer_id } = useLocalSearchParams<{ customer_id?: string }>()
  const { colors } = useTheme()
  const { user } = useAuth()
  const router = useRouter()

  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [customerId, setCustomerId] = useState(customer_id || '')
  const [amount, setAmount] = useState('')
  const [interest, setInterest] = useState('0')
  const [installmentType, setInstallmentType] = useState('monthly')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showCustomerPicker, setShowCustomerPicker] = useState(false)

  useFocusEffect(
    useCallback(() => {
      async function fetchCustomers() {
        const { data } = await supabase.from('customers').select('id, name').order('name')
        setCustomers(data || [])
        if (customer_id) setCustomerId(customer_id)
      }
      fetchCustomers()
    }, [customer_id])
  )

  const selectedCustomer = customers.find((c) => c.id === customerId)

  const handleSave = async () => {
    if (!customerId || !amount || !startDate || !dueDate) {
      setError('Please fill in all required fields')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: dbError } = await supabase.from('loans').insert({
        user_id: user?.id,
        customer_id: customerId,
        amount: parseFloat(amount),
        interest: parseFloat(interest) || 0,
        installment_type: installmentType,
        start_date: startDate,
        due_date: dueDate,
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Create New Loan</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            {/* Customer Picker */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Customer *</Text>
              <TouchableOpacity
                style={[styles.pickerTrigger, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                onPress={() => setShowCustomerPicker(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.pickerText, { color: selectedCustomer ? colors.text : colors.textTertiary }]}
                  numberOfLines={1}
                >
                  {selectedCustomer ? selectedCustomer.name : 'Select a customer'}
                </Text>
                <ChevronDown size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Loan Amount (Rs)"
                  required
                  placeholder="10000"
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  label="Interest (Rs)"
                  placeholder="0"
                  value={interest}
                  onChangeText={setInterest}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Installment Type */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Installment Type *</Text>
              <View style={styles.segmentedControl}>
                {['daily', 'weekly', 'monthly'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: installmentType === type ? colors.primary : colors.inputBg,
                        borderColor: installmentType === type ? colors.primary : colors.inputBorder,
                      },
                    ]}
                    onPress={() => setInstallmentType(type)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.segmentText,
                        { color: installmentType === type ? '#fff' : colors.textSecondary },
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Start Date"
                  required
                  placeholder="YYYY-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  label="Due Date"
                  required
                  placeholder="YYYY-MM-DD"
                  value={dueDate}
                  onChangeText={setDueDate}
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
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Create Loan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Customer Picker Modal */}
      <Modal visible={showCustomerPicker} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowCustomerPicker(false)}>
                <Text style={[styles.modalClose, { color: colors.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    setCustomerId(item.id)
                    setShowCustomerPicker(false)
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modalItemTitle, { color: colors.text }]}>{item.name}</Text>
                  {item.id === customerId && <Check size={20} color={colors.primary} />}
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
  scrollContent: { padding: 16 },
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
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  segmentedControl: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '600' },
  errorBox: { padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '500' },
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
  modalItemTitle: { fontSize: 15, fontWeight: '500' },
})
