import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

let browserClient: SupabaseClient<Database> | undefined

export const getSupabaseClient = () => {
  if (!browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!url || !anonKey) {
      throw new Error('Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.')
    }
    
    browserClient = createClient<Database>(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    })
  }
  return browserClient
}

