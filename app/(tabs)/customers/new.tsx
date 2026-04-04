import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { useAlert } from '@/src/context/AlertContext'
import { supabase } from '@/src/lib/supabase'
import FormInput from '@/src/components/FormInput'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import { ArrowLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

export default function NewCustomerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditMode = !!id
  const { colors } = useTheme()
  const { user } = useAuth()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [nicNumber, setNicNumber] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEditMode) {
      fetchCustomer()
    }
  }, [id])

  const fetchCustomer = async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (dbError) throw dbError

      if (data) {
        setName(data.name || '')
        setPhone(data.phone || '')
        setNicNumber(data.nic_number || '')
        setEmergencyPhone(data.emergency_phone || '')
        setNotes(data.notes || '')
      }
    } catch (err: any) {
      showAlert({
        title: 'Error',
        message: 'Failed to load customer data',
        type: 'error'
      })
      router.navigate('/(tabs)/customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const payload = {
        user_id: user?.id,
        name: name.trim(),
        phone: phone.trim() || null,
        nic_number: nicNumber.trim() || null,
        emergency_phone: emergencyPhone.trim() || null,
        notes: notes.trim() || null,
      }

      const { error: dbError } = isEditMode
        ? await supabase.from('customers').update(payload).eq('id', id)
        : await supabase.from('customers').insert(payload)

      if (dbError) {
        setError(dbError.message)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        router.navigate('/(tabs)/customers')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading customer data..." />

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
            <TouchableOpacity onPress={() => router.navigate('/(tabs)/customers')} style={[styles.backButton, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>
              {isEditMode ? 'Edit Customer' : 'Add New Customer'}
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <FormInput
              label="Full Name *"
              required
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <View style={styles.row}>
              <View style={styles.halfField}>
                <FormInput
                  label="Phone Number"
                  placeholder="+94 77 123 4567"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.halfField}>
                <FormInput
                  label="NIC / ID Number"
                  placeholder="199012345678"
                  value={nicNumber}
                  onChangeText={setNicNumber}
                />
              </View>
            </View>

            <FormInput
              label="Emergency Contact"
              placeholder="Spouse / Parent Phone"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
            />

            <FormInput
              label="Notes / Address"
              placeholder="Home address or additional details"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => router.navigate('/(tabs)/customers')}
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
                <Text style={styles.saveText}>
                  {saving ? 'Saving...' : isEditMode ? 'Update Customer' : 'Save Customer'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  errorBox: { padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '500' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: '600' },
  saveButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
