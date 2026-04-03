import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/src/context/ThemeContext'
import { LucideIcon } from 'lucide-react-native'

interface StatsCardProps {
  icon: LucideIcon
  label: string
  value: string
  color?: string
}

export default function StatsCard({ icon: Icon, label, value, color }: StatsCardProps) {
  const { colors } = useTheme()

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.primaryBg }]}>
        <Icon size={22} color={color || colors.primary} />
      </View>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.value, { color: color || colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
  },
})
