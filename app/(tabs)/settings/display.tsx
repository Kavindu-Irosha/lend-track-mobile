import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useSettings } from '@/src/context/SettingsContext'
import { useAlert } from '@/src/context/AlertContext'
import { ArrowLeft, Sun, Moon, Smartphone, Palette, LayoutGrid, Hash, Calendar, Phone, Globe, RotateCcw, Zap, Vibrate } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

function ToggleRow({ label, sub, value, onToggle, iconColor, icon: Icon, isDark, colors }: any) {
  return (
    <View style={st.toggleRow}>
      <View style={st.toggleRowLeft}>
        <View style={[st.rowIcon, { backgroundColor: iconColor + '15' }]}>
          {Icon ? <Icon size={16} color={iconColor} /> : <View style={{ width: 16, height: 16 }} />}
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

export default function DisplaySettingsScreen() {
  const { colors, isDark, mode, setMode } = useTheme()
  const { settings, updateSetting, resetSettings } = useSettings()
  const { showAlert } = useAlert()
  const router = useRouter()

  const themeOptions: { key: 'light' | 'dark' | 'system'; label: string; icon: any; desc: string }[] = [
    { key: 'light', label: 'Light', icon: Sun, desc: 'Clean & bright' },
    { key: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on eyes' },
    { key: 'system', label: 'System', icon: Smartphone, desc: 'Follow device' },
  ]

  const handleReset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    showAlert({
      title: 'Reset All Settings',
      message: 'This will restore all preferences to factory defaults across all sections.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => { resetSettings(); setMode('system'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) } },
      ],
    })
  }

  return (
    <SafeAreaView style={[st.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View entering={FadeInDown.duration(400).springify()} style={st.header}>
        <TouchableOpacity onPress={() => router.back()} style={[st.backButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[st.headerTitle, { color: colors.text }]}>Display & Appearance</Text>
          <Text style={[st.headerSub, { color: colors.textTertiary }]}>Theme, layout & regional formats</Text>
        </View>
      </Animated.View>

      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Theme */}
        <Animated.View entering={FadeInDown.delay(50).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(236,72,153,0.15)' }]}>
              <Palette size={16} color="#ec4899" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Theme</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            {themeOptions.map((option, index) => {
              const IconComp = option.icon
              const isSelected = mode === option.key
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[st.themeRow, isSelected && { backgroundColor: isDark ? `${colors.primary}10` : `${colors.primary}06` }, index < themeOptions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  onPress={() => { Haptics.selectionAsync(); setMode(option.key) }}
                  activeOpacity={0.7}
                >
                  <View style={st.themeRowLeft}>
                    <View style={[st.themeIconContainer, { backgroundColor: isSelected ? `${colors.primary}15` : isDark ? '#334155' : '#f1f5f9' }]}>
                      <IconComp size={18} color={isSelected ? colors.primary : colors.textTertiary} />
                    </View>
                    <View>
                      <Text style={[st.themeLabel, { color: colors.text }]}>{option.label}</Text>
                      <Text style={[st.themeSub, { color: colors.textTertiary }]}>{option.desc}</Text>
                    </View>
                  </View>
                  <View style={[st.radio, { borderColor: isSelected ? colors.primary : isDark ? '#475569' : '#cbd5e1' }]}>
                    {isSelected && <View style={[st.radioInner, { backgroundColor: colors.primary }]} />}
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>

        {/* Layout */}
        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
              <LayoutGrid size={16} color="#8b5cf6" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Layout</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <ToggleRow label="Compact Mode" sub="Denser card layout for power users" value={settings.compactMode} onToggle={(v: boolean) => updateSetting('compactMode', v)} icon={LayoutGrid} iconColor="#8b5cf6" isDark={isDark} colors={colors} />
            <View style={[st.divider, { backgroundColor: colors.border }]} />
            <ToggleRow label="Show Decimals" sub="Rs. 1,000.00 vs Rs. 1,000" value={settings.showDecimals} onToggle={(v: boolean) => updateSetting('showDecimals', v)} icon={Hash} iconColor="#8b5cf6" isDark={isDark} colors={colors} />
          </View>
        </Animated.View>

        {/* Regional */}
        <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(14,165,233,0.15)' }]}>
              <Globe size={16} color="#0ea5e9" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Regional</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <View style={st.inputGroup}>
              <Text style={[st.inputLabel, { color: colors.textSecondary }]}>Date Format</Text>
              <View style={st.chipRow}>
                {[
                  { key: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                  { key: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  { key: 'YYYY-MM-DD', label: 'ISO 8601' },
                ].map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    style={[st.chip, { backgroundColor: settings.dateFormat === opt.key ? '#0ea5e9' : isDark ? '#1e293b' : '#f1f5f9' }]}
                    onPress={() => { Haptics.selectionAsync(); updateSetting('dateFormat', opt.key as any) }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: settings.dateFormat === opt.key ? '#fff' : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={[st.divider, { backgroundColor: colors.border }]} />
            <View style={st.inputGroup}>
              <Text style={[st.inputLabel, { color: colors.textSecondary }]}>Default Phone Prefix</Text>
              <Text style={[st.inputHint, { color: colors.textTertiary }]}>Country code auto-filled for new contacts</Text>
              <TextInput
                style={[st.input, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}
                value={settings.phonePrefix}
                onChangeText={(v) => updateSetting('phonePrefix', v)}
                placeholder="+94"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </Animated.View>

        {/* Performance */}
        <Animated.View entering={FadeInDown.delay(180).duration(400).springify()}>
          <View style={st.sectionHeader}>
            <View style={[st.sectionIcon, { backgroundColor: 'rgba(234,179,8,0.15)' }]}>
              <Zap size={16} color="#eab308" />
            </View>
            <Text style={[st.sectionTitle, { color: colors.text }]}>Optimization</Text>
          </View>
          <View style={[st.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <ToggleRow 
              label="Performance Mode" 
              sub="Simplify animations for low-end devices" 
              value={settings.performanceMode} 
              onToggle={(v: boolean) => updateSetting('performanceMode', v)} 
              icon={Zap} 
              iconColor="#eab308" 
              isDark={isDark} 
              colors={colors} 
            />
            <View style={[st.divider, { backgroundColor: colors.border }]} />
            <ToggleRow 
              label="Haptic Feedback" 
              sub="Physical vibration on interaction" 
              value={settings.hapticsEnabled} 
              onToggle={(v: boolean) => updateSetting('hapticsEnabled', v)} 
              icon={Vibrate} 
              iconColor="#10b981" 
              isDark={isDark} 
              colors={colors} 
            />
          </View>
        </Animated.View>

        {/* Reset */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={{ marginTop: 8 }}>
          <TouchableOpacity style={[st.resetButton, { backgroundColor: isDark ? 'rgba(245,158,11,0.1)' : '#fffbeb' }]} onPress={handleReset} activeOpacity={0.8}>
            <RotateCcw size={16} color="#f59e0b" />
            <Text style={[st.resetText, { color: '#f59e0b' }]}>Reset All Settings</Text>
          </TouchableOpacity>
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
  divider: { height: 1, marginLeft: 60 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  toggleRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  customSwitch: { width: 48, height: 28, borderRadius: 14, padding: 4, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },

  themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  themeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  themeIconContainer: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  themeLabel: { fontSize: 15, fontWeight: '600' },
  themeSub: { fontSize: 11, marginTop: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 12, height: 12, borderRadius: 6 },

  inputGroup: { padding: 16 },
  inputLabel: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  inputHint: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  input: { height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },

  resetButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 16 },
  resetText: { fontSize: 14, fontWeight: '700' },
})
