export type Customer = {
  id: string
  user_id: string
  name: string
  phone: string | null
  notes: string | null
  created_at: string
}

export type Loan = {
  id: string
  customer_id: string
  user_id: string
  amount: number
  interest: number
  installment_type: 'daily' | 'weekly' | 'monthly'
  start_date: string
  due_date: string
  status?: 'active' | 'completed' | 'overdue'
  created_at: string
}

export type Payment = {
  id: string
  loan_id: string
  user_id: string
  amount: number
  payment_date: string
  created_at: string
}
