import 'react-native-url-polyfill/auto'
import { decode } from 'base-64'

// React Native lacks atob natively; Supabase needs it to decode JWT Auth Tokens securely.
if (typeof global.atob === 'undefined') {
  global.atob = decode
}

import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://cocpqakejhbkmzjfmlym.supabase.co'
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNvY3BxYWtlamhia216amZtbHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyOTA1MzksImV4cCI6MjA4Nzg2NjUzOX0.0ElN1qCsYyGX2v1el6jsRYwnj8rHTqOfT5cjnTSV1GA'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
