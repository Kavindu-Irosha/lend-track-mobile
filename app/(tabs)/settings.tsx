import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
  Modal,
} from 'react-native'
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { useAlert } from '@/src/context/AlertContext'
import {
  ArrowLeft,
  Sun,
  Moon,
  Smartphone,
  LogOut,
  ChevronRight,
  Info,
  Fingerprint,
  ShieldCheck,
  X,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { useSecurity } from '@/src/context/SecurityContext'
import { APP_VERSION, BUILD_NUMBER, CHANGELOG } from '@/src/constants/version'

export default function SettingsScreen() {
  const { colors, mode, setMode, isDark } = useTheme()
  const { user, signOut } = useAuth()
  const { isBiometricEnabled, setBiometricEnabled, hasHardware } = useSecurity()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [focusKey, setFocusKey] = useState(0)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [showChangelog, setShowChangelog] = useState(false)

  useFocusEffect(
    useCallback(() => {
      setFocusKey(prev => prev + 1)
    }, [])
  )

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    showAlert({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
            await signOut()
          },
        },
      ],
    })
  }

  const toggleBiometrics = async (val: boolean) => {
    setBiometricLoading(true)
    await setBiometricEnabled(val)
    setBiometricLoading(false)
  }

  const themeOptions: { key: 'light' | 'dark' | 'system'; label: string; icon: any }[] = [
    { key: 'light', label: 'Light', icon: Sun },
    { key: 'dark', label: 'Dark', icon: Moon },
    { key: 'system', label: 'System', icon: Smartphone },
  ]

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      <Animated.View key={focusKey} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={[styles.backButton, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          </Animated.View>

          {/* Account Section */}
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              ACCOUNT
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder },
              ]}
            >
              <View style={styles.accountRow}>
                <View
                  style={[
                    styles.avatarCircle,
                    { backgroundColor: colors.primaryBg },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={[styles.accountEmail, { color: colors.text }]}>
                    {user?.email || 'Unknown'}
                  </Text>
                  <Text style={[styles.accountSub, { color: colors.textSecondary }]}>
                    Logged in
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Appearance Section */}
          <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              APPEARANCE
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder },
              ]}
            >
              {themeOptions.map((option, index) => {
                const IconComp = option.icon
                const isSelected = mode === option.key
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.themeRow,
                      isSelected && { backgroundColor: colors.surfaceHover },
                      index < themeOptions.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync()
                      setMode(option.key)
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.themeRowLeft}>
                      <View
                        style={[
                          styles.themeIconContainer,
                          {
                            backgroundColor: isSelected
                              ? colors.primaryBg
                              : colors.surfaceHover,
                          },
                        ]}
                      >
                        <IconComp
                          size={18}
                          color={isSelected ? colors.primary : colors.textTertiary}
                        />
                      </View>
                      <Text style={[styles.themeLabel, { color: colors.text }]}>
                        {option.label}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: isSelected
                            ? colors.primary
                            : colors.inputBorder,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioInner,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>
          </Animated.View>

          {/* Security Section */}
          {hasHardware && (
            <Animated.View entering={FadeInDown.delay(250).duration(400).springify()} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
                SECURITY
              </Text>
              <View
                style={[
                  styles.card,
                  { backgroundColor: colors.surface, borderColor: colors.cardBorder },
                ]}
              >
                <View style={styles.securityRow}>
                  <View style={styles.securityRowLeft}>
                    <View style={[styles.securityIconContainer, { backgroundColor: colors.primaryBg }]}>
                      <ShieldCheck size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={[styles.securityLabel, { color: colors.text }]}>Biometric Login</Text>
                      <Text style={[styles.securitySub, { color: colors.textSecondary }]}>
                        Require {Platform.OS === 'ios' ? 'FaceID/TouchID' : 'Fingerprint'} on cold start
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isBiometricEnabled}
                    onValueChange={toggleBiometrics}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
                    disabled={biometricLoading}
                  />
                </View>
              </View>
            </Animated.View>
          )}

          {/* About section */}
          <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              ABOUT
            </Text>
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.cardBorder },
              ]}
            >
              <TouchableOpacity
                style={styles.aboutRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setShowChangelog(true)
                }}
                activeOpacity={0.7}
              >
                <View style={styles.aboutRowLeft}>
                  <Info size={18} color={colors.textTertiary} />
                  <View>
                    <Text style={[styles.aboutText, { color: colors.text }]}>Version</Text>
                    <Text style={[styles.aboutBuild, { color: colors.textTertiary }]}>Build {BUILD_NUMBER}</Text>
                  </View>
                </View>
                <View style={styles.aboutRowRight}>
                  <Text style={[styles.aboutValue, { color: colors.primary, fontWeight: '700' }]}>
                    v{APP_VERSION}
                  </Text>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* What's New Modal */}
          <Modal
            visible={showChangelog}
            transparent
            animationType="fade"
            onRequestClose={() => setShowChangelog(false)}
          >
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
              <Animated.View
                entering={FadeInUp.springify()}
                style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              >
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>What's New</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Release History & Refinements</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowChangelog(false)}
                    style={[styles.closeBtn, { backgroundColor: colors.surfaceHover }]}
                  >
                    <X size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.changelogList}
                >
                  {CHANGELOG.map((item, idx) => (
                    <Animated.View
                      key={item.version}
                      entering={FadeInDown.delay(100 + (idx * 50)).duration(400).springify()}
                      style={styles.logItem}
                    >
                      <View style={styles.logHeader}>
                        <Text style={[styles.logVersion, { color: colors.primary }]}>v{item.version}</Text>
                        <Text style={[styles.logDate, { color: colors.textTertiary }]}>{item.date}</Text>
                      </View>
                      <Text style={[styles.logTitle, { color: colors.text }]}>{item.title}</Text>
                      <View style={styles.logNotes}>
                        {item.notes.map((note, nIdx) => (
                          <View key={nIdx} style={styles.noteRow}>
                            <View style={[styles.noteDot, { backgroundColor: colors.primary }]} />
                            <Text style={[styles.noteText, { color: colors.textSecondary }]}>{note}</Text>
                          </View>
                        ))}
                      </View>
                    </Animated.View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.doneBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setShowChangelog(false)}
                >
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>

          {/* Sign Out */}
          <Animated.View entering={FadeInDown.delay(400).duration(400).springify()} style={styles.section}>
            <TouchableOpacity
              style={[
                styles.logoutButton,
                { backgroundColor: colors.errorBg, borderColor: 'transparent' },
              ]}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <LogOut size={18} color={colors.error} />
              <Text style={[styles.logoutText, { color: colors.error }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700' },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  // Account
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700' },
  accountInfo: { flex: 1 },
  accountEmail: { fontSize: 15, fontWeight: '600' },
  accountSub: { fontSize: 13, marginTop: 2 },
  // Theme
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  themeRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  themeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeLabel: { fontSize: 15, fontWeight: '500' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  // About
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aboutRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  aboutRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aboutText: { fontSize: 15, fontWeight: '600' },
  aboutBuild: { fontSize: 11, marginTop: 1 },
  aboutValue: { fontSize: 15 },
  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  logoutText: { fontSize: 15, fontWeight: '600' },
  // Security
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  securityRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  securityIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityLabel: { fontSize: 15, fontWeight: '600' },
  securitySub: { fontSize: 12, marginTop: 2 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '80%', borderRadius: 24, borderWidth: 1, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalSubtitle: { fontSize: 14, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  changelogList: { paddingBottom: 20 },
  logItem: { marginBottom: 24 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  logVersion: { fontSize: 14, fontWeight: '800', backgroundColor: '#6366f115', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  logDate: { fontSize: 12, fontWeight: '600' },
  logTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  logNotes: { gap: 8 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noteDot: { width: 4, height: 4, borderRadius: 2, marginTop: 8 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 18 },
  doneBtn: { marginTop: 20, paddingVertical: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
