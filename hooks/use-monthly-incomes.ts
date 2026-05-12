"use client"

import { useEffect, useState } from "react"
import { getMonthlyIncomes } from "@/lib/supabase"
import type { Tables } from "@/lib/database.types"

type MonthlyIncome = Tables<"monthly_incomes">

/**
 * Lightweight hook to load all monthly incomes once on mount.
 * Mirrors the legacy `useEffect` pattern in spreadsheet-dashboard.
 */
export function useMonthlyIncomes() {
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getMonthlyIncomes().then(({ data }) => {
      if (cancelled) return
      if (data) setIncomes(data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return { incomes, loading }
}
