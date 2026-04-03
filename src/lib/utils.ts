export function formatCurrency(amount: number | string) {
  const numericAmount = Number(amount) || 0
  return `Rs. ${new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)}`
}
