import { addDays, addWeeks, addMonths, format, differenceInDays } from 'date-fns'

export type InterestType = 'flat' | 'percent' | 'reducing'
export type InstallmentType = 'daily' | 'weekly' | 'monthly'
export type PenaltyType = 'fixed' | 'daily'

/**
 * Calculates the total interest amount based on flat value or percentage
 */
export function calculateInterestAmount(
  principal: number,
  interestValue: number,
  type: InterestType
): number {
  if (type === 'flat') {
    return interestValue
  }
  // For 'percent' and 'reducing', we treat the interestValue as the total rate for the loan duration
  // Professional lenders usually treat this as a monthly rate, but for simplicity:
  return (principal * interestValue) / 100
}

/**
 * Calculates the installment amount using Reducing Balance (EMI) formula
 * P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  if (annualRate === 0) return principal / tenureMonths
  const r = (annualRate / 100) / 12
  const n = tenureMonths
  const emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  return Math.round(emi * 100) / 100
}

/**
 * Calculates the installment amount with rounding protection
 */
export function calculateInstallment(
  totalPayable: number,
  tenureValue: number
): number {
  if (tenureValue <= 0) return totalPayable
  // Round to nearest integer (or 2 decimal places if needed) to avoid drift
  return Math.ceil(totalPayable / tenureValue)
}

/**
 * Calculates penalties based on 3-day grace period
 */
export function calculateLateFee(
  dueDate: Date | string,
  overdueAmount: number,
  penaltyEnabled: boolean,
  penaltyType: PenaltyType,
  penaltyValue: number,
  graceDays: number = 3
): number {
  if (!penaltyEnabled || penaltyValue <= 0) return 0
  
  const today = new Date()
  const due = new Date(dueDate)
  const daysLate = differenceInDays(today, due)
  
  if (daysLate <= graceDays) return 0
  
  if (penaltyType === 'fixed') {
    return penaltyValue // One-time fee
  } else {
    // Daily interest on overdue amount
    return (overdueAmount * (penaltyValue / 100) * daysLate)
  }
}

/**
 * Calculates the target due date based on start date and tenure
 */
export function calculateDueDate(
  startDate: Date | string,
  installmentType: InstallmentType,
  tenureValue: number
): string {
  const start = new Date(startDate)
  let end: Date

  switch (installmentType) {
    case 'daily':
      end = addDays(start, tenureValue)
      break
    case 'weekly':
      end = addWeeks(start, tenureValue)
      break
    case 'monthly':
      end = addMonths(start, tenureValue)
      break
    default:
      end = start
  }

  return format(end, 'yyyy-MM-dd')
}

/**
 * Generates a standard collection reminder message
 */
export function getWhatsAppReminder(
  customerName: string,
  amount: number,
  dueDate: string,
  isOverdue: boolean = false,
  penalty: number = 0
): string {
  const formattedAmount = `Rs. ${amount.toLocaleString()}`
  const formattedPenalty = penalty > 0 ? ` plus an accumulated penalty of Rs. ${penalty.toLocaleString()}` : ''
  
  if (isOverdue) {
    return `Hello ${customerName}, your payment of ${formattedAmount}${formattedPenalty} is currently OVERDUE (Due was ${dueDate}). Please settle immediately to stop further penalty accrual. Thank you.`
  }
  
  return `Hello ${customerName}, this is a friendly reminder that your payment of ${formattedAmount} is due on ${dueDate}. Thank you.`
}
