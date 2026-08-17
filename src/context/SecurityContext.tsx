import React, { createContext, useContext, useEffect, useState } from 'react'
import * as LocalAuthentication from 'expo-local-authentication'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/src/lib/supabase'
import { triggerHapticImpact, triggerHapticNotification, NotificationType } from '@/src/lib/utils'

interface SecurityContextType {
  isBiometricEnabled: boolean
  setBiometricEnabled: (enabled: boolean) => Promise<void>
  isAuthenticated: boolean
  authenticate: () => Promise<boolean>
  hasHardware: boolean
  isEnrolled: boolean
  loading: boolean
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

const STORAGE_KEY = '@lendtrack_biometric_enabled'

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasHardware, setHasHardware] = useState(false)
  const [isEnrolled, setIsEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync()
        setHasHardware(compatible)
        const enrolled = await LocalAuthentication.isEnrolledAsync()
        setIsEnrolled(enrolled)
        const saved = await AsyncStorage.getItem(STORAGE_KEY)
        const isEnabled = saved === 'true'
        setIsBiometricEnabled(isEnabled)
        
        // If not enabled or no hardware, start as authenticated
        if (!isEnabled || !compatible || !enrolled) {
          setIsAuthenticated(true)
        }
      } catch (e) {
        console.error('Security Context Init Error:', e)
        setIsAuthenticated(true)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const setBiometricEnabled = async (enabled: boolean) => {
    if (enabled) {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirm to enable Biometrics',
      })
      if (result.success) {
        await AsyncStorage.setItem(STORAGE_KEY, 'true')
        setIsBiometricEnabled(true)
        triggerHapticNotification()
      }
    } else {
      await AsyncStorage.setItem(STORAGE_KEY, 'false')
      setIsBiometricEnabled(false)
      setIsAuthenticated(true)
      triggerHapticNotification()
    }
  }

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LendTrack',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      })
      
      if (result.success) {
        setIsAuthenticated(true)
        triggerHapticNotification()
        return true
      }
      triggerHapticNotification(NotificationType.Error)
      return false
    } catch (e) {
      console.error('Auth Error:', e)
      return false
    }
  }

  return (
    <SecurityContext.Provider 
      value={{ 
        isBiometricEnabled, 
        setBiometricEnabled, 
        isAuthenticated, 
        authenticate, 
        hasHardware, 
        isEnrolled,
        loading
      }}
    >
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  const context = useContext(SecurityContext)
  if (context === undefined) throw new Error('useSecurity must be used within SecurityProvider')
  return context
}
