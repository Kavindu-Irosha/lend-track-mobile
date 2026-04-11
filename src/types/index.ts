export type Customer = {
  id: string
  user_id: string
  name: string
  phone: string | null
  nic_number?: string
  emergency_phone?: string
  notes: string | null
  created_at: string
}

export type Loan = {
  id: string
  customer_id: string
  user_id: string
  amount: number
  interest: number
  interest_type: 'flat' | 'percent'
  interest_model: 'flat' | 'reducing' | 'interest_only'
  interest_rate: number
  installment_type: 'daily' | 'weekly' | 'monthly'
  start_date: string
  due_date: string
  status?: 'active' | 'completed' | 'overdue'
  penalty_enabled: boolean
  penalty_type?: 'fixed' | 'daily'
  penalty_value?: number
  penalty_fee?: number
  purpose?: string
  collateral_details?: string
  created_at: string
  // Relations
  customers?: { id: string, name: string }
  payments?: { amount: number }[]
}

export type Payment = {
  id: string
  loan_id: string
  user_id: string
  amount: number
  payment_date: string
  payment_method?: string
  reference_id?: string
  created_at: string
  // Relations
  loans?: { id: string, customers?: { id: string, name: string } }
}

