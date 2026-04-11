import React, { createContext, useContext, useEffect, useState } from 'react'
import * as LocalAuthentication from 'expo-local-authentication'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { supabase } from '@/src/lib/supabase'
import { triggerHapticImpact, triggerHapticNotification } from '@/src/lib/utils'

interface SecurityContextType {
  isBiometricEnabled: boolean
  setBiometricEnabled: (enabled: boolean) => Promise<void>
  isAuthenticated: boolean
  authenticate: () => Promise<boolean>
  hasHardware: boolean
  isEnrolled: boolean
  loading: boolean
  saveCredentials: (email: string, pass: string) => Promise<void>
  clearCredentials: () => Promise<void>
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

const STORAGE_KEY = '@lendtrack_biometric_enabled'
const CRED_KEY = 'lendtrack_secure_creds'

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
      await SecureStore.deleteItemAsync(CRED_KEY)
      setIsBiometricEnabled(false)
      setIsAuthenticated(true)
      triggerHapticNotification()
    }
  }

  const saveCredentials = async (email: string, pass: string) => {
    if (isBiometricEnabled) {
      await SecureStore.setItemAsync(CRED_KEY, JSON.stringify({ email, pass }), {
        // We omit requireAuthentication because Android BiometricPrompt frequently fails 
        // to generate the hardware cipher synchronously when trying to write to Keystore.
        // Data is still fundamentally encrypted at REST securely via AES-256.
        keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
      })
    }
  }

  const clearCredentials = async () => {
    await SecureStore.deleteItemAsync(CRED_KEY)
  }

  const authenticate = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock LendTrack',
        fallbackLabel: 'Use Passcode',
        disableDeviceFallback: false,
      })
      
      if (result.success) {
        // Handle Auto-Login
        // Now we can read the credentials because we've just passed biometrics
        const stored = await SecureStore.getItemAsync(CRED_KEY)
        if (stored) {
          try {
            const { email, pass } = JSON.parse(stored)
            const { data } = await supabase.auth.getSession()
            if (!data.session) {
              await supabase.auth.signInWithPassword({ email, password: pass })
            }
          } catch (e) {
            console.error('Auto-login failed:', e)
          }
        }
        setIsAuthenticated(true)
        triggerHapticNotification()
        return true
      }
      triggerHapticNotification('error')
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
        loading,
        saveCredentials,
        clearCredentials 
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
