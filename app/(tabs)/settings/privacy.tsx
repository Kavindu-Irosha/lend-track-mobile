import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useSettings } from '@/src/context/SettingsContext'
import { useSecurity } from '@/src/context/SecurityContext'
import { useAlert } from '@/src/context/AlertContext'
import { ArrowLeft, Fingerprint, Eye, EyeOff, Lock, ShieldCheck, Info } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

function ToggleRow({ label, sub, value, onToggle, iconColor, icon: Icon, isDark, colors }: any) {
  return (
    <View style={st.toggleRow}>
      <View style={st.toggleRowLeft}>
        <View style={[st.rowIcon, { backgroundColor: iconColor + '15' }]}>
          <Icon size={16} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[st.rowLabel, { color: colors.text }]}>{label}</Text>
          {sub && <Text style={[st.rowSub, { color: colors.textTertiary }]}>{sub}</Text>}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggle(!value) }}
        style={[st.customSwitch, { backgroundColor: value ? iconColor : isDark ? '#334155' : '#cbd5e1' }]}
        activeOpacity={0.8}
      >
        <View style={[st.switchThumb, { transform: [{ translateX: value ? 20 : 0 }] }]} />
      </TouchableOpacity>
    </View>
  )
}

export default function PrivacySettingsScreen() {
  const { colors, isDark } = useTheme()
  const { settings, updateSetting } = useSettings()
  const { isBiometricEnabled, setBiometricEnabled, hasHardware } = useSecurity()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [biometricLoading, setBiometricLoading] = useState(false)

  const toggleBiometrics = async (val: boolean) => {
    setBiometricLoading(true)
    await setBiometricEnabled(val)
    setBiometricLoading(false)
  }

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={[st.backButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: colors.text }]}>Privacy & Security</Text>
          <Text style={[st.headerSub, { color: colors.textTertiary }]}>Protect your financial data</Text>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Biometric Lock */}
        {hasHardware && (
          <Animated.View entering={FadeInDown.delay(50).duration(400).springify()}>
            <View style={st.sectionHeader}>
              <View style={[st.sectionIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <Fingerprint size={16} color="#10b981" />
              </View>
              <Text style={[st.sectionTitle, { color: colors.text }]}>Biometric Lock</Text>
            </View>
            <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <ToggleRow
                label="Require on Launch"
                sub={`${Platform.OS === 'ios' ? 'FaceID/TouchID' : 'Fingerprint'} authentication when opening the app`}
                value={isBiometricEnabled}
                onToggle={toggleBiometrics}
                icon={Fingerprint}
                iconColor="#10b981"
                isDark={isDark}
                colors={colors}
              />
            </View>
          </Animated.View>
        )}

        {/* Data Masking */}
        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
              <EyeOff size={16} color="#8b5cf6" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Data Masking (PII)</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <ToggleRow
              label="Mask Sensitive Data"
              sub="Obscure phone numbers and NIC in customer lists"
              value={settings.dataMasking}
              onToggle={(v: boolean) => updateSetting('dataMasking', v)}
              icon={settings.dataMasking ? EyeOff : Eye}
              iconColor="#8b5cf6"
              isDark={isDark}
              colors={colors}
            />
            <View style={[st.previewBox, { backgroundColor: isDark ? '#1e293b' : '#f8fafc' }]}>
              <Text style={[st.previewLabel, { color: colors.textTertiary }]}>Preview:</Text>
              <View style={st.previewRow}>
                <Text style={[st.previewKey, { color: colors.textSecondary }]}>Phone</Text>
                <Text style={[st.previewVal, { color: colors.text }]}>{settings.dataMasking ? '+94 ••• 5678' : '+94 77 123 5678'}</Text>
              </View>
              <View style={st.previewRow}>
                <Text style={[st.previewKey, { color: colors.textSecondary }]}>NIC</Text>
                <Text style={[st.previewVal, { color: colors.text }]}>{settings.dataMasking ? '••••••5432V' : '199923105432V'}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Auto-Lock Timer */}
        <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <Lock size={16} color="#3b82f6" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Auto-Lock Timer</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[st.inputHint, { color: colors.textTertiary, paddingHorizontal: 16, paddingTop: 16 }]}>
              Automatically lock the app after a period of inactivity
            </Text>
            <View style={st.chipRow}>
              {[
                { key: 'off', label: 'Off' },
                { key: '1', label: '1 min' },
                { key: '5', label: '5 min' },
                { key: '15', label: '15 min' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.key}
                  style={[st.chip, { backgroundColor: settings.autoLockTimer === opt.key ? '#3b82f6' : isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => { Haptics.selectionAsync(); updateSetting('autoLockTimer', opt.key as any) }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: settings.autoLockTimer === opt.key ? '#fff' : colors.textSecondary, fontSize: 13, fontWeight: '700' }}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Info callout */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <View style={[st.infoBox, { backgroundColor: isDark ? 'rgba(16,185,129,0.1)' : '#ecfdf5' }]}>
            <ShieldCheck size={14} color="#10b981" />
            <Text style={[st.infoText, { color: '#10b981' }]}>
              All security settings are encrypted and stored locally on your device. No data is sent externally.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  )
}

const st = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', marginBottom: 16 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  toggleRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  customSwitch: { width: 48, height: 28, borderRadius: 14, padding: 4, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },

  previewBox: { marginHorizontal: 16, marginBottom: 16, padding: 14, borderRadius: 14, gap: 8 },
  previewLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between' },
  previewKey: { fontSize: 13, fontWeight: '500' },
  previewVal: { fontSize: 13, fontWeight: '700', fontFamily: 'monospace' },

  inputHint: { fontSize: 12, lineHeight: 18, marginBottom: 4 },
  chipRow: { flexDirection: 'row', gap: 8, padding: 16, paddingTop: 12 },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },

  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, marginTop: 4 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
})
