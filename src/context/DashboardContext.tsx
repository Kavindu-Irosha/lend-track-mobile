import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { supabase } from '@/src/lib/supabase'
import { format } from 'date-fns'
import { Loan, Payment, LoanWithRelations, PaymentWithRelations } from '../types'

interface DashboardStats {
  totalGiven: number
  totalCollected: number
  totalPending: number
  principalDisbursed: number
  expectedProfit: number
  totalCredits: number
  customerCount: number
  activeLoanCount: number
  completedLoanCount: number
  expectedToday: number
  realizedProfit: number
  dueTodayCount: number
}

interface DashboardContextType {
  stats: DashboardStats
  recentPayments: Payment[]
  topPending: (LoanWithRelations & { remaining: number, customerName: string, customerId: string })[]
  chartData: { labels: string[]; inData: number[]; outData: number[] }
  isChartEmpty: boolean
  loading: boolean
  refreshing: boolean
  fetchDashboardData: (force?: boolean) => Promise<void>
  fetchChartData: (rangeDays?: number) => Promise<void>
  lastUpdated: number | null
}

const CACHE_DURATION = 60 * 1000 // 1 minute cache

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalGiven: 0,
    totalCollected: 0,
    totalPending: 0,
    principalDisbursed: 0,
    expectedProfit: 0,
    totalCredits: 0,
    customerCount: 0,
    activeLoanCount: 0,
    completedLoanCount: 0,
    expectedToday: 0,
    realizedProfit: 0,
    dueTodayCount: 0
  })
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [topPending, setTopPending] = useState<(LoanWithRelations & { remaining: number, customerName: string, customerId: string })[]>([])
  const [chartData, setChartData] = useState<{ labels: string[]; inData: number[]; outData: number[] }>({ labels: [], inData: [], outData: [] })
  const [isChartEmpty, setIsChartEmpty] = useState(true)

  const fetchDashboardData = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && lastUpdated && now - lastUpdated < CACHE_DURATION) {
      console.log('Using cached dashboard data...')
      setLoading(false)
      return
    }

    if (force) setRefreshing(true)
    else setLoading(true)

    try {
      const [loansRes, paymentsRes, customersRes] = await Promise.all([
        supabase.from('loans').select('*, payments(amount), customers(id, name)'),
        supabase.from('payments').select('*, loans(id, customers(id, name))').order('payment_date', { ascending: false }).limit(5),
        supabase.from('customers').select('*', { count: 'exact', head: true })
      ])

      const loans = (loansRes.data as unknown as LoanWithRelations[]) || []
      const payments = (paymentsRes.data as unknown as PaymentWithRelations[]) || []
      const customerCount = customersRes.count || 0

      // Calculate stats
      let totalGiven = 0, totalCollected = 0, totalPending = 0, principalDisbursed = 0, expectedProfit = 0, totalCredits = 0
      let activeCount = 0, completedCount = 0
      let expectedToday = 0, realizedProfit = 0, dueTodayCount = 0
      const todayStr = new Date().toISOString().split('T')[0]
      const pendingList: (LoanWithRelations & { remaining: number, customerName: string, customerId: string })[] = []

      ;(loans || []).forEach((loan) => {
        const principal = Number(loan.amount)
        principalDisbursed += principal
        expectedProfit += Number(loan.interest)
        const loanTotal = principal + Number(loan.interest)
        totalGiven += loanTotal
        const paid = loan.payments?.reduce((s: number, p) => s + Number(p.amount), 0) || 0
        totalCollected += paid
        const remaining = loanTotal - paid

        // Calculate realized profit per loan
        if (paid > principal) {
          realizedProfit += (paid - principal)
        }

        if (remaining > 0) {
          totalPending += remaining
          activeCount++
          pendingList.push({ ...loan, remaining, customerName: loan.customers?.name || 'Unknown', customerId: loan.customers?.id || loan.customer_id })
          
          // Check if due today
          if (loan.due_date && loan.due_date.split('T')[0] === todayStr) {
            expectedToday += remaining
            dueTodayCount++
          }
        } else {
          completedCount++
          if (remaining < 0) totalCredits += Math.abs(remaining)
        }
      })

      pendingList.sort((a, b) => b.remaining - a.remaining)

      setStats({
        totalGiven, totalCollected, totalPending, principalDisbursed, expectedProfit, totalCredits,
        customerCount, activeLoanCount: activeCount, completedLoanCount: completedCount,
        expectedToday, realizedProfit, dueTodayCount
      })
      setRecentPayments(payments)
      setTopPending(pendingList.slice(0, 5))
      setLastUpdated(now)
      // Chart data is now managed explicitly by the UI component using the selected timeRange

    } catch (err) {
      console.error('Context Fetch Error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [lastUpdated])

  const fetchChartData = useCallback(async (rangeDays = 30) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (rangeDays - 1))
    startDate.setHours(0, 0, 0, 0)
    const startDateStr = startDate.toISOString().split('T')[0]

    const [pRes, lRes] = await Promise.all([
      supabase.from('payments').select('amount, payment_date').gte('payment_date', startDateStr),
      supabase.from('loans').select('amount, start_date').gte('start_date', startDateStr)
    ])

    const labels: string[] = []
    const inValues: number[] = []
    const outValues: number[] = []

    // Pre-process data into maps for O(1) lookup
    const inMap = new Map<string, number>()
    const outMap = new Map<string, number>()
    const dateFormatStr = rangeDays <= 30 ? 'MMM dd' : 'MM/dd'

    pRes.data?.forEach(p => {
      const key = format(new Date(p.payment_date), dateFormatStr)
      inMap.set(key, (inMap.get(key) || 0) + Number(p.amount))
    })

    lRes.data?.forEach(l => {
      const key = format(new Date(l.start_date), dateFormatStr)
      outMap.set(key, (outMap.get(key) || 0) + Number(l.amount))
    })

    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = format(d, dateFormatStr)
      labels.push(label)
      inValues.push(inMap.get(label) || 0)
      outValues.push(outMap.get(label) || 0)
    }

    const hasData = inValues.some(v => v > 0) || outValues.some(v => v > 0)
    const labelStep = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 5 : rangeDays <= 90 ? 15 : 30
    const displayLabels = labels.map((l, i) => (i % labelStep === 0 ? l : ''))

    setChartData({ labels: displayLabels, inData: inValues, outData: outValues })
    setIsChartEmpty(!hasData)
  }, [])

  return (
    <DashboardContext.Provider value={{
      stats, recentPayments, topPending, chartData, isChartEmpty, loading, refreshing,
      fetchDashboardData, fetchChartData, lastUpdated
    }}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) throw new Error('useDashboard must be used within DashboardProvider')
  return context
}
