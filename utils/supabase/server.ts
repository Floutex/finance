import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

export const createSupabaseServerClient = (): SupabaseClient<Database> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.')
  }
  
  return createClient<Database>(url, anonKey)
}
