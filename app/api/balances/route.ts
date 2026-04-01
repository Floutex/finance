import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { simplifyDebts } from "@/lib/debt-simplification"
import { USERS } from "@/lib/constants"

const CORS = { "Access-Control-Allow-Origin": "*" }

export async function GET(req: NextRequest) {
  const pin = req.headers.get("x-pin")
  const user = USERS.find((u) => u.pin === pin)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS })
  }

  const supabase = getSupabaseClient()

  const [{ data: transactions, error: txError }, { data: incomes, error: incError }] =
    await Promise.all([
      supabase.from("shared_transactions").select("*").eq("is_hidden", false),
      supabase.from("monthly_incomes").select("*"),
    ])

  if (txError) return NextResponse.json({ error: txError.message }, { status: 500, headers: CORS })
  if (incError) return NextResponse.json({ error: incError.message }, { status: 500, headers: CORS })

  const incomeMap = new Map<string, Map<string, number>>()
  for (const inc of incomes ?? []) {
    if (!incomeMap.has(inc.year_month)) incomeMap.set(inc.year_month, new Map())
    incomeMap.get(inc.year_month)!.set(inc.person, inc.amount)
  }

  const allDebts = simplifyDebts(
    (transactions ?? [])
      .filter((t) => t.paid_by && t.amount && t.participants)
      .map((t) => ({ paid_by: t.paid_by, amount: t.amount!, date: t.date, participants: t.participants! })),
    incomeMap
  )

  let netBalance = 0
  for (const debt of allDebts) {
    if (debt.to === user.name) netBalance += debt.amount
    else if (debt.from === user.name) netBalance -= debt.amount
  }

  return NextResponse.json(Number(netBalance.toFixed(2)), { headers: CORS })
}

export async function OPTIONS() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        ...CORS,
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-pin",
      },
    }
  )
}
