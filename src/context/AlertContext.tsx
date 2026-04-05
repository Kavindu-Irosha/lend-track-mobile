import React, { createContext, useContext, useState, useCallback } from 'react'

export type AlertType = 'info' | 'success' | 'warning' | 'error'

export interface AlertButton {
  text: string
  onPress?: () => void
  style?: 'default' | 'cancel' | 'destructive'
}

interface AlertOptions {
  title: string
  message?: string
  buttons?: AlertButton[]
  type?: AlertType
}

export interface ToastOptions {
  message: string
  type?: AlertType
  duration?: number
}

interface AlertContextType {
  alert: AlertOptions | null
  visible: boolean
  showAlert: (options: AlertOptions) => void
  hideAlert: () => void
  toast: ToastOptions | null
  showToast: (options: ToastOptions) => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertOptions | null>(null)
  const [visible, setVisible] = useState(false)
  const [toast, setToast] = useState<ToastOptions | null>(null)

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert(options)
    setVisible(true)
  }, [])

  const hideAlert = useCallback(() => {
    setVisible(false)
  }, [])

  const showToast = useCallback((options: ToastOptions) => {
    setToast(options)
    setTimeout(() => {
      setToast(null)
    }, options.duration || 3000)
  }, [])

  return (
    <AlertContext.Provider value={{ alert, visible, showAlert, hideAlert, toast, showToast }}>
      {children}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (context === undefined) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}
