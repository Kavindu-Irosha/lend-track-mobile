import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useSettings } from '@/src/context/SettingsContext'
import { ArrowLeft, Briefcase, Percent, Calendar, Wallet, Clock } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

export default function BusinessSettingsScreen() {
  const { colors, isDark } = useTheme()
  const { settings, updateSetting } = useSettings()
  const router = useRouter()

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).springify()} style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={[st.backButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: colors.text }]}>Business Defaults</Text>
          <Text style={[st.headerSub, { color: colors.textTertiary }]}>Pre-filled values for new loans</Text>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Default Interest Rate */}
        <Animated.View entering={FadeInDown.delay(50).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <Percent size={16} color="#f59e0b" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Default Interest Rate</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={st.inputGroup}>
              <Text style={[st.inputLabel, { color: colors.textSecondary }]}>Rate (%)</Text>
              <Text style={[st.inputHint, { color: colors.textTertiary }]}>Pre-filled when creating a new loan. You can always override per-loan.</Text>
              <TextInput
                style={[st.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                value={settings.defaultInterestRate}
                onChangeText={(v) => updateSetting('defaultInterestRate', v)}
                placeholder="10"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </Animated.View>

        {/* Default Installment Type */}
        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <Calendar size={16} color="#f59e0b" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Default Schedule</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[st.inputHint, { color: colors.textTertiary, paddingHorizontal: 16, paddingTop: 16 }]}>Default installment type for new loans</Text>
            <View style={st.chipRow}>
              {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[st.chip, { backgroundColor: settings.defaultInstallmentType === type ? colors.primary : isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => { Haptics.selectionAsync(); updateSetting('defaultInstallmentType', type) }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: settings.defaultInstallmentType === type ? '#fff' : colors.textSecondary, fontSize: 14, fontWeight: '700', textTransform: 'capitalize' }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Currency */}
        <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <Wallet size={16} color="#f59e0b" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Currency Symbol</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[st.inputHint, { color: colors.textTertiary, paddingHorizontal: 16, paddingTop: 16 }]}>Symbol shown in all monetary displays</Text>
            <View style={st.chipRow}>
              {(['Rs', 'LKR', '$'] as const).map((cur) => (
                <TouchableOpacity
                  key={cur}
                  style={[st.chip, { backgroundColor: settings.defaultCurrency === cur ? colors.primary : isDark ? '#1e293b' : '#f1f5f9' }]}
                  onPress={() => { Haptics.selectionAsync(); updateSetting('defaultCurrency', cur) }}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: settings.defaultCurrency === cur ? '#fff' : colors.textSecondary, fontSize: 14, fontWeight: '700' }}>{cur}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Penalty Grace Days */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
              <Clock size={16} color="#f59e0b" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Penalty Grace Period</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={st.inputGroup}>
              <Text style={[st.inputLabel, { color: colors.textSecondary }]}>Grace Days</Text>
              <Text style={[st.inputHint, { color: colors.textTertiary }]}>Number of days after due date before penalty fee activates.</Text>
              <TextInput
                style={[st.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                value={settings.penaltyGraceDays}
                onChangeText={(v) => updateSetting('penaltyGraceDays', v)}
                placeholder="3"
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
              />
            </View>
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
  inputGroup: { padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  inputHint: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  input: { height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, fontWeight: '700' },

  chipRow: { flexDirection: 'row', gap: 10, padding: 16, paddingTop: 12 },
  chip: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
})
