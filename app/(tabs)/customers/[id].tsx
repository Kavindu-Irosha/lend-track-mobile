import React, { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import { formatCurrency } from '@/src/lib/utils'
import StatsCard from '@/src/components/StatsCard'
import LoanCard from '@/src/components/LoanCard'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import { ArrowLeft, Plus, Phone, CreditCard, Receipt, Wallet } from 'lucide-react-native'
import { format } from 'date-fns'

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { colors } = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [loans, setLoans] = useState<any[]>([])
  const [totals, setTotals] = useState({ loansAmount: 0, paid: 0, remaining: 0 })

  const fetchData = useCallback(async () => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (!customerData) {
        Alert.alert('Error', 'Customer not found')
        router.back()
        return
      }

      setCustomer(customerData)

      const { data: loansData } = await supabase
        .from('loans')
        .select('*, payments(*)')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })

      let totalLoans = 0, totalPaid = 0
      const processed = (loansData || []).map((loan) => {
        const loanTotal = Number(loan.amount) + Number(loan.interest)
        totalLoans += loanTotal
        const paid = loan.payments?.reduce(
          (sum: number, p: any) => sum + Number(p.amount), 0
        ) || 0
        totalPaid += paid
        const remaining = loanTotal - paid
        let status = 'Active'
        if (remaining <= 0) status = 'Completed'
        else if (new Date(loan.due_date) < new Date()) status = 'Overdue'
        return { ...loan, total: loanTotal, paid, remaining, computedStatus: status }
      })

      setTotals({ loansAmount: totalLoans, paid: totalPaid, remaining: totalLoans - totalPaid })
      setLoans(processed)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id])

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [fetchData])
  )

  if (loading) return <LoadingSpinner />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={[styles.customerName, { color: colors.text }]}>{customer?.name}</Text>
            <View style={styles.phoneLine}>
              <Phone size={14} color={colors.textTertiary} />
              <Text style={[styles.phoneText, { color: colors.textSecondary }]}>
                {customer?.phone || 'No phone'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.newLoanButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push(`/(tabs)/loans/new?customer_id=${customer?.id}`)}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {customer?.notes && (
          <View style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {customer.notes}
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={styles.statsGrid}>
          <StatsCard icon={CreditCard} label="Total Loans" value={formatCurrency(totals.loansAmount)} />
          <StatsCard icon={Receipt} label="Total Paid" value={formatCurrency(totals.paid)} color={colors.success} />
          <StatsCard icon={Wallet} label="Remaining" value={formatCurrency(totals.remaining)} color={colors.error} />
        </View>

        {/* Loans */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active & Past Loans</Text>
          {loans.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No loans recorded for this customer.
            </Text>
          ) : (
            loans.map((loan) => (
              <LoanCard
                key={loan.id}
                customerName={customer?.name || 'Unknown'}
                total={loan.total}
                paid={loan.paid}
                remaining={loan.remaining}
                status={loan.computedStatus}
                dueDate={loan.due_date}
                onPay={loan.remaining > 0 ? () => router.push(`/(tabs)/payments/new?loan_id=${loan.id}`) : undefined}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1 },
  customerName: { fontSize: 22, fontWeight: '700' },
  phoneLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  phoneText: { fontSize: 14 },
  newLoanButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notesCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  notesText: { fontSize: 14, lineHeight: 20 },
  statsGrid: { gap: 10, marginBottom: 16 },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', padding: 16, paddingBottom: 4 },
  emptyText: { padding: 24, textAlign: 'center', fontSize: 14 },
})
