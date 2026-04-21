import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/src/lib/supabase'
import { registerForPushNotificationsAsync } from '@/src/lib/notifications'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session with improved error handling
    async function initSession() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (initialSession) {
          // Immediately set the session to allow the UI to render and avoid white screens/crashes
          setSession(initialSession)
          setUser(initialSession.user)
        } else if (error) {
           const isRefreshTokenError = error.message.includes('Refresh Token')
           if (isRefreshTokenError) {
             await supabase.auth.signOut()
           }
        }
      } catch (e) {
        console.error('Initial Auth check error:', e)
      } finally {
        setLoading(false)
      }
    }
    
    initSession()

    // Setup function to handle token registration
    const handlePushToken = async (userId: string) => {
      try {
        const token = await registerForPushNotificationsAsync()
        if (token) {
          // Push to Supabase matching our new user_devices schema
          await supabase.from('user_devices').upsert({
            user_id: userId,
            expo_push_token: token,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id, expo_push_token' })
        }
      } catch (e) {
        console.warn('Silent fail for push token upload:', e)
      }
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Attempt push registration on new sign in
          handlePushToken(session.user.id)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Passive Background Verification:
  // Once the app is stable and we've landed on a screen, we verify if the user exists on the server.
  // This avoids calling getUser() during the high-pressure splash screen startup phase.
  useEffect(() => {
    if (!user || loading) return

    const timer = setTimeout(async () => {
      try {
         const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser()
         if (userError || !verifiedUser) {
           console.warn('Ghost session detected, clearing storage...')
           await signOut()
         } else if (verifiedUser) {
            // Smoothly sync the verified user data without interrupting the flow
            setUser(verifiedUser)
         }
      } catch (e) {
         console.warn('Background verification failed (likely offline):', e)
      }
    }, 2000)

    return () => clearTimeout(timer)
  }, [user?.id, loading])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error: error?.message ?? null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
