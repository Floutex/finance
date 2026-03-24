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

export const bulkDeleteByIds = async (table: keyof Database["public"]["Tables"], ids: string[]) => {
  const client = getSupabaseClient()
  return await client.from(table as "shared_transactions").update({ is_hidden: true } as any).in("id", ids)
}

export const bulkUpdateByIds = async <T extends keyof Database["public"]["Tables"]>(
  table: T,
  ids: string[],
  values: Partial<Database["public"]["Tables"][T]["Update"]>
) => {
  const client = getSupabaseClient()
  return await client.from(table as "shared_transactions").update(values as any).in("id", ids).select("*")
}

export const getCategories = async () => {
  const client = getSupabaseClient()
  return await client.from("categories").select("*").order("name", { ascending: true })
}

export const getMonthlyIncomes = async () => {
  const client = getSupabaseClient()
  return await client.from("monthly_incomes").select("*").order("year_month", { ascending: false })
}

export const upsertMonthlyIncome = async (
  person: string,
  yearMonth: string,
  amount: number,
  isFixed: boolean
) => {
  const client = getSupabaseClient()
  return await client
    .from("monthly_incomes")
    .upsert(
      {
        person,
        year_month: yearMonth,
        amount,
        is_fixed: isFixed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "person,year_month" }
    )
    .select("*")
    .single()
}

export const deleteMonthlyIncome = async (id: string) => {
  const client = getSupabaseClient()
  return await client.from("monthly_incomes").delete().eq("id", id)
}

export const upsertCategory = async (name: string) => {
  const client = getSupabaseClient()
  const value = name.trim()
  if (!value) {
    return { data: null, error: null }
  }
  const { data: existing, error: fetchError } = await client.from("categories").select("name").eq("name", value).maybeSingle()
  if (fetchError) {
    return { data: null, error: fetchError }
  }
  if (existing) {
    return { data: existing, error: null }
  }
  return await client.from("categories").insert({ name: value }).select("name").single()
}

