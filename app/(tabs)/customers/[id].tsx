import React, { useCallback, useState, useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Alert, Image, Modal, Linking } from 'react-native'
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '@/src/context/ThemeContext'
import { supabase } from '@/src/lib/supabase'
import { formatCurrency, formatPhoneSriLanka, maskPhone } from '@/src/lib/utils'
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
  CheckCircle2,
  X,
  ShieldCheck,
  Clock,
  TrendingUp,
  Eye,
  Activity,
  ChevronRight
} from 'lucide-react-native'
import { format } from 'date-fns'
import { generateCustomerStatement } from '@/src/lib/reports'
import * as Haptics from 'expo-haptics'
import { useAlert } from '@/src/context/AlertContext'
import { useSettings } from '@/src/context/SettingsContext'

type LoanFilter = 'all' | 'completed' | 'overdue'

const CustomLoadingBar = ({ color, height = 4 }: { color: string, height?: number }) => {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    )
  }, [])

  const rStyle = useAnimatedStyle(() => {
    return {
      left: `${(progress.value * 200) - 100}%` as any,
      width: '80%',
    }
  })

  return (
    <View style={{ width: '100%', height, backgroundColor: `${color}30`, borderRadius: height / 2, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: height / 2, position: 'absolute' }, rStyle]} />
    </View>
  )
}

export default function CustomerDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>()
  const { colors, isDark } = useTheme()
  const { showAlert } = useAlert()
  const { settings } = useSettings()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [idImageFrontUrl, setIdImageFrontUrl] = useState<string | null>(null)
  const [idImageBackUrl, setIdImageBackUrl] = useState<string | null>(null)
  const [viewIdModal, setViewIdModal] = useState<string | null>(null)
  const [isThumbLoading, setIsThumbLoading] = useState(true)
  const [isModalImageLoading, setIsModalImageLoading] = useState(true)
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

      // Fetch temporary signed URL for Front ID
      if (customerData.id_card_url) {
        const { data: signedData } = await supabase.storage
          .from('customer_ids')
          .createSignedUrl(customerData.id_card_url, 60 * 5)
        if (signedData?.signedUrl) setIdImageFrontUrl(signedData.signedUrl)
      } else {
        setIdImageFrontUrl(null)
      }

      // Fetch temporary signed URL for Back ID
      if (customerData.id_card_back_url) {
        const { data: signedData } = await supabase.storage
          .from('customer_ids')
          .createSignedUrl(customerData.id_card_back_url, 60 * 5)
        if (signedData?.signedUrl) setIdImageBackUrl(signedData.signedUrl)
      } else {
        setIdImageBackUrl(null)
      }

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
        {/* Premium Profile Hero Card */}
        <Animated.View entering={FadeInDown.duration(500).springify()}>
          <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
            <View style={styles.heroGlow} />
            
            {/* Top Nav Row */}
            <View style={styles.heroNav}>
              <TouchableOpacity onPress={() => router.navigate('/(tabs)/customers')} style={styles.heroBackBtn} activeOpacity={0.7}>
                <ArrowLeft size={20} color="#fff" />
              </TouchableOpacity>
              <View style={styles.heroNavRight}>
                <TouchableOpacity style={styles.heroIconBtn} onPress={() => router.push(`/(tabs)/customers/new?id=${id}`)} activeOpacity={0.7}>
                  <Pencil size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.heroIconBtn} onPress={handleDownloadStatement} activeOpacity={0.7}>
                  <Download size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Avatar + Identity */}
            <View style={styles.heroIdentity}>
              <View style={styles.heroAvatar}>
                <Text style={styles.heroAvatarText}>{(customer?.name || 'U').charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.heroName} numberOfLines={2} adjustsFontSizeToFit>{customer?.name}</Text>
              {customer?.nic_number && (
                <View style={styles.heroNicBadge}>
                  <CreditCard size={12} color="rgba(255,255,255,0.7)" />
                  <Text style={styles.heroNicText}>{customer?.nic_number}</Text>
                </View>
              )}
            </View>

            {/* Contact Strip */}
            <View style={styles.heroContactRow}>
              <TouchableOpacity 
                style={styles.heroContactBtn} 
                onPress={() => customer?.phone && Linking.openURL(`tel:${customer.phone}`)} 
                activeOpacity={0.7}
              >
                <Phone size={16} color="#fff" />
                <Text style={styles.heroContactText}>{settings.dataMasking ? maskPhone(customer?.phone) : formatPhoneSriLanka(customer?.phone)}</Text>
              </TouchableOpacity>
              {customer?.created_at && (
                <View style={styles.heroContactBtn}>
                  <Clock size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={[styles.heroContactText, { opacity: 0.7 }]}>Since {format(new Date(customer.created_at), 'MMM yyyy')}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Quick Action Floating Bar */}
        <Animated.View entering={FadeInDown.delay(80).duration(400).springify()} style={styles.floatingBar}>
          <TouchableOpacity style={[styles.floatingAction, { backgroundColor: colors.primary }]} onPress={() => router.push(`/(tabs)/loans/new?customer_id=${customer?.id}`)} activeOpacity={0.8}>
            <Plus size={18} color="#fff" />
            <Text style={styles.floatingActionText}>New Loan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.floatingAction, { backgroundColor: colors.surface, borderColor: colors.cardBorder, borderWidth: 1 }]} onPress={handleDeleteCustomer} activeOpacity={0.7}>
            <Trash2 size={16} color={colors.error} />
            <Text style={[styles.floatingActionText, { color: colors.error }]}>Remove</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Notes Section */}
        {customer?.notes && (
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()} style={[styles.notesCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
            <Text style={[styles.notesLabel, { color: colors.textTertiary }]}>📌 Admin Notes</Text>
            <Text style={[styles.notesText, { color: colors.textSecondary }]}>
              {customer.notes}
            </Text>
          </Animated.View>
        )}

        {/* Financial Summary Grid */}
        <Animated.View entering={FadeInDown.delay(120).duration(400).springify()}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Financial Summary</Text>
          <View style={styles.finGrid}>
            <View style={[styles.finCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.finIconBox, { backgroundColor: `${colors.primary}15` }]}>
                <CreditCard size={18} color={colors.primary} />
              </View>
              <Text style={[styles.finValue, { color: colors.text }]} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(totals.loansAmount)}</Text>
              <Text style={[styles.finLabel, { color: colors.textTertiary }]}>Total Loans</Text>
            </View>
            <View style={[styles.finCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.finIconBox, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                <TrendingUp size={18} color="#10b981" />
              </View>
              <Text style={[styles.finValue, { color: '#10b981' }]} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(totals.paid)}</Text>
              <Text style={[styles.finLabel, { color: colors.textTertiary }]}>Collected</Text>
            </View>
          </View>
          <View style={styles.finGrid}>
            <View style={[styles.finCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.finIconBox, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                <Wallet size={18} color="#ef4444" />
              </View>
              <Text style={[styles.finValue, { color: '#ef4444' }]} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(totals.remaining)}</Text>
              <Text style={[styles.finLabel, { color: colors.textTertiary }]}>Outstanding</Text>
            </View>
            <View style={[styles.finCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={[styles.finIconBox, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                <Activity size={18} color="#f59e0b" />
              </View>
              <Text style={[styles.finValue, { color: '#f59e0b' }]} adjustsFontSizeToFit numberOfLines={1}>{formatCurrency(totals.overdueAmount)}</Text>
              <Text style={[styles.finLabel, { color: colors.textTertiary }]}>Overdue</Text>
            </View>
          </View>
          {/* Repayment Progress Bar */}
          {totals.loansAmount > 0 && (
            <View style={[styles.progressSection, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <View style={styles.progressHeader}>
                <Text style={[styles.progressTitle, { color: colors.text }]}>Overall Repayment</Text>
                <Text style={[styles.progressPercent, { color: colors.primary }]}>{Math.round((totals.paid / totals.loansAmount) * 100)}%</Text>
              </View>
              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <Animated.View 
                  style={[
                    styles.progressBarFill, 
                    { 
                      backgroundColor: totals.paid >= totals.loansAmount ? '#10b981' : colors.primary,
                      width: `${Math.min((totals.paid / totals.loansAmount) * 100, 100)}%` 
                    }
                  ]} 
                />
              </View>
              <View style={styles.progressLabelRow}>
                <Text style={[styles.progressLabelText, { color: colors.textTertiary }]}>Paid: {formatCurrency(totals.paid)}</Text>
                <Text style={[styles.progressLabelText, { color: colors.textTertiary }]}>of {formatCurrency(totals.loansAmount)}</Text>
              </View>
            </View>
          )}
        </Animated.View>

        {/* Identity Verification Vault */}
        {(idImageFrontUrl || idImageBackUrl) && (
          <Animated.View entering={FadeInDown.delay(150).duration(400).springify()}>
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Identity Verification</Text>
            <View style={styles.idVault}>
              {idImageFrontUrl && (
                <TouchableOpacity 
                  style={[styles.idVaultCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} 
                  onPress={() => setViewIdModal(idImageFrontUrl)} 
                  activeOpacity={0.85}
                >
                  <View style={styles.idVaultImageWrap}>
                    {isThumbLoading && (
                      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'flex-end', backgroundColor: colors.background, zIndex: 10, borderRadius: 12 }]}>
                        <CustomLoadingBar color={colors.primary} />
                      </View>
                    )}
                    <Image
                      source={{ uri: idImageFrontUrl }}
                      style={styles.idVaultImage}
                      onLoadStart={() => setIsThumbLoading(true)}
                      onLoadEnd={() => setIsThumbLoading(false)}
                    />
                  </View>
                  <View style={styles.idVaultFooter}>
                    <View style={[styles.idVaultBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                      <ShieldCheck size={12} color="#10b981" />
                    </View>
                    <Text style={[styles.idVaultLabel, { color: colors.textSecondary }]}>Front</Text>
                    <Eye size={14} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              )}
              {idImageBackUrl && (
                <TouchableOpacity 
                  style={[styles.idVaultCard, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]} 
                  onPress={() => setViewIdModal(idImageBackUrl)} 
                  activeOpacity={0.85}
                >
                  <View style={styles.idVaultImageWrap}>
                    {isThumbLoading && (
                      <View style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'flex-end', backgroundColor: colors.background, zIndex: 10, borderRadius: 12 }]}>
                        <CustomLoadingBar color={colors.primary} />
                      </View>
                    )}
                    <Image
                      source={{ uri: idImageBackUrl }}
                      style={styles.idVaultImage}
                      onLoadStart={() => setIsThumbLoading(true)}
                      onLoadEnd={() => setIsThumbLoading(false)}
                    />
                  </View>
                  <View style={styles.idVaultFooter}>
                    <View style={[styles.idVaultBadge, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
                      <ShieldCheck size={12} color="#10b981" />
                    </View>
                    <Text style={[styles.idVaultLabel, { color: colors.textSecondary }]}>Back</Text>
                    <Eye size={14} color={colors.textTertiary} />
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}

        {/* Loan Filter Tabs */}
        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Loan Portfolio</Text>
          <View style={styles.tabsContainer}>
            {(['all', 'completed', 'overdue'] as LoanFilter[]).map((tab) => {
              const count = tab === 'all' ? loans.length : loans.filter(l => l.computedStatus.toLowerCase() === tab).length
              return (
                <TouchableOpacity
                  key={tab}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(tab) }}
                  style={[
                    styles.tab,
                    { backgroundColor: activeTab === tab ? colors.primary : colors.surface, borderColor: activeTab === tab ? colors.primary : colors.cardBorder }
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabLabel, { color: activeTab === tab ? '#fff' : colors.textTertiary }]}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Text>
                  <View style={[styles.tabCount, { backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.25)' : `${colors.primary}15` }]}>
                    <Text style={[styles.tabCountText, { color: activeTab === tab ? '#fff' : colors.primary }]}>{count}</Text>
                  </View>
                </TouchableOpacity>
              )
            })}
          </View>
        </Animated.View>

        {/* Loans Section */}
        <Animated.View entering={FadeInDown.delay(250).duration(400).springify()}>
          {filteredLoans.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <CheckCircle2 size={40} color={colors.textTertiary} style={{ opacity: 0.3 }} />
              <Text style={[styles.emptyTitle, { color: colors.textTertiary }]}>
                No {activeTab !== 'all' ? activeTab : ''} loans found
              </Text>
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                {activeTab === 'all' ? 'Issue a new loan to get started' : `No ${activeTab} loans for this customer`}
              </Text>
            </View>
          ) : (
            filteredLoans.map((loan, index) => (
              <Animated.View key={loan.id} entering={FadeInDown.delay(280 + index * 60).duration(400).springify()}>
                <LoanCard
                  customerName={customer?.name || 'Unknown'}
                  total={loan.total}
                  paid={loan.paid}
                  remaining={loan.remaining}
                  status={loan.computedStatus}
                  dueDate={loan.due_date}
                  onPay={loan.remaining > 0 ? () => router.push(`/(tabs)/payments/new?loan_id=${loan.id}`) : undefined}
                  onDelete={() => handleDeleteLoan(loan.id)}
                />
              </Animated.View>
            ))
          )}
        </Animated.View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ID Full Screen Modal */}
      <Modal visible={!!viewIdModal} transparent={true} animationType="fade" onRequestClose={() => setViewIdModal(null)}>
        <View style={styles.modalOverlay}>
          <SafeAreaView style={{ flex: 1, width: '100%', padding: 20 }}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setViewIdModal(null)}>
              <X size={24} color="#fff" />
            </TouchableOpacity>
            {viewIdModal && (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                {isModalImageLoading && (
                  <View style={{ position: 'absolute', width: '60%', zIndex: 10 }}>
                    <CustomLoadingBar color={colors.primary} height={6} />
                  </View>
                )}
                <Image
                  source={{ uri: viewIdModal }}
                  style={styles.fullScreenId}
                  resizeMode="contain"
                  onLoadStart={() => setIsModalImageLoading(true)}
                  onLoadEnd={() => setIsModalImageLoading(false)}
                />
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // Hero Card
  heroCard: { padding: 24, paddingTop: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 16 },
  heroGlow: { position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: '#fff', opacity: 0.08 },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  heroBackBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroNavRight: { flexDirection: 'row', gap: 8 },
  heroIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroIdentity: { alignItems: 'center', marginBottom: 24 },
  heroAvatar: { width: 80, height: 80, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  heroAvatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  heroName: { fontSize: 24, fontWeight: '800', color: '#fff', textAlign: 'center', maxWidth: '80%', letterSpacing: -0.5 },
  heroNicBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroNicText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  heroContactRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, flexWrap: 'wrap' },
  heroContactBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  heroContactText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // Floating Action Bar
  floatingBar: { flexDirection: 'row', gap: 12, marginTop: -16, marginHorizontal: 24, zIndex: 10, marginBottom: 16 },
  floatingAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6 },
  floatingActionText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Notes
  notesCard: { marginHorizontal: 16, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  notesLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  notesText: { fontSize: 14, lineHeight: 22 },

  // Section Label
  sectionLabel: { fontSize: 18, fontWeight: '800', marginBottom: 12, marginHorizontal: 16, letterSpacing: -0.3 },

  // Financial Grid
  finGrid: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 12 },
  finCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  finIconBox: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  finValue: { fontSize: 18, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  finLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Progress 
  progressSection: { marginHorizontal: 16, padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 14, fontWeight: '700' },
  progressPercent: { fontSize: 16, fontWeight: '800' },
  progressBarBg: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', borderRadius: 5 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabelText: { fontSize: 12, fontWeight: '500' },

  // ID Vault
  idVault: { flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 20 },
  idVaultCard: { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  idVaultImageWrap: { width: '100%', height: 100, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden', position: 'relative' },
  idVaultImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  idVaultFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  idVaultBadge: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  idVaultLabel: { flex: 1, fontSize: 13, fontWeight: '700' },

  // Tabs
  tabsContainer: { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  tabLabel: { fontSize: 13, fontWeight: '700' },
  tabCount: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, minWidth: 28, alignItems: 'center' },
  tabCountText: { fontSize: 12, fontWeight: '800' },

  // Empty State
  emptyState: { marginHorizontal: 16, padding: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  closeModalBtn: { alignSelf: 'flex-end', padding: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20 },
  fullScreenId: { flex: 1, width: '100%', marginTop: 20 },
})
