import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/src/context/ThemeContext'

export default function LoadingSpinner({ message }: { message?: string }) {
  const { colors } = useTheme()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text style={[styles.text, { color: colors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  text: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: '500',
  },
})
