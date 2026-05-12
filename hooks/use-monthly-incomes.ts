"use client"

import { useCallback, useEffect, useState } from "react"
import {
  deleteMonthlyIncome,
  getMonthlyIncomes,
  upsertMonthlyIncome,
} from "@/lib/supabase"
import type { Tables } from "@/lib/database.types"

type MonthlyIncome = Tables<"monthly_incomes">

/**
 * Hook to load monthly incomes and expose mutation helpers backed by
 * `upsertMonthlyIncome` and `deleteMonthlyIncome`. Cache is local; refetch is
 * called after each successful mutation.
 */
export function useMonthlyIncomes() {
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await getMonthlyIncomes()
    if (data) setIncomes(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const upsert = useCallback(
    async (
      person: string,
      yearMonth: string,
      amount: number,
      isFixed: boolean
    ) => {
      const { error } = await upsertMonthlyIncome(person, yearMonth, amount, isFixed)
      if (error) throw new Error(error.message)
      await load()
    },
    [load]
  )

  const remove = useCallback(
    async (id: string) => {
      const { error } = await deleteMonthlyIncome(id)
      if (error) throw new Error(error.message)
      await load()
    },
    [load]
  )

  return { incomes, loading, upsert, remove, reload: load }
}
