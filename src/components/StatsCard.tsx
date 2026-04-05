import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/src/context/ThemeContext'
import { LucideIcon } from 'lucide-react-native'

interface StatsCardProps {
  icon: any
  label: string
  value: string
  description?: string
  color?: string
  containerStyle?: any
  variant?: 'default' | 'featured'
}

export default function StatsCard({ 
  icon: Icon, 
  label, 
  value, 
  description,
  color, 
  containerStyle,
  variant = 'default'
}: StatsCardProps) {
  const { colors } = useTheme()

  const isFeatured = variant === 'featured'

  return (
    <View style={[
      styles.card, 
      { backgroundColor: colors.surface, borderColor: colors.cardBorder }, 
      isFeatured && styles.cardFeatured,
      containerStyle
    ]}>
      <View style={[
        styles.iconContainer, 
        { backgroundColor: isFeatured ? colors.primary : colors.primaryBg }
      ]}>
        <Icon size={isFeatured ? 26 : 22} color={isFeatured ? '#fff' : (color || colors.primary)} />
      </View>
      <View style={styles.content}>
        <Text style={[
          styles.label, 
          { color: colors.textSecondary },
          isFeatured && styles.labelFeatured
        ]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[
          styles.value, 
          { color: color || colors.text },
          isFeatured && styles.valueFeatured
        ]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {description && (
          <Text style={[styles.description, { color: colors.textTertiary }]}>
            {description}
          </Text>
        )}
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
  cardFeatured: {
    padding: 20,
    gap: 18,
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
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  labelFeatured: {
    fontSize: 13,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: '800',
  },
  valueFeatured: {
    fontSize: 28,
  },
  description: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
})
