import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { updateFormatCache } from '@/src/lib/utils'

export interface AppSettings {
  // Business Defaults
  defaultInterestRate: string
  defaultInstallmentType: 'daily' | 'weekly' | 'monthly'
  defaultCurrency: 'Rs' | 'LKR' | '$'
  penaltyGraceDays: string

  // Notifications
  overdueAlerts: boolean
  paymentReminders: boolean
  reminderDaysBefore: string
  dailySummary: boolean

  // Privacy
  dataMasking: boolean
  autoLockTimer: 'off' | '1' | '5' | '15'

  // Display
  compactMode: boolean
  showDecimals: boolean

  // Regional
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  phonePrefix: string
}

const DEFAULT_SETTINGS: AppSettings = {
  defaultInterestRate: '10',
  defaultInstallmentType: 'monthly',
  defaultCurrency: 'Rs',
  penaltyGraceDays: '3',
  overdueAlerts: true,
  paymentReminders: true,
  reminderDaysBefore: '1',
  dailySummary: false,
  dataMasking: false,
  autoLockTimer: 'off',
  compactMode: false,
  showDecimals: true,
  dateFormat: 'DD/MM/YYYY',
  phonePrefix: '+94',
}

interface SettingsContextType {
  settings: AppSettings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSetting: () => {},
  resetSettings: () => {},
})

const STORAGE_KEY = '@lendtrack_app_settings'

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const merged = { ...DEFAULT_SETTINGS, ...parsed }
          setSettings(merged)
          updateFormatCache(merged.defaultCurrency, merged.showDecimals, merged.dateFormat)
        } catch (e) {
          console.error('Failed to parse settings:', e)
        }
      }
    })
  }, [])

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value }
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      updateFormatCache(next.defaultCurrency, next.showDecimals, next.dateFormat)
      return next
    })
  }

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS)
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
    updateFormatCache(DEFAULT_SETTINGS.defaultCurrency, DEFAULT_SETTINGS.showDecimals, DEFAULT_SETTINGS.dateFormat)
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
