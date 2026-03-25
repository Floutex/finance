import { NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { simplifyDebts } from "@/lib/debt-simplification"

export async function GET() {
  const supabase = getSupabaseClient()

  const [{ data: transactions, error: txError }, { data: incomes, error: incError }] =
    await Promise.all([
      supabase.from("shared_transactions").select("*").eq("is_hidden", false),
      supabase.from("monthly_incomes").select("*"),
    ])

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })
  if (incError) return NextResponse.json({ error: incError.message }, { status: 500 })

  const incomeMap = new Map<string, Map<string, number>>()
  for (const inc of incomes ?? []) {
    if (!incomeMap.has(inc.year_month)) incomeMap.set(inc.year_month, new Map())
    incomeMap.get(inc.year_month)!.set(inc.person, inc.amount)
  }

  const debts = simplifyDebts(
    (transactions ?? [])
      .filter((t) => t.paid_by && t.amount && t.participants)
      .map((t) => ({ paid_by: t.paid_by, amount: t.amount!, date: t.date, participants: t.participants! })),
    incomeMap
  )

  return NextResponse.json(debts)
}
