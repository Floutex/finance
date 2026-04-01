import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { simplifyDebts } from "@/lib/debt-simplification"

const ANTONIO = "Antônio"
const CORS = { "Access-Control-Allow-Origin": "*" }

function lastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number)
  // Day 0 of next month = last day of current month
  const last = new Date(year, month, 0)
  return last.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month") // YYYY-MM

    if (month && !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month format. Use YYYY-MM (e.g. 2026-03)" },
        { status: 400, headers: CORS }
      )
    }

    const cutoffDate = month ? lastDayOfMonth(month) : null

    const supabase = getSupabaseClient()

    let txQuery = supabase.from("shared_transactions").select("*").eq("is_hidden", false)
    if (cutoffDate) txQuery = txQuery.lte("date", cutoffDate)

    let incQuery = supabase.from("monthly_incomes").select("*")
    if (month) incQuery = incQuery.lte("year_month", month)

    const [{ data: transactions, error: txError }, { data: incomes, error: incomeError }] = await Promise.all([
      txQuery,
      incQuery,
    ])

    if (txError) {
      return NextResponse.json(
        { error: "Failed to fetch transactions", details: txError.message },
        { status: 500, headers: CORS }
      )
    }

    if (incomeError) {
      return NextResponse.json(
        { error: "Failed to fetch incomes", details: incomeError.message },
        { status: 500, headers: CORS }
      )
    }

    const incomeMap = new Map<string, Map<string, number>>()
    for (const inc of incomes ?? []) {
      if (!incomeMap.has(inc.year_month)) incomeMap.set(inc.year_month, new Map())
      incomeMap.get(inc.year_month)!.set(inc.person, inc.amount)
    }

    const allDebts = simplifyDebts(
      (transactions ?? [])
        .filter((t) => t.paid_by && t.amount && t.participants)
        .map((t) => ({
          paid_by: t.paid_by,
          amount: t.amount!,
          date: t.date,
          participants: t.participants!,
        })),
      incomeMap
    )

    const antonioDebts = allDebts.filter((d) => d.from === ANTONIO || d.to === ANTONIO)

    let netBalance = 0
    for (const debt of antonioDebts) {
      if (debt.to === ANTONIO) netBalance += debt.amount
      else if (debt.from === ANTONIO) netBalance -= debt.amount
    }

    return NextResponse.json(
      {
        net_balance: Number(netBalance.toFixed(2)),
        debts: antonioDebts.map((d) => ({ from: d.from, to: d.to, amount: d.amount })),
        month: month ?? "all",
        updated_at: new Date().toISOString(),
      },
      { headers: CORS }
    )
  } catch (err) {
    console.error("[ahub-balance] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: CORS }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  )
}
