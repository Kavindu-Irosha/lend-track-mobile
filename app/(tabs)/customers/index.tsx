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
  const [customers, setCustomers] = useState<Customer[]>([])
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce: wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 500)
    return () => clearTimeout(timer)
  }, [query])

  const fetchCustomers = useCallback(async () => {
    try {
      let q = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })

      if (debouncedQuery.trim()) {
        q = q.ilike('name', `%${debouncedQuery.trim()}%`)
      }

      const { data } = await q
      setCustomers(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedQuery])

  useFocusEffect(
    useCallback(() => {
      fetchCustomers()
    }, [fetchCustomers])
  )

  const onRefresh = () => {
    setRefreshing(true)
    fetchCustomers()
  }

  if (loading) return <LoadingSpinner message="Loading customers..." />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Customers</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/(tabs)/customers/new')}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        <Search size={18} color={colors.textTertiary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search customers..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
      </View>

      {/* List */}
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
              <Text style={[styles.customerName, { color: colors.text }]}>{item.name}</Text>
              <Text style={[styles.customerPhone, { color: colors.textSecondary }]}>
                {item.phone || 'No phone number'}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textTertiary} />
          </TouchableOpacity>
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
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 8 },
  emptyListContent: { flexGrow: 1, padding: 16 },
  customerCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  customerPhone: { fontSize: 13 },
})
