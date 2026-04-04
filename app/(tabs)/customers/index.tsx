import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'
import { Plus, Search, User, Users, ChevronRight } from 'lucide-react-native'
import type { Customer } from '@/src/types'

export default function CustomersScreen() {
  const { colors } = useTheme()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [focusKey, setFocusKey] = useState(0)

  // Debounce: wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const fetchCustomers = useCallback(async () => {
    try {
      // Fetch customers with their loans to determine status
      let q = supabase
        .from('customers')
        .select('*, loans(id, amount, interest, payments(amount))')
        .order('created_at', { ascending: false })

      if (debouncedQuery.trim()) {
        q = q.ilike('name', `%${debouncedQuery.trim()}%`)
      }

      const { data, error } = await q
      if (error) throw error

      const processed = (data || []).map(customer => {
        const hasActiveLoan = customer.loans?.some((loan: any) => {
          const total = Number(loan.amount) + Number(loan.interest)
          const paid = loan.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
          return total - paid > 0
        })

        const hasAnyLoan = customer.loans?.length > 0
        
        let status: 'active' | 'completed' | 'none' = 'none'
        if (hasActiveLoan) status = 'active'
        else if (hasAnyLoan) status = 'completed'

        return { ...customer, status }
      })

      // Filter local state based on tab
      const filtered = processed.filter(c => {
        if (filter === 'all') return true
        if (filter === 'active') return c.status === 'active'
        if (filter === 'completed') return c.status === 'completed'
        return true
      })

      setCustomers(filtered)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedQuery, filter])

  useFocusEffect(
    useCallback(() => {
      fetchCustomers()
      setFocusKey(prev => prev + 1)
    }, [fetchCustomers])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchCustomers()
  }

  if (loading) return <LoadingSpinner message="Loading customers..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.View key={focusKey} style={{ flex: 1 }}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Customers</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/customers/new')}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search customers..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </Animated.View>

      {/* Filters */}
      <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.filterBar}>
        {(['all', 'active', 'completed'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              filter === f && { backgroundColor: colors.primary, borderColor: colors.primary },
              { borderColor: colors.border }
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterChipText, { color: filter === f ? '#fff' : colors.textSecondary }]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* List */}
      <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={{ flex: 1 }}>
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          contentContainerStyle={customers.length === 0 ? styles.emptyListContent : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon={Users}
              title="No customers found"
              description="Get started by creating a new customer profile."
              actionLabel="Add Customer"
              onAction={() => router.push('/(tabs)/customers/new')}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.customerCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => router.push(`/(tabs)/customers/${item.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primaryBg }]}>
                <User size={20} color={colors.primary} />
              </View>
              <View style={styles.customerInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.customerName, { color: colors.text }]}>{item.name}</Text>
                  {item.status !== 'none' && (
                     <View style={[
                       styles.statusBadge, 
                       { backgroundColor: item.status === 'active' ? colors.statusActiveBg : colors.statusCompletedBg }
                     ]}>
                       <Text style={[
                         styles.statusBadgeText, 
                         { color: item.status === 'active' ? colors.statusActive : colors.statusCompleted }
                       ]}>
                         {item.status.toUpperCase()}
                       </Text>
                     </View>
                  )}
                </View>
                <Text style={[styles.customerDetail, { color: colors.textSecondary }]}>
                  {item.phone || 'No phone'} {item.nic_number ? ` • ID: ${item.nic_number}` : ''}
                </Text>
              </View>
              <ChevronRight size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        />
      </Animated.View>
      </Animated.View>
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
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  emptyListContent: { flexGrow: 1, padding: 16 },
  customerCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  customerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  customerName: { fontSize: 15, fontWeight: '600' },
  customerDetail: { fontSize: 12 },
  filterBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { fontSize: 9, fontWeight: '800' },
})
