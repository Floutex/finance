"use client"

import { useCallback, useEffect, useSyncExternalStore } from "react"
import {
  deleteMonthlyIncomeAndReload,
  fetchMonthlyIncomes,
  getMonthlyIncomesFromCache,
  reloadMonthlyIncomes,
  subscribeToMonthlyIncomes,
  upsertMonthlyIncomeAndReload,
} from "@/lib/monthly-incomes-cache"

/**
 * Hook to load monthly incomes and expose mutation helpers backed by a global
 * cache (shared across all consumers, persists across SPA navigation).
 */
export function useMonthlyIncomes() {
  const cache = useSyncExternalStore(
    subscribeToMonthlyIncomes,
    getMonthlyIncomesFromCache,
    getMonthlyIncomesFromCache
  )

  useEffect(() => {
    if (cache.data === null && !cache.loading) {
      fetchMonthlyIncomes().catch(() => {
        /* errors handled in the cache */
      })
    }
  }, [cache.data, cache.loading])

  const upsert = useCallback(
    async (
      person: string,
      yearMonth: string,
      amount: number,
      isFixed: boolean
    ) => {
      await upsertMonthlyIncomeAndReload(person, yearMonth, amount, isFixed)
    },
    []
  )

  const remove = useCallback(async (id: string) => {
    await deleteMonthlyIncomeAndReload(id)
  }, [])

  const reload = useCallback(async () => {
    await reloadMonthlyIncomes()
  }, [])

  return {
    incomes: cache.data ?? [],
    loading: cache.data === null && cache.loading,
    error: cache.error,
    upsert,
    remove,
    reload,
  }
}
