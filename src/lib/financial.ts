import { addDays, addWeeks, addMonths, format } from 'date-fns'

export type InterestType = 'flat' | 'percent'
export type InstallmentType = 'daily' | 'weekly' | 'monthly'

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
  // If percentage, we assume it's the total interest for the loan duration
  // In professional apps, this might be monthly %, but for now, we'll keep it simple:
  // (Principal * Rate) / 100
  return (principal * interestValue) / 100
}

/**
 * Calculates the installment amount
 */
export function calculateInstallment(
  totalPayable: number,
  installmentType: InstallmentType,
  tenureValue: number // e.g., 5 months, 10 weeks
): number {
  if (tenureValue <= 0) return totalPayable
  return totalPayable / tenureValue
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
  const formattedPenalty = penalty > 0 ? ` plus a penalty of Rs. ${penalty.toLocaleString()}` : ''
  
  if (isOverdue) {
    return `Hello ${customerName}, your payment of ${formattedAmount}${formattedPenalty} was due on ${dueDate}. Please settle as soon as possible to avoid further penalties. Thank you.`
  }
  
  return `Hello ${customerName}, this is a friendly reminder that your payment of ${formattedAmount} is due on ${dueDate}. Thank you.`
}
