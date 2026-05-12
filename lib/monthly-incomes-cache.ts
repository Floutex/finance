"use client"

import {
  getMonthlyIncomes,
  upsertMonthlyIncome,
  deleteMonthlyIncome,
} from "@/lib/supabase"
import type { Tables } from "@/lib/database.types"

export type MonthlyIncome = Tables<"monthly_incomes">

interface MonthlyIncomesCache {
  data: MonthlyIncome[] | null
  loading: boolean
  error: string | null
  promise: Promise<MonthlyIncome[]> | null
}

let cache: MonthlyIncomesCache = {
  data: null,
  loading: false,
  error: null,
  promise: null,
}

function setCacheState(patch: Partial<MonthlyIncomesCache>) {
  cache = { ...cache, ...patch }
  notifySubscribers()
}

const subscribers = new Set<() => void>()

function notifySubscribers() {
  subscribers.forEach((cb) => cb())
}

export function subscribeToMonthlyIncomes(callback: () => void): () => void {
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function getMonthlyIncomesFromCache(): MonthlyIncomesCache {
  return cache
}

async function runFetch(): Promise<MonthlyIncome[]> {
  try {
    const { data, error } = await getMonthlyIncomes()
    if (error) {
      setCacheState({
        error: error.message,
        data: cache.data ?? [],
        loading: false,
        promise: null,
      })
      throw error
    }
    setCacheState({
      data: data ?? [],
      loading: false,
      promise: null,
      error: null,
    })
    return data ?? []
  } catch (e) {
    setCacheState({ loading: false, promise: null })
    throw e
  }
}

export async function fetchMonthlyIncomes(): Promise<MonthlyIncome[]> {
  if (cache.promise) return cache.promise
  if (cache.data !== null) return Promise.resolve(cache.data)
  const promise = runFetch()
  setCacheState({ loading: true, error: null, promise })
  return promise
}

export function updateMonthlyIncomesCache(
  updater: (prev: MonthlyIncome[]) => MonthlyIncome[]
) {
  if (cache.data === null) return
  setCacheState({ data: updater(cache.data) })
}

export function invalidateMonthlyIncomesCache() {
  setCacheState({ data: null, loading: false, error: null, promise: null })
}

export async function reloadMonthlyIncomes(): Promise<MonthlyIncome[]> {
  if (cache.data === null) {
    setCacheState({ promise: null })
    return fetchMonthlyIncomes()
  }
  if (cache.promise) return cache.promise
  const promise = runFetch()
  setCacheState({ loading: true, error: null, promise })
  return promise
}

export async function upsertMonthlyIncomeAndReload(
  person: string,
  yearMonth: string,
  amount: number,
  isFixed: boolean
) {
  const { error } = await upsertMonthlyIncome(person, yearMonth, amount, isFixed)
  if (error) throw new Error(error.message)
  await reloadMonthlyIncomes()
}

export async function deleteMonthlyIncomeAndReload(id: string) {
  const { error } = await deleteMonthlyIncome(id)
  if (error) throw new Error(error.message)
  await reloadMonthlyIncomes()
}

if (typeof window !== "undefined") {
  fetchMonthlyIncomes().catch(() => {
    /* errors are tracked in the cache */
  })
}
