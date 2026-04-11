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
  Image,
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'

import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { useAlert } from '@/src/context/AlertContext'
import { supabase } from '@/src/lib/supabase'
import FormInput from '@/src/components/FormInput'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import { ArrowLeft, Camera, Image as ImageIcon, X, User, Phone, CreditCard, Shield, FileText, AlertCircle, Check } from 'lucide-react-native'
import { triggerHapticNotification, NotificationType } from '@/src/lib/utils'

export default function NewCustomerScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const isEditMode = !!id
  const { colors, isDark } = useTheme()
  const { user } = useAuth()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [nicNumber, setNicNumber] = useState('')
  const [emergencyPhone, setEmergencyPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [idImageFrontUri, setIdImageFrontUri] = useState<string | null>(null)
  const [idImageFrontBase64, setIdImageFrontBase64] = useState<string | null>(null)
  const [existingIdFrontUrl, setExistingIdFrontUrl] = useState<string | null>(null)

  const [idImageBackUri, setIdImageBackUri] = useState<string | null>(null)
  const [idImageBackBase64, setIdImageBackBase64] = useState<string | null>(null)
  const [existingIdBackUrl, setExistingIdBackUrl] = useState<string | null>(null)

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
        setExistingIdFrontUrl(data.id_card_url || null)
        setExistingIdBackUrl(data.id_card_back_url || null)
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

  const pickImage = async (useCamera = false, side: 'front' | 'back') => {
    try {
      let result;
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      };

      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (permission.status !== 'granted') {
          showAlert({ title: 'Permission Required', message: 'Camera access is required to take ID photos.', type: 'warning' });
          return;
        }
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permission.status !== 'granted') {
          showAlert({ title: 'Permission Required', message: 'Gallery access is required to select ID photos.', type: 'warning' });
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets[0]) {
        if (side === 'front') {
          setIdImageFrontUri(result.assets[0].uri);
          setIdImageFrontBase64(result.assets[0].base64 || null);
        } else {
          setIdImageBackUri(result.assets[0].uri);
          setIdImageBackBase64(result.assets[0].base64 || null);
        }
      }
    } catch (error: any) {
      showAlert({ title: 'Image Error', message: error.message || 'Failed to capture image', type: 'error' });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }

    const hasFront = idImageFrontBase64 || existingIdFrontUrl;
    const hasBack = idImageBackBase64 || existingIdBackUrl;

    if (!hasFront || !hasBack) {
      setError('Strict Mode: Both Front and Back of the Identity Document are required to save.')
      return
    }

    setSaving(true)
    setError('')

    try {
      let finalIdCardFrontUrl = existingIdFrontUrl;
      let finalIdCardBackUrl = existingIdBackUrl;

      // Handle Front Image Upload
      if (idImageFrontBase64 && user) {
        const fileName = `front_${Date.now()}.jpg`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('customer_ids')
          .upload(filePath, decode(idImageFrontBase64), { contentType: 'image/jpeg' });

        if (uploadError) throw new Error(`Front image upload failed: ${uploadError.message}`);
        finalIdCardFrontUrl = filePath;
      }

      // Handle Back Image Upload
      if (idImageBackBase64 && user) {
        const fileName = `back_${Date.now()}.jpg`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('customer_ids')
          .upload(filePath, decode(idImageBackBase64), { contentType: 'image/jpeg' });

        if (uploadError) throw new Error(`Back image upload failed: ${uploadError.message}`);
        finalIdCardBackUrl = filePath;
      }

      const payload = {
        user_id: user?.id,
        name: name.trim(),
        phone: phone.trim() || null,
        nic_number: nicNumber.trim() || null,
        emergency_phone: emergencyPhone.trim() || null,
        notes: notes.trim() || null,
        id_card_url: finalIdCardFrontUrl,
        id_card_back_url: finalIdCardBackUrl,
      }

      const { error: dbError } = isEditMode
        ? await supabase.from('customers').update(payload).eq('id', id)
        : await supabase.from('customers').insert(payload)

      if (dbError) {
        setError(dbError.message)
        triggerHapticNotification(NotificationType.Error)
      } else {
        triggerHapticNotification(NotificationType.Success)
        router.navigate('/(tabs)/customers')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingSpinner message="Loading customer data..." />

  const hasFrontImage = idImageFrontUri || existingIdFrontUrl
  const hasBackImage = idImageBackUri || existingIdBackUrl

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Premium Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/customers')} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} activeOpacity={0.7}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {isEditMode ? 'Edit Customer' : 'New Customer'}
            </Text>
            <Text style={[styles.headerSub, { color: colors.textTertiary }]}>
              {isEditMode ? 'Update client details' : 'Register a new client profile'}
            </Text>
          </View>
        </Animated.View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Section: Personal Information */}
          <Animated.View entering={FadeInDown.delay(50).duration(400).springify()}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <User size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
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
            </View>
          </Animated.View>

          {/* Section: Identity Verification */}
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <Shield size={16} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Identity Verification</Text>
                <Text style={[styles.sectionSub, { color: colors.textTertiary }]}>Front & Back required</Text>
              </View>
              {hasFrontImage && hasBackImage && (
                <View style={[styles.verifiedBadge, { backgroundColor: 'rgba(16,185,129,0.1)' }]}>
                  <Check size={12} color="#10b981" />
                  <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '700' }}>Verified</Text>
                </View>
              )}
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              {/* Front & Back side-by-side */}
              <View style={styles.idRow}>
                {/* Front Side */}
                <View style={styles.idHalf}>
                  <Text style={[styles.idLabel, { color: colors.textSecondary }]}>Front Side</Text>
                  {hasFrontImage ? (
                    <View style={[styles.idPreview, { borderColor: colors.cardBorder }]}>
                      <Image
                        source={{ uri: idImageFrontUri || (existingIdFrontUrl ? 'https://via.placeholder.com/150?text=Stored+ID' : '') }}
                        style={styles.idImage}
                      />
                      <TouchableOpacity
                        style={styles.idRemove}
                        onPress={() => { setIdImageFrontUri(null); setIdImageFrontBase64(null); setExistingIdFrontUrl(null); }}
                      >
                        <X size={14} color="#fff" />
                      </TouchableOpacity>
                      <View style={[styles.idCheckBadge, { backgroundColor: '#10b981' }]}>
                        <Check size={10} color="#fff" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.idActions}>
                      <TouchableOpacity style={[styles.idBtn, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.cardBorder }]} onPress={() => pickImage(true, 'front')}>
                        <Camera size={18} color={colors.primary} />
                        <Text style={[styles.idBtnText, { color: colors.textSecondary }]}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.idBtn, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.cardBorder }]} onPress={() => pickImage(false, 'front')}>
                        <ImageIcon size={18} color={colors.primary} />
                        <Text style={[styles.idBtnText, { color: colors.textSecondary }]}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Back Side */}
                <View style={styles.idHalf}>
                  <Text style={[styles.idLabel, { color: colors.textSecondary }]}>Back Side</Text>
                  {hasBackImage ? (
                    <View style={[styles.idPreview, { borderColor: colors.cardBorder }]}>
                      <Image
                        source={{ uri: idImageBackUri || (existingIdBackUrl ? 'https://via.placeholder.com/150?text=Stored+ID' : '') }}
                        style={styles.idImage}
                      />
                      <TouchableOpacity
                        style={styles.idRemove}
                        onPress={() => { setIdImageBackUri(null); setIdImageBackBase64(null); setExistingIdBackUrl(null); }}
                      >
                        <X size={14} color="#fff" />
                      </TouchableOpacity>
                      <View style={[styles.idCheckBadge, { backgroundColor: '#10b981' }]}>
                        <Check size={10} color="#fff" />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.idActions}>
                      <TouchableOpacity style={[styles.idBtn, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.cardBorder }]} onPress={() => pickImage(true, 'back')}>
                        <Camera size={18} color={colors.primary} />
                        <Text style={[styles.idBtnText, { color: colors.textSecondary }]}>Camera</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.idBtn, { backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderColor: colors.cardBorder }]} onPress={() => pickImage(false, 'back')}>
                        <ImageIcon size={18} color={colors.primary} />
                        <Text style={[styles.idBtnText, { color: colors.textSecondary }]}>Gallery</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Section: Additional Details */}
          <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
                <FileText size={16} color="#8b5cf6" />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Additional Details</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder, paddingBottom: 40 }]}>
              <FormInput
                label="Notes / Address"
                placeholder="Home address or additional details"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, textAlignVertical: 'top' }}
              />
            </View>
          </Animated.View>

          {/* Error Display */}
          {error ? (
            <Animated.View entering={FadeInDown.duration(300)} style={[styles.errorBox, { backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2' }]}>
              <AlertCircle size={16} color="#ef4444" />
              <Text style={[styles.errorText, { color: '#ef4444' }]}>{error}</Text>
            </Animated.View>
          ) : null}

          {/* Actions */}
          <Animated.View entering={FadeInUp.delay(200).duration(400).springify()} style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => router.navigate('/(tabs)/customers')}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveText}>
                {saving ? 'Saving...' : isEditMode ? 'Update Profile' : 'Save Customer'}
              </Text>
              {/*{!saving && <Check size={18} color="#fff" />}*/}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  sectionSub: { fontSize: 11, marginTop: 1 },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },

  card: { borderRadius: 20, padding: 20, borderWidth: 1, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  // ID Verification
  idRow: { flexDirection: 'row', gap: 12 },
  idHalf: { flex: 1 },
  idLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  idPreview: { width: '100%', height: 120, borderRadius: 14, overflow: 'hidden', borderWidth: 1 },
  idImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  idRemove: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  idCheckBadge: { position: 'absolute', bottom: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  idActions: { gap: 8 },
  idBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderWidth: 1, borderRadius: 12, borderStyle: 'dashed' },
  idBtnText: { fontSize: 12, fontWeight: '600' },

  // Error
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, marginTop: 12 },
  errorText: { fontSize: 13, fontWeight: '600', flex: 1 },

  // Actions
  actions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: { flex: 0.4, paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cancelText: { fontSize: 15, fontWeight: '700' },
  saveButton: { flex: 0.6, flexDirection: 'row', paddingVertical: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})
