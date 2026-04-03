import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import LoanCard from '@/src/components/LoanCard'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'
import { Plus, Search, CreditCard } from 'lucide-react-native'

export default function LoansScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loans, setLoans] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce: wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const fetchLoans = useCallback(async () => {
    try {
      let q = supabase
        .from('loans')
        .select('*, customers!inner(id, name), payments(amount)')
        .order('created_at', { ascending: false })

      if (debouncedQuery.trim()) {
        q = q.ilike('customers.name', `%${debouncedQuery.trim()}%`)
      }

      const { data } = await q

      const processed = (data || []).map((loan) => {
        const loanTotal = Number(loan.amount) + Number(loan.interest)
        const paid = loan.payments?.reduce(
          (sum: number, p: any) => sum + Number(p.amount), 0
        ) || 0
        const remaining = loanTotal - paid
        let status = 'Active'
        if (remaining <= 0) status = 'Completed'
        else if (new Date(loan.due_date) < new Date() && remaining > 0) status = 'Overdue'
        return {
          ...loan,
          customerName: loan.customers?.name || 'Unknown',
          customerId: loan.customers?.id,
          total: loanTotal,
          paid,
          remaining,
          computedStatus: status,
        }
      })

      setLoans(processed)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedQuery])

  useFocusEffect(
    useCallback(() => {
      fetchLoans()
    }, [fetchLoans])
  )

  if (loading) return <LoadingSpinner message="Loading loans..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>All Loans</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/loans/new')}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search by customer..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoans() }} tintColor={colors.primary} />}
        contentContainerStyle={loans.length === 0 ? styles.emptyContent : undefined}
        ListEmptyComponent={
          <EmptyState
            icon={CreditCard}
            title="No loans found"
            description={query ? "No loans match your search criteria." : "Once you issue a loan, it will appear here."}
            actionLabel={query ? undefined : "New Loan"}
            onAction={query ? undefined : () => router.push('/(tabs)/loans/new')}
          />
        }
        renderItem={({ item }) => (
          <View style={[{ backgroundColor: colors.surface }]}>
            <LoanCard
              customerName={item.customerName}
              total={item.total}
              paid={item.paid}
              remaining={item.remaining}
              status={item.computedStatus}
              dueDate={item.due_date}
              onPress={() => router.push(`/(tabs)/customers/${item.customerId}`)}
              onPay={item.remaining > 0 ? () => router.push(`/(tabs)/payments/new?loan_id=${item.id}`) : undefined}
            />
          </View>
        )}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  addButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15 },
  emptyContent: { flexGrow: 1, padding: 16 },
})
