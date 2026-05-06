import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useTheme } from '@/src/context/ThemeContext'
import { LucideIcon } from 'lucide-react-native'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  compact?: boolean
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: EmptyStateProps) {
  const { colors } = useTheme()

  return (
    <View style={[
      styles.container, 
      { borderColor: colors.border },
      compact && { paddingVertical: 24, borderRadius: 12 }
    ]}>
      <View style={[
        styles.iconContainer, 
        { backgroundColor: colors.primaryBg },
        compact && { width: 48, height: 48, marginBottom: 8 }
      ]}>
        <Icon size={compact ? 24 : 32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }, compact && { fontSize: 13 }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }, compact && { fontSize: 12, maxWidth: 200 }]}>
        {description}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }, compact && { marginTop: 12, paddingVertical: 6, paddingHorizontal: 16 }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, compact && { fontSize: 12 }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  button: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
})
