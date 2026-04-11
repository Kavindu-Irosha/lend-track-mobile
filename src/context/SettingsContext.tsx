import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { updateOptimizationCache } from '@/src/lib/utils'

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
  
  // Performance
  performanceMode: boolean
  hapticsEnabled: boolean
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
  performanceMode: false,
  hapticsEnabled: true,
}

interface SettingsContextType {
  settings: AppSettings
  isApplying: boolean
  triggerLayoutTransition: (callback: () => void) => void
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  isApplying: false,
  triggerLayoutTransition: () => {},
  updateSetting: () => {},
  resetSettings: () => {},
})

const STORAGE_KEY = '@lendtrack_app_settings'

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const merged = { ...DEFAULT_SETTINGS, ...parsed }
          setSettings(merged)
          updateOptimizationCache(
            merged.defaultCurrency, 
            merged.showDecimals, 
            merged.dateFormat, 
            merged.hapticsEnabled, 
            merged.performanceMode
          )
        } catch (e) {
          console.error('Failed to parse settings:', e)
        }
      }
    })
  }, [])

  const triggerLayoutTransition = (callback: () => void) => {
    setIsApplying(true)
    // Delay setting change slightly to let overlay appear
    setTimeout(() => {
      callback()
      // Let layout recalculate before removing overlay
      setTimeout(() => {
        setIsApplying(false)
      }, 600)
    }, 100)
  }

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    const applyUpdate = () => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value }
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        updateOptimizationCache(
          next.defaultCurrency, 
          next.showDecimals, 
          next.dateFormat, 
          next.hapticsEnabled, 
          next.performanceMode
        )
        return next
      })
    }

    // Toggling layout-heavy settings triggers a global transition for smoothness
    if (key === 'compactMode' || key === 'performanceMode') {
      triggerLayoutTransition(applyUpdate)
    } else {
      applyUpdate()
    }
  }

  const resetSettings = () => {
    triggerLayoutTransition(() => {
      setSettings(DEFAULT_SETTINGS)
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS))
      updateOptimizationCache(
        DEFAULT_SETTINGS.defaultCurrency, 
        DEFAULT_SETTINGS.showDecimals, 
        DEFAULT_SETTINGS.dateFormat, 
        DEFAULT_SETTINGS.hapticsEnabled, 
        DEFAULT_SETTINGS.performanceMode
      )
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, isApplying, triggerLayoutTransition, updateSetting, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
