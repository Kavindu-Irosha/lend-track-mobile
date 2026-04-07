import React, { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import { formatCurrency } from '@/src/lib/utils'
import StatsCard from '@/src/components/StatsCard'
import LoanCard from '@/src/components/LoanCard'
import LoadingSpinner from '@/src/components/LoadingSpinner'
import {
  ArrowLeft,
  Plus,
  Phone,
  CreditCard,
  Receipt,
  Wallet,
  Download,
  Pencil,
  Trash2,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react-native'
import { format } from 'date-fns'
import { generateCustomerStatement } from '@/src/lib/reports'
import * as Haptics from 'expo-haptics'
import { useAlert } from '@/src/context/AlertContext'

type LoanFilter = 'all' | 'completed' | 'overdue'

export default function CustomerDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>()
  const { colors, isDark } = useTheme()
  const { showAlert } = useAlert()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [loans, setLoans] = useState<any[]>([])
  const [totals, setTotals] = useState({
    loansAmount: 0,
    paid: 0,
    remaining: 0,
    overdueAmount: 0,
    completedAmount: 0
  })
  const [activeTab, setActiveTab] = useState<LoanFilter>('all')
  const [deleting, setDeleting] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single()

      if (!customerData) {
        showAlert({
          title: 'Error',
          message: 'Customer not found',
          type: 'error'
        })
        router.back()
        return
      }

      setCustomer(customerData)

      const { data: loansData } = await supabase
        .from('loans')
        .select('*, payments(*)')
        .eq('customer_id', id)
        .order('created_at', { ascending: false })

      let totalLoans = 0, totalPaid = 0, overdueTotal = 0, completedTotal = 0
      const processed = (loansData || []).map((loan) => {
        const loanTotal = Number(loan.amount) + Number(loan.interest)
        totalLoans += loanTotal
        const paid = loan.payments?.reduce(
          (sum: number, p: any) => sum + Number(p.amount), 0
        ) || 0
        totalPaid += paid
        const remaining = loanTotal - paid
        let status = 'Active'

        if (remaining <= 0) {
          status = 'Completed'
          completedTotal += loanTotal
        } else if (new Date(loan.due_date) < new Date()) {
          status = 'Overdue'
          overdueTotal += remaining
        }

        return { ...loan, total: loanTotal, paid, remaining, computedStatus: status }
      })

      setTotals({
        loansAmount: totalLoans,
        paid: totalPaid,
        remaining: totalLoans - totalPaid,
        overdueAmount: overdueTotal,
        completedAmount: completedTotal
      })
      setLoans(processed)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id, showAlert])

  const handleDownloadStatement = async () => {
    if (!customer || loans.length === 0) return
    await generateCustomerStatement(customer, loans)
  }

  const handleDeleteCustomer = async () => {
    const hasOutstandingBalance = totals.remaining > 0

    if (hasOutstandingBalance) {
      showAlert({
        title: 'Capital Protection Lock',
        message: `This customer still owes ${formatCurrency(totals.remaining)}. You cannot delete a customer with an active debt. Please settle all loans first.`,
        type: 'error'
      })
      return
    }

    showAlert({
      title: 'Delete Customer',
      message: 'Are you sure you want to delete this customer? This will permanentely remove all their data and loan history.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            try {
              const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id)

              if (error) throw error

              router.replace('/(tabs)/customers')
            } catch (err: any) {
              showAlert({
                title: 'Error',
                message: err.message || 'Failed to delete customer',
                type: 'error'
              })
            } finally {
              setDeleting(false)
            }
          }
        }
      ]
    })
  }

  const handleDeleteLoan = (loanId: string) => {
    const loan = loans.find(l => l.id === loanId)
    if (loan && loan.remaining > 0) {
      showAlert({
        title: 'Active Loan Protection',
        message: `This loan has an outstanding balance of ${formatCurrency(loan.remaining)}. You cannot delete an active loan that still has money owed.`,
        type: 'error'
      })
      return
    }

    showAlert({
      title: 'Delete Loan Record',
      message: 'Are you sure? This will permanentely remove the loan and its payment history from your records.',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Forever', 
          style: 'destructive',
          onPress: async () => {
             try {
               Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
               const { error } = await supabase.from('loans').delete().eq('id', loanId)
               if (error) throw error
               
               Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
               fetchData() 
             } catch (err: any) {
               showAlert({ title: 'Error', message: err.message, type: 'error' })
             }
          }
        }
      ]
    })
  }

  const filteredLoans = loans.filter(loan => {
    if (activeTab === 'all') return true
    return loan.computedStatus.toLowerCase() === activeTab
  })

  useFocusEffect(
    useCallback(() => {
      fetchData()
    }, [fetchData])
  )

  if (loading) return <LoadingSpinner message={`Loading ${name || 'customer'} details...`} />

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData() }} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.header}>
          <TouchableOpacity onPress={() => router.navigate('/(tabs)/customers')} style={[styles.backButton, { backgroundColor: colors.surface }]} activeOpacity={0.7}>
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

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={handleDownloadStatement}
              activeOpacity={0.7}
            >
              <Download size={18} color={colors.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={() => router.push(`/(tabs)/customers/new?id=${id}`)}
              activeOpacity={0.7}
            >
              <Pencil size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerActionBtn, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
              onPress={handleDeleteCustomer}
              activeOpacity={0.7}
            >
              <Trash2 size={18} color={colors.error} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.newLoanButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push(`/(tabs)/loans/new?customer_id=${customer?.id}`)}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {customer?.notes && (
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {customer.notes}
            </Text>
          </Animated.View>
        )}

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()} style={styles.statsGrid}>
          <StatsCard icon={CreditCard} label="Total Loans" value={formatCurrency(totals.loansAmount)} />
          <View style={styles.statsRow}>
            <View style={{ flex: 1 }}>
              <StatsCard icon={Receipt} label="Total Paid" value={formatCurrency(totals.paid)} color={colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <StatsCard icon={Wallet} label="Remaining" value={formatCurrency(totals.remaining)} color={colors.error} />
            </View>
          </View>

          {activeTab === 'all' && (
            <View style={styles.statsRow}>
              <View style={{ flex: 1 }}>
                <StatsCard icon={AlertTriangle} label="Overdue Amount" value={formatCurrency(totals.overdueAmount)} color={colors.statusOverdue} />
              </View>
              <View style={{ flex: 1 }}>
                <StatsCard icon={CheckCircle2} label="Completed Amount" value={formatCurrency(totals.completedAmount)} color={colors.statusCompleted} />
              </View>
            </View>
          )}
        </Animated.View>

        {/* Tabs */}
        <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={styles.tabsContainer}>
          {(['all', 'completed', 'overdue'] as LoanFilter[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tab,
                activeTab === tab && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === tab ? '#fff' : colors.textTertiary }
                ]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Loans */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Loans
          </Text>
          {filteredLoans.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
              No {activeTab !== 'all' ? activeTab : ''} loans found.
            </Text>
          ) : (
            filteredLoans.map((loan) => (
              <LoanCard
                key={loan.id}
                customerName={customer?.name || 'Unknown'}
                total={loan.total}
                paid={loan.paid}
                remaining={loan.remaining}
                status={loan.computedStatus}
                dueDate={loan.due_date}
                onPay={loan.remaining > 0 ? () => router.push(`/(tabs)/payments/new?loan_id=${loan.id}`) : undefined}
                onDelete={() => handleDeleteLoan(loan.id)}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActionBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  newLoanButton: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notesCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  notesText: { fontSize: 14, lineHeight: 20 },
  statsGrid: { gap: 10, marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 10 },
  tabsContainer: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  section: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', padding: 16, paddingBottom: 4 },
  emptyText: { padding: 24, textAlign: 'center', fontSize: 14 },
})
