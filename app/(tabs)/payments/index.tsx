import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import PaymentCard from '@/src/components/PaymentCard'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'
import { Plus, Download, Receipt } from 'lucide-react-native'
import { format } from 'date-fns'
import { formatCurrency } from '@/src/lib/utils'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

export default function PaymentsScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [payments, setPayments] = useState<any[]>([])

  const fetchPayments = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('payments')
        .select('*, loans(id, customers(id, name))')
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })

      setPayments(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      fetchPayments()
    }, [fetchPayments])
  )

  const handleExport = async () => {
    if (!payments || payments.length === 0) {
      Alert.alert('No Data', 'No payments to export.')
      return
    }

    try {
      const headers = 'Date,Customer,Amount,Status\n'
      const rows = payments
        .map((p) => {
          const date = format(new Date(p.payment_date), 'yyyy-MM-dd')
          const customer = (p.loans?.customers?.name || 'Unknown').replace(/"/g, '""')
          return `${date},"${customer}",${p.amount},Completed`
        })
        .join('\n')

      const csvContent = headers + rows
      const fileName = `payments_export_${format(new Date(), 'yyyyMMdd')}.csv`
      const filePath = `${FileSystem.cacheDirectory}${fileName}`

      await FileSystem.writeAsStringAsync(filePath, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      })

      const isAvailable = await Sharing.isAvailableAsync()
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Payments CSV',
          UTI: 'public.comma-separated-values-text',
        })
      } else {
        Alert.alert('Sharing not available', 'Sharing is not available on this device.')
      }
    } catch (err) {
      console.error('Export error:', err)
      Alert.alert('Export Failed', 'Failed to export payments.')
    }
  }

  if (loading) return <LoadingSpinner message="Loading payments..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Payments</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.exportButton, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <Download size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/(tabs)/payments/new')}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchPayments() }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={payments.length === 0 ? styles.emptyContent : undefined}
        ListEmptyComponent={
          <EmptyState
            icon={Receipt}
            title="No payments recorded"
            description="Payments collected from customers will appear here."
            actionLabel="Record Payment"
            onAction={() => router.push('/(tabs)/payments/new')}
          />
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: colors.surface }}>
            <PaymentCard
              amount={item.amount}
              customerName={item.loans?.customers?.name || 'Unknown'}
              paymentDate={item.payment_date}
            />
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 10 },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: { flexGrow: 1, padding: 16 },
})
