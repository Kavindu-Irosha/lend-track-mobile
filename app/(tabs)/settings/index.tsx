import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { useRouter, useFocusEffect } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import { useAlert } from '@/src/context/AlertContext'
import {
  ArrowLeft,
  LogOut,
  ChevronRight,
  Sparkles,
  Briefcase,
  Bell,
  Shield,
  LayoutGrid,
  X,
  type LucideIcon,
} from 'lucide-react-native'
import { APP_VERSION, BUILD_NUMBER, LAST_OTA_UPDATE, CHANGELOG } from '@/src/constants/version'
import { triggerHapticImpact, triggerHapticSelection, triggerHapticNotification, isPerformanceMode } from '@/src/lib/utils'
import * as Updates from 'expo-updates'
import * as Haptics from 'expo-haptics'

// Section row component
function SectionLink({ icon: Icon, iconColor, label, sub, onPress, colors, isDark }: { icon: LucideIcon; iconColor: string; label: string; sub: string; onPress: () => void; colors: any; isDark: boolean }) {
  return (
    <TouchableOpacity style={[styles.linkRow, { borderBottomColor: colors.border }]} onPress={() => { triggerHapticImpact(); onPress() }} activeOpacity={0.7}>
      <View style={[styles.linkIcon, { backgroundColor: iconColor + '15' }]}>
        <Icon size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.linkLabel, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.linkSub, { color: colors.textTertiary }]}>{sub}</Text>
      </View>
      <ChevronRight size={18} color={colors.textTertiary} />
    </TouchableOpacity>
  )
}

export default function SettingsHub() {
  const { colors, isDark } = useTheme()
  const { user, signOut } = useAuth()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [focusKey, setFocusKey] = useState(0)
  const [showChangelog, setShowChangelog] = useState(false)

  useFocusEffect(
    useCallback(() => {
      setFocusKey(prev => prev + 1)
    }, [])
  )

  const handleLogout = () => {
    triggerHapticImpact(Haptics.ImpactFeedbackStyle.Medium)
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
            triggerHapticNotification()
            await signOut()
          },
        },
      ],
    })
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View key={focusKey} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <Animated.View entering={isPerformanceMode() ? FadeInDown : FadeInDown.duration(400).springify()} style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} activeOpacity={0.7}>
              <ArrowLeft size={20} color={colors.text} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
              <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Preferences & Account</Text>
            </View>
          </Animated.View>

          {/* Profile Card */}
          <Animated.View entering={isPerformanceMode() ? FadeInDown : FadeInDown.delay(30).duration(400).springify()}>
            <View style={[styles.profileCard, { backgroundColor: colors.primary }]}>
              <View style={styles.profileGlow} />
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{user?.email?.charAt(0).toUpperCase() || 'U'}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileEmail}>{user?.email || 'Unknown'}</Text>
                <View style={styles.profileStatusRow}>
                  <View style={styles.profileStatusDot} />
                  <Text style={styles.profileStatus}>Active Session</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Settings Sections */}
          <Animated.View entering={isPerformanceMode() ? FadeInDown : FadeInDown.delay(60).duration(400).springify()}>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <SectionLink icon={Briefcase} iconColor="#f59e0b" label="Business Defaults" sub="Interest rates, currency, installments" onPress={() => router.navigate('/(tabs)/settings/business')} colors={colors} isDark={isDark} />
              <SectionLink icon={Bell} iconColor="#3b82f6" label="Notifications" sub="Alerts, reminders, daily summary" onPress={() => router.navigate('/(tabs)/settings/notifications')} colors={colors} isDark={isDark} />
              <SectionLink icon={Shield} iconColor="#10b981" label="Privacy & Security" sub="Biometric lock, data masking, auto-lock" onPress={() => router.navigate('/(tabs)/settings/privacy')} colors={colors} isDark={isDark} />
              <SectionLink icon={LayoutGrid} iconColor="#8b5cf6" label="Display & Appearance" sub="Theme, compact mode, formatting" onPress={() => router.navigate('/(tabs)/settings/display')} colors={colors} isDark={isDark} />
            </View>
          </Animated.View>

          {/* About */}
          <Animated.View entering={isPerformanceMode() ? FadeInDown : FadeInDown.delay(90).duration(400).springify()} style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Sparkles size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>About</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <TouchableOpacity style={styles.aboutRow} onPress={() => { triggerHapticImpact(); setShowChangelog(true) }} activeOpacity={0.7}>
                <View style={styles.aboutRowLeft}>
                  <View style={[styles.versionBox, { backgroundColor: `${colors.primary}15` }]}>
                    <Text style={[styles.versionBoxText, { color: colors.primary }]}>v{APP_VERSION}</Text>
                  </View>
                  <View>
                    <Text style={[styles.aboutText, { color: colors.text }]}>LendTrack</Text>
                    <Text style={[styles.aboutBuild, { color: colors.textTertiary }]}>Build {BUILD_NUMBER}</Text>
                  </View>
                </View>
                <View style={styles.aboutRowRight}>
                  <View style={[styles.newBadge, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
                    <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '800' }}>NEW</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Changelog Modal */}
          <Modal visible={showChangelog} transparent animationType="none" onRequestClose={() => setShowChangelog(false)}>
            <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <Animated.View entering={isPerformanceMode() ? FadeInUp : FadeInUp.duration(400).springify().mass(0.8).damping(20)} style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: isDark ? '#334155' : '#e2e8f0' }]}>
                <View style={[styles.modalAccent, { backgroundColor: colors.primary }]} />
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>What's New</Text>
                    <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Release History</Text>
                  </View>
                  <TouchableOpacity onPress={() => setShowChangelog(false)} style={[styles.closeBtn, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]}>
                    <X size={18} color={colors.text} />
                  </TouchableOpacity>
                </View>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.changelogList}>
                  {CHANGELOG.map((item, idx) => (
                    <Animated.View key={item.version} entering={FadeInDown.delay(80 + (idx * 40)).duration(300).springify()} style={[styles.logItem, { borderLeftColor: idx === 0 ? colors.primary : colors.border }]}>
                      <View style={styles.logHeader}>
                        <View style={[styles.logVersionBadge, { backgroundColor: idx === 0 ? `${colors.primary}15` : isDark ? '#334155' : '#f1f5f9' }]}>
                          <Text style={[styles.logVersion, { color: idx === 0 ? colors.primary : colors.textSecondary }]}>v{item.version}</Text>
                        </View>
                        <Text style={[styles.logDate, { color: colors.textTertiary }]}>{item.date}</Text>
                      </View>
                      <Text style={[styles.logTitle, { color: colors.text }]}>{item.title}</Text>
                      <View style={styles.logNotes}>
                        {item.notes.map((note, nIdx) => (
                          <View key={nIdx} style={styles.noteRow}>
                            <View style={[styles.noteDot, { backgroundColor: idx === 0 ? colors.primary : colors.textTertiary }]} />
                            <Text style={[styles.noteText, { color: colors.textSecondary }]}>{note}</Text>
                          </View>
                        ))}
                      </View>
                    </Animated.View>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => setShowChangelog(false)}>
                  <Text style={styles.doneBtnText}>Close</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </Modal>

          {/* Deployment Status (For OTA Verification) */}
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={{ marginTop: 20 }}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
                <Shield size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Deployment Status</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder, padding: 16 }]}>
              <View style={styles.deploymentRow}>
                <Text style={[styles.deploymentLabel, { color: colors.textTertiary }]}>Active Channel</Text>
                <Text style={[styles.deploymentValue, { color: colors.text }]}>{Updates.channel || 'Development'}</Text>
              </View>
              <View style={styles.deploymentDivider} />
              <View style={styles.deploymentRow}>
                <Text style={[styles.deploymentLabel, { color: colors.textTertiary }]}>Last OTA Sync</Text>
                <Text style={[styles.deploymentValue, { color: colors.text }]}>{LAST_OTA_UPDATE}</Text>
              </View>
              <View style={styles.deploymentDivider} />
              <View style={styles.deploymentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.deploymentLabel, { color: colors.textTertiary }]}>Update ID</Text>
                  <Text style={[styles.deploymentValue, { color: colors.text, fontSize: 10, marginTop: 4 }]}>
                    {Updates.updateId || 'Native Bundle (Pre-OTA)'}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Sign Out */}
          <Animated.View entering={FadeInDown.delay(140).duration(400).springify()} style={{ marginTop: 20 }}>
            <TouchableOpacity style={[styles.logoutButton, { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2' }]} onPress={handleLogout} activeOpacity={0.8}>
              <LogOut size={16} color="#ef4444" />
              <Text style={[styles.logoutText, { color: '#ef4444' }]}>Sign Out</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textTertiary }]}>LendTrack © {new Date().getFullYear()}</Text>
            <Text style={[styles.footerVersion, { color: colors.textTertiary }]}>v{APP_VERSION} · Build {BUILD_NUMBER}</Text>
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },

  // Profile
  profileCard: { borderRadius: 22, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20, overflow: 'hidden', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
  profileGlow: { position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff', opacity: 0.08 },
  profileAvatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 22, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1 },
  profileEmail: { color: '#fff', fontSize: 16, fontWeight: '700' },
  profileStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  profileStatusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399' },
  profileStatus: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600' },

  // Sections card
  card: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 1 },
  linkIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { fontSize: 15, fontWeight: '700' },
  linkSub: { fontSize: 12, marginTop: 2 },

  // About
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  sectionIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  aboutRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  aboutRowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  versionBox: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  versionBoxText: { fontSize: 14, fontWeight: '800' },
  aboutText: { fontSize: 15, fontWeight: '700' },
  aboutBuild: { fontSize: 11, marginTop: 2 },
  newBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },

  // Actions
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 16 },
  logoutText: { fontSize: 15, fontWeight: '700' },

  // Footer
  footer: { alignItems: 'center', marginTop: 24, paddingBottom: 20 },
  footerText: { fontSize: 12, fontWeight: '600' },
  footerVersion: { fontSize: 11, marginTop: 2 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxHeight: '80%', borderRadius: 28, borderWidth: 1, paddingHorizontal: 24, paddingBottom: 24, paddingTop: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 16, overflow: 'hidden' },
  modalAccent: { width: '120%', height: 4, marginLeft: -24, marginBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800' },
  modalSubtitle: { fontSize: 14, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  changelogList: { paddingBottom: 10 },
  logItem: { marginBottom: 24, paddingLeft: 16, borderLeftWidth: 3 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  logVersionBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  logVersion: { fontSize: 13, fontWeight: '800' },
  logDate: { fontSize: 12, fontWeight: '600' },
  logTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  logNotes: { gap: 8 },
  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noteDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7 },
  noteText: { flex: 1, fontSize: 13, lineHeight: 19 },
  doneBtn: { marginTop: 16, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Deployment Status
  deploymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  deploymentLabel: { fontSize: 12, fontWeight: '600' },
  deploymentValue: { fontSize: 13, fontWeight: '700' },
  deploymentDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 12 },
})
