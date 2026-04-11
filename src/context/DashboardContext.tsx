import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { supabase } from '@/src/lib/supabase'
import { format } from 'date-fns'
import { Loan, Payment } from '../types'

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
}

interface DashboardContextType {
  stats: DashboardStats
  recentPayments: Payment[]
  topPending: (Loan & { remaining: number, customerName: string, customerId: string })[]
  chartData: { labels: string[]; inData: number[]; outData: number[] }
  isChartEmpty: boolean
  loading: boolean
  refreshing: boolean
  fetchDashboardData: (force?: boolean) => Promise<void>
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
    completedLoanCount: 0
  })
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [topPending, setTopPending] = useState<(Loan & { remaining: number, customerName: string, customerId: string })[]>([])
  const [chartData, setChartData] = useState({ labels: [], inData: [], outData: [] })
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

      const loans = (loansRes.data as unknown as Loan[]) || []
      const payments = (paymentsRes.data as unknown as Payment[]) || []
      const customerCount = customersRes.count || 0

      // Calculate stats
      let totalGiven = 0, totalCollected = 0, totalPending = 0, principalDisbursed = 0, expectedProfit = 0, totalCredits = 0
      let activeCount = 0, completedCount = 0
      const pendingList: (Loan & { remaining: number, customerName: string, customerId: string })[] = []

      loans.forEach((loan) => {
        principalDisbursed += Number(loan.amount)
        expectedProfit += Number(loan.interest)
        const loanTotal = Number(loan.amount) + Number(loan.interest)
        totalGiven += loanTotal
        const paid = loan.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0
        totalCollected += paid
        const remaining = loanTotal - paid

        if (remaining > 0) {
          totalPending += remaining
          activeCount++
          pendingList.push({ ...loan, remaining, customerName: loan.customers?.name || 'Unknown', customerId: loan.customers?.id })
        } else {
          completedCount++
          if (remaining < 0) totalCredits += Math.abs(remaining)
        }
      })

      pendingList.sort((a, b) => b.remaining - a.remaining)

      setStats({
        totalGiven, totalCollected, totalPending, principalDisbursed, expectedProfit, totalCredits,
        customerCount, activeLoanCount: activeCount, completedLoanCount: completedCount
      })
      setRecentPayments(payments)
      setTopPending(pendingList.slice(0, 5))
      setLastUpdated(now)
      
      // Chart Logic (Default 1M)
      await fetchChartData()
    } catch (err) {
      console.error('Context Fetch Error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [lastUpdated])

  const fetchChartData = async (rangeDays = 30) => {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (rangeDays - 1))
    const startDateStr = startDate.toISOString().split('T')[0]

    const [pRes, lRes] = await Promise.all([
      supabase.from('payments').select('amount, payment_date').gte('payment_date', startDateStr),
      supabase.from('loans').select('amount, start_date').gte('start_date', startDateStr)
    ])

    const inMap: Record<string, number> = {}
    const outMap: Record<string, number> = {}

    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const label = format(d, rangeDays <= 30 ? 'MMM dd' : 'MM/dd')
      inMap[label] = 0
      outMap[label] = 0
    }

    if (pRes.data) {
      pRes.data.forEach((p) => {
        const d = new Date(p.payment_date)
        const label = format(d, rangeDays <= 30 ? 'MMM dd' : 'MM/dd')
        if (inMap[label] !== undefined) inMap[label] += Number(p.amount)
      })
    }

    if (lRes.data) {
      lRes.data.forEach((l) => {
        const d = new Date(l.start_date)
        const label = format(d, rangeDays <= 30 ? 'MMM dd' : 'MM/dd')
        if (outMap[label] !== undefined) outMap[label] += Number(l.amount)
      })
    }

    const allLabels = Object.keys(inMap)
    const inValues = Object.values(inMap)
    const outValues = Object.values(outMap)
    const hasData = inValues.some(v => v > 0) || outValues.some(v => v > 0)
    
    const labelStep = rangeDays <= 7 ? 1 : rangeDays <= 30 ? 5 : rangeDays <= 90 ? 15 : 30
    const displayLabels = allLabels.map((l, i) => (i % labelStep === 0 ? l : ''))

    setChartData({ labels: displayLabels, inData: inValues, outData: outValues })
    setIsChartEmpty(!hasData)
  }

  return (
    <DashboardContext.Provider value={{
      stats, recentPayments, topPending, chartData, isChartEmpty, loading, refreshing,
      fetchDashboardData, lastUpdated
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
