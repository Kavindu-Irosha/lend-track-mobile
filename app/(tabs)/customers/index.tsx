import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ScrollView,
  Linking,
} from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'
import { Plus, Search, Users, ChevronRight, Phone, CreditCard, X, UserCheck, UserX } from 'lucide-react-native'
import type { Customer } from '@/src/types'
import { maskPhone, maskNIC, formatPhoneSriLanka, formatCurrency } from '@/src/lib/utils'
import { useSettings } from '@/src/context/SettingsContext'
import * as Haptics from 'expo-haptics'

export default function CustomersScreen() {
  const { colors, isDark } = useTheme()
  const { settings } = useSettings()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [allCustomers, setAllCustomers] = useState<any[]>([])
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
      let q = supabase
        .from('customers')
        .select('*, loans(id, amount, interest, due_date, payments(amount))')
        .order('created_at', { ascending: false })

      if (debouncedQuery.trim()) {
        q = q.ilike('name', `%${debouncedQuery.trim()}%`)
      }

      const { data, error } = await q
      if (error) throw error

      const processed = (data || []).map(customer => {
        let totalLoans = 0
        let totalPaid = 0
        let activeLoanCount = 0

        const hasActiveLoan = customer.loans?.some((loan: any) => {
          const total = Number(loan.amount) + Number(loan.interest)
          const paid = loan.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
          totalLoans += total
          totalPaid += paid
          if (total - paid > 0) { activeLoanCount++; return true }
          return false
        })

        const hasAnyLoan = customer.loans?.length > 0
        
        let status: 'active' | 'completed' | 'none' = 'none'
        if (hasActiveLoan) status = 'active'
        else if (hasAnyLoan) status = 'completed'

        return { ...customer, status, totalLoans, totalPaid, activeLoanCount, loanCount: customer.loans?.length || 0 }
      })

      setAllCustomers(processed)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [debouncedQuery])

  // Filter locally
  const customers = useMemo(() => {
    return allCustomers.filter(c => {
      if (filter === 'all') return true
      if (filter === 'active') return c.status === 'active'
      if (filter === 'completed') return c.status === 'completed'
      return true
    })
  }, [allCustomers, filter])

  // Stats
  const stats = useMemo(() => {
    const total = allCustomers.length
    const active = allCustomers.filter(c => c.status === 'active').length
    const completed = allCustomers.filter(c => c.status === 'completed').length
    const newClients = allCustomers.filter(c => c.status === 'none').length
    return { total, active, completed, newClients }
  }, [allCustomers])

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

      {/* Premium Header */}
      <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>Clients</Text>
          <Text style={[styles.title, { color: colors.text }]}>Customer Directory</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/(tabs)/customers/new') }}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      {/* Stats Ribbon */}
      <Animated.View entering={FadeInDown.delay(50).duration(400).springify()}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
          <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff' }]}>
            <Users size={14} color="#3b82f6" />
            <Text style={[styles.statNum, { color: isDark ? '#fff' : '#1e3a8a' }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: '#3b82f6' }]}>Total</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb' }]}>
            <UserCheck size={14} color="#f59e0b" />
            <Text style={[styles.statNum, { color: isDark ? '#fff' : '#78350f' }]}>{stats.active}</Text>
            <Text style={[styles.statLabel, { color: '#f59e0b' }]}>Active</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : '#ecfdf5' }]}>
            <CreditCard size={14} color="#10b981" />
            <Text style={[styles.statNum, { color: isDark ? '#fff' : '#064e3b' }]}>{stats.completed}</Text>
            <Text style={[styles.statLabel, { color: '#10b981' }]}>Settled</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: isDark ? 'rgba(139,92,246,0.15)' : '#f5f3ff' }]}>
            <UserX size={14} color="#8b5cf6" />
            <Text style={[styles.statNum, { color: isDark ? '#fff' : '#4c1d95' }]}>{stats.newClients}</Text>
            <Text style={[styles.statLabel, { color: '#8b5cf6' }]}>New</Text>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Search Bar */}
      <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={styles.searchWrap}>
        <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search by name..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Filter Tabs */}
      <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterBar}>
          {([
            { id: 'all' as const, label: 'All Clients', count: stats.total, color: colors.primary },
            { id: 'active' as const, label: 'Active', count: stats.active, color: '#f59e0b' },
            { id: 'completed' as const, label: 'Settled', count: stats.completed, color: '#10b981' },
          ]).map((f) => {
            const isActive = filter === f.id
            return (
              <TouchableOpacity
                key={f.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: isActive ? f.color : colors.surface, borderColor: isActive ? f.color : colors.cardBorder }
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setFilter(f.id) }}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, { color: isActive ? '#fff' : colors.textTertiary }]}>
                  {f.label}
                </Text>
                <View style={[styles.filterCount, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : `${f.color}15` }]}>
                  <Text style={[styles.filterCountText, { color: isActive ? '#fff' : f.color }]}>{f.count}</Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      </Animated.View>

      {/* Customer List */}
      <FlatList
        data={customers}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={customers.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon={Users}
            title={filter !== 'all' ? `No ${filter} customers` : "No customers found"}
            description={query ? "No customers match your search." : "Get started by adding a new client."}
            actionLabel={query || filter !== 'all' ? undefined : "Add Customer"}
            onAction={query || filter !== 'all' ? undefined : () => router.push('/(tabs)/customers/new')}
          />
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 35).duration(300).springify()}>
            <TouchableOpacity
              style={[styles.customerCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder, padding: settings.compactMode ? 12 : 16 }]}
              onPress={() => router.push(`/(tabs)/customers/${item.id}?name=${encodeURIComponent(item.name)}`)}
              activeOpacity={0.8}
            >
              {/* Avatar */}
              <View style={[styles.avatar, { backgroundColor: `${colors.primary}15`, width: settings.compactMode ? 38 : 48, height: settings.compactMode ? 38 : 48, borderRadius: settings.compactMode ? 12 : 16 }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>

              {/* Info Block */}
              <View style={styles.customerInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  {item.status !== 'none' && (
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: item.status === 'active' ? '#f59e0b' : '#10b981' }
                    ]} />
                  )}
                </View>

                {/* Meta Row */}
                <View style={styles.metaRow}>
                  {item.phone && (
                    <TouchableOpacity 
                      style={styles.metaItem} 
                      onPress={(e) => { e.stopPropagation?.(); Linking.openURL(`tel:${item.phone}`) }}
                      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                    >
                      <Phone size={11} color={colors.primary} />
                      <Text style={[styles.metaText, { color: colors.primary }]}>{settings.dataMasking ? maskPhone(item.phone) : formatPhoneSriLanka(item.phone)}</Text>
                    </TouchableOpacity>
                  )}
                  {item.loanCount > 0 && (
                    <View style={styles.metaItem}>
                      <CreditCard size={11} color={colors.textTertiary} />
                      <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                        {item.loanCount} loan{item.loanCount > 1 ? 's' : ''}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Financial Quick View - only for customers with loans */}
                {item.totalLoans > 0 && (
                  <View style={styles.finRow}>
                    <Text style={[styles.finText, { color: colors.textTertiary }]}>
                      Paid <Text style={{ color: '#10b981', fontWeight: '700' }}>{formatCurrency(item.totalPaid)}</Text>
                      {' / '}
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{formatCurrency(item.totalLoans)}</Text>
                    </Text>
                  </View>
                )}
              </View>

              {/* Right Indicator */}
              <View style={styles.rightSection}>
                {item.status === 'active' && item.activeLoanCount > 0 && (
                  <View style={[styles.loanBadge, { backgroundColor: 'rgba(245,158,11,0.1)' }]}>
                    <Text style={[styles.loanBadgeText, { color: '#f59e0b' }]}>{item.activeLoanCount}</Text>
                  </View>
                )}
                <ChevronRight size={18} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
      />

      </Animated.View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  greeting: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  addButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },

  // Stats Ribbon
  statsScroll: { paddingHorizontal: 16, gap: 10, paddingBottom: 16 },
  statPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  statNum: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '600' },

  // Search
  searchWrap: { paddingHorizontal: 16, marginBottom: 12 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, gap: 10 },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15 },

  // Filters
  filterBar: { paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontWeight: '700' },
  filterCount: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, minWidth: 24, alignItems: 'center' },
  filterCountText: { fontSize: 11, fontWeight: '800' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  emptyListContent: { flexGrow: 1, padding: 16 },

  // Customer Card
  customerCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800' },
  customerInfo: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  customerName: { fontSize: 16, fontWeight: '700', flexShrink: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  finRow: { marginTop: 4 },
  finText: { fontSize: 12, fontWeight: '500' },
  rightSection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loanBadge: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  loanBadgeText: { fontSize: 13, fontWeight: '800' },
})
