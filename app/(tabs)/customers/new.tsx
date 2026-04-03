import React, { useState } from 'react'
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
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { supabase } from '@/src/lib/supabase'
import FormInput from '@/src/components/FormInput'
import { ArrowLeft } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

export default function NewCustomerScreen() {
  const { colors } = useTheme()
  const { user } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setError('')

    try {
      const { error: dbError } = await supabase.from('customers').insert({
        user_id: user?.id,
        name: name.trim(),
        phone: phone.trim() || null,
        notes: notes.trim() || null,
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
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Add New Customer</Text>
          </View>

          {/* Form */}
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <FormInput
              label="Full Name"
              required
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <FormInput
              label="Phone Number"
              placeholder="+94 77 123 4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <FormInput
              label="Notes"
              placeholder="Address, NIC, or other details"
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
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Customer'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  errorBox: { padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { fontSize: 13, fontWeight: '500' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  cancelButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10, borderWidth: 1 },
  cancelText: { fontSize: 14, fontWeight: '600' },
  saveButton: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
