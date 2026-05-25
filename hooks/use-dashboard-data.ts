"use client"

import * as React from "react"

import {
  applyQuickRange,
  computeDashboardMetrics,
  type DashboardMetrics,
} from "@/lib/v2/dashboard-metrics"
import type { Tables } from "@/lib/database.types"
import type { TransactionsToolbarValue } from "@/components/v2/transactions/transactions-toolbar"

const EMPTY_TOOLBAR: TransactionsToolbarValue = {
  search: "",
  start: "",
  end: "",
  activeRange: null,
}

export type DateRange = { min: string; max: string }
export type EffectiveFilters = { search: string; start?: string; end?: string }

export type UseDashboardDataArgs = {
  transactions: Tables<"shared_transactions">[]
  monthlyIncomes: Tables<"monthly_incomes">[]
  memberNames: string[]
  currentUser: string | null | undefined
  /** Admin escape hatch: see everyone's transactions. */
  viewAll?: boolean
}

export type UseDashboardDataResult = {
  toolbar: TransactionsToolbarValue
  setToolbar: React.Dispatch<React.SetStateAction<TransactionsToolbarValue>>
  fullDateRange: DateRange
  effectiveFilters: EffectiveFilters
  /** Null until `currentUser` is known. */
  metrics: DashboardMetrics | null
  /** Days covered by the effective filter (or full range). Min 1 if any data. */
  daysInPeriod: number
}

/**
 * Shared dashboard derivations: toolbar state + computed metrics + period span.
 * Used by both the member-facing `/dashboard` and the guest `/g/[token]` shells
 * so the two never drift.
 */
export function useDashboardData({
  transactions,
  monthlyIncomes,
  memberNames,
  currentUser,
  viewAll,
}: UseDashboardDataArgs): UseDashboardDataResult {
  const [toolbar, setToolbar] = React.useState<TransactionsToolbarValue>(EMPTY_TOOLBAR)

  const fullDateRange = React.useMemo<DateRange>(() => {
    if (transactions.length === 0) return { min: "", max: "" }
    const dates = transactions.map((t) => t.date).sort()
    return { min: dates[0], max: dates[dates.length - 1] }
  }, [transactions])

  const effectiveFilters = React.useMemo<EffectiveFilters>(() => {
    if (toolbar.activeRange) {
      const r = applyQuickRange(fullDateRange, toolbar.activeRange)
      return { search: toolbar.search, start: r.start, end: r.end }
    }
    return {
      search: toolbar.search,
      start: toolbar.start || undefined,
      end: toolbar.end || undefined,
    }
  }, [toolbar, fullDateRange])

  const metrics = React.useMemo(() => {
    if (!currentUser) return null
    return computeDashboardMetrics({
      transactions,
      monthlyIncomes,
      memberNames,
      currentUser,
      filters: effectiveFilters,
      viewAll,
    })
  }, [
    currentUser,
    transactions,
    monthlyIncomes,
    memberNames,
    effectiveFilters,
    viewAll,
  ])

  const daysInPeriod = React.useMemo(() => {
    const start = effectiveFilters.start || fullDateRange.min
    const end = effectiveFilters.end || fullDateRange.max
    if (!start || !end) return 0
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    if (Number.isNaN(s) || Number.isNaN(e) || e < s) return 0
    return Math.max(1, Math.floor((e - s) / 86_400_000) + 1)
  }, [effectiveFilters, fullDateRange])

  return { toolbar, setToolbar, fullDateRange, effectiveFilters, metrics, daysInPeriod }
}
