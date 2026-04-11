import AsyncStorage from '@react-native-async-storage/async-storage'

const SETTINGS_KEY = '@lendtrack_app_settings'

// Cached settings for synchronous formatting and feedback
let cachedCurrency = 'Rs'
let cachedShowDecimals = true
let cachedDateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD' = 'DD/MM/YYYY'
let cachedHapticsEnabled = true
let cachedPerformanceMode = false

// Initialize cache from storage
AsyncStorage.getItem(SETTINGS_KEY).then((saved) => {
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (parsed.defaultCurrency) cachedCurrency = parsed.defaultCurrency
      if (typeof parsed.showDecimals === 'boolean') cachedShowDecimals = parsed.showDecimals
      if (parsed.dateFormat) cachedDateFormat = parsed.dateFormat
      if (typeof parsed.hapticsEnabled === 'boolean') cachedHapticsEnabled = parsed.hapticsEnabled
      if (typeof parsed.performanceMode === 'boolean') cachedPerformanceMode = parsed.performanceMode
    } catch (e) { /* ignore */ }
  }
})

export function updateOptimizationCache(
  currency: string, 
  showDecimals: boolean, 
  dateFormat: string, 
  haptics: boolean, 
  performance: boolean
) {
  cachedCurrency = currency
  cachedShowDecimals = showDecimals
  cachedDateFormat = dateFormat as any
  cachedHapticsEnabled = haptics
  cachedPerformanceMode = performance
}

import * as Haptics from 'expo-haptics'

// Re-export haptic enums so no other file needs to import expo-haptics directly
export const ImpactStyle = Haptics.ImpactFeedbackStyle
export const NotificationType = Haptics.NotificationFeedbackType

export function triggerHapticImpact(style = Haptics.ImpactFeedbackStyle.Light) {
  if (cachedHapticsEnabled) {
    Haptics.impactAsync(style)
  }
}

export function triggerHapticNotification(type = Haptics.NotificationFeedbackType.Success) {
  if (cachedHapticsEnabled) {
    Haptics.notificationAsync(type)
  }
}

export function triggerHapticSelection() {
  if (cachedHapticsEnabled) {
    Haptics.selectionAsync()
  }
}

export function isPerformanceMode() {
  return cachedPerformanceMode
}

/**
 * Format a date according to user's regional date format setting.
 * @param date - Date object or string
 * @param includeTime - whether to add "hh:mm a" suffix
 */
export function formatAppDate(date: Date | string, includeTime = false): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return String(date)

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  let result: string
  switch (cachedDateFormat) {
    case 'MM/DD/YYYY':
      result = `${month}/${day}/${year}`
      break
    case 'YYYY-MM-DD':
      result = `${year}-${month}-${day}`
      break
    default:
      result = `${day}/${month}/${year}`
  }

  if (includeTime) {
    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    result += ` ${hours}:${minutes} ${ampm}`
  }

  return result
}

export function formatCurrency(amount: number | string) {
  const numericAmount = Number(amount) || 0
  const formatted = new Intl.NumberFormat('en-LK', {
    minimumFractionDigits: cachedShowDecimals ? 2 : 0,
    maximumFractionDigits: cachedShowDecimals ? 2 : 0,
  }).format(numericAmount)
  return `${cachedCurrency}. ${formatted}`
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return 'No phone'
  const clean = phone.replace(/[^0-9+]/g, '')
  if (clean.length < 6) return phone
  return clean.slice(0, 3) + ' ••• ' + clean.slice(-4)
}

export function maskNIC(nic: string | null | undefined): string {
  if (!nic) return 'No NIC'
  if (nic.length < 5) return nic
  return '••••••' + nic.slice(-4)
}

export function formatPhoneSriLanka(phone: string | null | undefined): string {
  if (!phone) return 'No Phone'
  const clean = phone.replace(/[^0-9+]/g, '')
  
  if (clean.startsWith('+94') && clean.length === 12) {
    return `+94 ${clean.substring(3, 5)} ${clean.substring(5, 8)} ${clean.substring(8, 12)}`
  }
  
  if (clean.startsWith('0') && clean.length === 10) {
    return `+94 ${clean.substring(1, 3)} ${clean.substring(3, 6)} ${clean.substring(6, 10)}`
  }

  return phone
}
