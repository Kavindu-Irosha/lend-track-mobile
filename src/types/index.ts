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
  interest_rate?: number
  installment_type: 'daily' | 'weekly' | 'monthly'
  start_date: string
  due_date: string
  status?: 'active' | 'completed' | 'overdue'
  penalty_fee?: number
  purpose?: string
  created_at: string
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
}

