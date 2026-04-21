import 'react-native-url-polyfill/auto'
import { decode } from 'base-64'

// React Native lacks atob natively; Supabase needs it to decode JWT Auth Tokens securely.
if (typeof global.atob === 'undefined') {
  global.atob = decode
}

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
