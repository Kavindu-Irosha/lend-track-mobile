import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import { 
  Search, 
  ArrowLeft, 
  X, 
  Users, 
  CreditCard, 
  ChevronRight,
  User,
  History,
  Receipt
} from 'lucide-react-native'
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated'
import { formatCurrency, formatAppDate, triggerHapticImpact, isPerformanceMode } from '@/src/lib/utils'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import EmptyState from '@/src/components/EmptyState'

export default function GlobalSearchScreen() {
  const { colors, isDark } = useTheme()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{
    customers: any[]
    loans: any[]
    payments: any[]
  }>({ customers: [], loans: [], payments: [] })

  const performSearch = useCallback(async (txt: string) => {
    if (!txt.trim()) {
      setResults({ customers: [], loans: [], payments: [] })
      return
    }

    setLoading(true)
    try {
      const numVal = Number(txt.replace(/[^0-9.]/g, ''))
      
      const queries: any[] = [
        supabase
          .from('customers')
          .select('id, name, phone')
          .ilike('name', `%${txt}%`)
          .limit(5),
        supabase
          .from('loans')
          .select('*, customers(name)')
          .or(`purpose.ilike.%${txt}%,collateral_details.ilike.%${txt}%`)
          .limit(5)
      ]

      if (!isNaN(numVal) && numVal > 0) {
        queries.push(
          supabase
            .from('payments')
            .select('*, loans(id, customer_id, customers(name))')
            .eq('amount', numVal)
            .limit(5) as any
        )
      } else {
        queries.push(Promise.resolve({ data: [] } as any))
      }

      const [cRes, lRes, pRes] = await Promise.all(queries)

      setResults({
        customers: cRes.data || [],
        loans: lRes.data || [],
        payments: pRes.data || []
      })
    } catch (err) {
      console.error('Search Error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 400)
    return () => clearTimeout(timer)
  }, [query, performSearch])

  const renderSectionHeader = (title: string, icon: any) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: `${colors.primary}15` }]}>
        {React.createElement(icon, { size: 14, color: colors.primary })}
      </View>
      <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{title}</Text>
    </View>
  )

  const hasResults = results.customers.length > 0 || results.loans.length > 0 || results.payments.length > 0

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="Search customers or loans..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <LoadingSpinner message="Searching..." />
        </View>
      ) : !query ? (
        <View style={styles.center}>
          <History size={48} color={colors.border} />
          <Text style={[styles.hint, { color: colors.textTertiary }]}>Type to search across your portfolio</Text>
        </View>
      ) : !hasResults ? (
        <EmptyState
          icon={Search}
          title="No results found"
          description={`We couldn't find anything matching "${query}"`}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Customers Section */}
          {results.customers.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400)}>
              {renderSectionHeader('CUSTOMERS', Users)}
              {results.customers.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.resultItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    triggerHapticImpact()
                    router.push(`/(tabs)/customers/${item.id}`)
                  }}
                >
                  <View style={[styles.avatar, { backgroundColor: `${colors.primary}10` }]}>
                    <User size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.resultSub, { color: colors.textTertiary }]}>{item.phone}</Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          {/* Loans Section */}
          {results.loans.length > 0 && (
            <Animated.View entering={FadeInDown.delay(100).duration(400)} style={{ marginTop: 24 }}>
              {renderSectionHeader('LOANS', CreditCard)}
              {results.loans.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.resultItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    triggerHapticImpact()
                    router.push(`/(tabs)/customers/${item.customer_id}`)
                  }}
                >
                  <View style={[styles.avatar, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <CreditCard size={18} color="#10b981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultName, { color: colors.text }]}>{item.customers?.name}</Text>
                    <Text style={[styles.resultSub, { color: colors.textTertiary }]}>
                      {item.purpose || 'General Loan'} • {formatCurrency(item.amount)}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}

          {/* Payments Section */}
          {results.payments.length > 0 && (
            <Animated.View entering={FadeInDown.delay(200).duration(400)} style={{ marginTop: 24 }}>
              {renderSectionHeader('PAYMENTS', Receipt)}
              {results.payments.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.resultItem, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                  onPress={() => {
                    triggerHapticImpact()
                    router.push(`/(tabs)/customers/${item.loans?.customer_id}`)
                  }}
                >
                  <View style={[styles.avatar, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Receipt size={18} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultName, { color: colors.text }]}>{formatCurrency(item.amount)}</Text>
                    <Text style={[styles.resultSub, { color: colors.textTertiary }]}>
                      {item.loans?.customers?.name || 'Unknown'} • {formatAppDate(new Date(item.payment_date))}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </Animated.View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 40,
  },
  hint: {
    fontSize: 14,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: {
    padding: 4,
    borderRadius: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultName: {
    fontSize: 16,
    fontWeight: '700',
  },
  resultSub: {
    fontSize: 12,
    marginTop: 2,
  },
})
