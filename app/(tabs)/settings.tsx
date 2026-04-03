import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { useAuth } from '@/src/context/AuthContext'
import {
  ArrowLeft,
  Sun,
  Moon,
  Smartphone,
  LogOut,
  ChevronRight,
  Info,
} from 'lucide-react-native'

export default function SettingsScreen() {
  const { colors, mode, setMode, isDark } = useTheme()
  const { user, signOut } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut()
        },
      },
    ])
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
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
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
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
                    index < themeOptions.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={() => setMode(option.key)}
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
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
            ABOUT
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.cardBorder },
            ]}
          >
            <View style={styles.aboutRow}>
              <View style={styles.aboutRowLeft}>
                <Info size={18} color={colors.textTertiary} />
                <Text style={[styles.aboutText, { color: colors.text }]}>
                  Version
                </Text>
              </View>
              <Text style={[styles.aboutValue, { color: colors.textSecondary }]}>
                1.0.0
              </Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
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
        </View>
      </ScrollView>
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
  aboutRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aboutText: { fontSize: 15, fontWeight: '500' },
  aboutValue: { fontSize: 14 },
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
})
