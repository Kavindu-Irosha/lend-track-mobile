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

interface AlertContextType {
  alert: AlertOptions | null
  visible: boolean
  showAlert: (options: AlertOptions) => void
  hideAlert: () => void
}

const AlertContext = createContext<AlertContextType | undefined>(undefined)

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alert, setAlert] = useState<AlertOptions | null>(null)
  const [visible, setVisible] = useState(false)

  const showAlert = useCallback((options: AlertOptions) => {
    setAlert(options)
    setVisible(true)
  }, [])

  const hideAlert = useCallback(() => {
    setVisible(false)
  }, [])

  return (
    <AlertContext.Provider value={{ alert, visible, showAlert, hideAlert }}>
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
