import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useSettings } from '@/src/context/SettingsContext'
import { ArrowLeft, Bell, Clock, Calendar, Hash, AlertTriangle } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

function ToggleRow({ label, sub, value, onToggle, iconColor, isDark, colors }: any) {
  return (
    <View style={st.toggleRow}>
      <View style={{ flex: 1 }}>
        <Text style={[st.rowLabel, { color: colors.text }]}>{label}</Text>
        {sub && <Text style={[st.rowSub, { color: colors.textTertiary }]}>{sub}</Text>}
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

export default function NotificationsSettingsScreen() {
  const { colors, isDark } = useTheme()
  const { settings, updateSetting } = useSettings()
  const router = useRouter()

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={[st.backButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: colors.text }]}>Notifications</Text>
          <Text style={[st.headerSub, { color: colors.textTertiary }]}>Alerts & reminders</Text>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Overdue Alerts */}
        <Animated.View entering={FadeInDown.delay(50).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
              <AlertTriangle size={16} color="#ef4444" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Overdue Alerts</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <ToggleRow
              label="Enable Overdue Alerts"
              sub="Show alert badges when loans exceed due date"
              value={settings.overdueAlerts}
              onToggle={(v: boolean) => updateSetting('overdueAlerts', v)}
              iconColor="#ef4444"
              isDark={isDark}
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* Payment Reminders */}
        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <Bell size={16} color="#3b82f6" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Payment Reminders</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <ToggleRow
              label="Auto Reminders"
              sub="Alert before installment is due"
              value={settings.paymentReminders}
              onToggle={(v: boolean) => updateSetting('paymentReminders', v)}
              iconColor="#3b82f6"
              isDark={isDark}
              colors={colors}
            />
            {settings.paymentReminders && (
              <>
                <View style={[st.divider, { backgroundColor: colors.border }]} />
                <View style={st.inputGroup}>
                  <Text style={[st.inputLabel, { color: colors.textSecondary }]}>Days Before Due Date</Text>
                  <Text style={[st.inputHint, { color: colors.textTertiary }]}>How many days in advance to send a reminder</Text>
                  <View style={st.chipRow}>
                    {['1', '2', '3', '7'].map((d) => (
                      <TouchableOpacity
                        key={d}
                        style={[st.chip, { backgroundColor: settings.reminderDaysBefore === d ? '#3b82f6' : isDark ? '#1e293b' : '#f1f5f9' }]}
                        onPress={() => { Haptics.selectionAsync(); updateSetting('reminderDaysBefore', d) }}
                        activeOpacity={0.8}
                      >
                        <Text style={{ color: settings.reminderDaysBefore === d ? '#fff' : colors.textSecondary, fontSize: 14, fontWeight: '700' }}>{d}d</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>

        {/* Daily Summary */}
        <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <Hash size={16} color="#10b981" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Daily Summary</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <ToggleRow
              label="Morning Digest"
              sub="Summary of today's expected collections"
              value={settings.dailySummary}
              onToggle={(v: boolean) => updateSetting('dailySummary', v)}
              iconColor="#10b981"
              isDark={isDark}
              colors={colors}
            />
          </View>
        </Animated.View>

        {/* Info callout */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <View style={[st.infoBox, { backgroundColor: isDark ? 'rgba(59,130,246,0.1)' : '#eff6ff' }]}>
            <Bell size={14} color="#3b82f6" />
            <Text style={[st.infoText, { color: '#3b82f6' }]}>
              Notification preferences are saved locally and applied immediately across the app.
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
  divider: { height: 1, marginLeft: 16 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  customSwitch: { width: 48, height: 28, borderRadius: 14, padding: 4, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },

  inputGroup: { padding: 16, paddingTop: 12 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  inputHint: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  chipRow: { flexDirection: 'row', gap: 10 },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },

  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 14, marginTop: 4 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, fontWeight: '600' },
})
