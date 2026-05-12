/**
 * Dashboard derivations — pure functions over the same Transaction shape the
 * legacy SpreadsheetDashboard works with. Consolidates the bag of `useMemo`s
 * that lived inside the monolith so the v2 page is just composition.
 */

import { parseISO } from "date-fns"
import type { Tables } from "@/lib/database.types"
import { PENDING_MARKER, normalizeText, ADMIN_USER } from "@/lib/constants"
import { simplifyDebts, type Debt } from "@/lib/debt-simplification"
import { buildIncomeMap, calculateShares } from "@/lib/proportional-split"

export type Transaction = Tables<"shared_transactions">
export type MonthlyIncome = Tables<"monthly_incomes">

export type DateRange = { start?: string; end?: string }
export type Filters = DateRange & { search?: string }

export type CategoryTotal = { category: string; total: number }

export type BalancePoint = { date: string; balance: number }

export type DashboardMetrics = {
  /** Visible transactions for the current user (legacy: Admin sees all). */
  userTransactions: Transaction[]
  /** After date/search filters applied. */
  filteredTransactions: Transaction[]
  /** Pending transactions (paid_by === PENDING_MARKER). */
  pendingRequests: Transaction[]
  /** Period totals derived from filteredTransactions. */
  periodStats: {
    mySpend: number
    totalSpend: number
    transactionCount: number
  }
  /** User-paid category totals (filtered). Sorted alphabetically. */
  categoryTotals: CategoryTotal[]
  /** Global category totals (filtered). Sorted by total desc. */
  globalCategoryTotals: CategoryTotal[]
  /** Top 10 transactions by amount in filtered set. */
  topTransactions: CategoryTotal[]
  /** Running balance time series for current user, over the full transactions
   *  set (chart can re-slice to date range itself). */
  chartSeries: BalancePoint[]
  /** Net debts simplified (over full transactions set). */
  simplifiedDebts: Debt[]
  /** Debts touching current user only, with sign relative to them. */
  myDebts: { from: string; to: string; amount: number }[]
  /** Net balance for current user: positive = receivable, negative = payable. */
  totalBalance: number
  /** First/last dates available across user transactions, for date-range pickers. */
  dateRange: { min: string; max: string }
}

const lower = (v: string | null | undefined) => (v ?? "").toLowerCase()

function passesSearch(t: Transaction, search: string): boolean {
  if (!search) return true
  return (
    lower(normalizeText(t.description)).includes(search) ||
    lower(normalizeText(t.category)).includes(search) ||
    lower(t.paid_by).includes(search)
  )
}

function passesDate(t: Transaction, start?: string, end?: string): boolean {
  if (!start && !end) return true
  // Comparing yyyy-MM-dd strings lexicographically equals chronological order.
  if (start && t.date < start) return false
  if (end && t.date > end) return false
  return true
}

/**
 * Run the full derivation pipeline. Designed to be the single call site for
 * dashboards in v2: feed it transactions/incomes/members + user + filters and
 * it returns everything the page needs to render.
 */
export function computeDashboardMetrics(args: {
  transactions: Transaction[]
  monthlyIncomes: MonthlyIncome[]
  memberNames: string[]
  currentUser: string
  filters?: Filters
}): DashboardMetrics {
  const { transactions, monthlyIncomes, memberNames, currentUser } = args
  const search = (args.filters?.search ?? "").trim().toLowerCase()
  const { start, end } = args.filters ?? {}

  // ── Visibility (mirrors legacy rules) ──
  const isAdmin = currentUser === ADMIN_USER
  const pendingRequests: Transaction[] = []
  const userTransactions: Transaction[] = []
  for (const t of transactions) {
    if (t.paid_by === PENDING_MARKER) {
      pendingRequests.push(t)
      continue
    }
    if (isAdmin) {
      userTransactions.push(t)
    } else if (
      t.paid_by === currentUser ||
      (t.participants ?? []).includes(currentUser)
    ) {
      userTransactions.push(t)
    }
  }

  // ── Date/search filter ──
  const filteredTransactions = userTransactions.filter(
    (t) => passesDate(t, start, end) && passesSearch(t, search)
  )

  // ── Period stats ──
  let mySpend = 0
  let totalSpend = 0
  for (const t of filteredTransactions) {
    const a = t.amount ?? 0
    totalSpend += a
    if (t.paid_by === currentUser) mySpend += a
  }

  // ── Category totals ──
  const myCatMap = new Map<string, number>()
  const globalCatMap = new Map<string, number>()
  for (const t of filteredTransactions) {
    const key = normalizeText(t.category) || "Sem categoria"
    const a = t.amount ?? 0
    globalCatMap.set(key, (globalCatMap.get(key) ?? 0) + a)
    if (t.paid_by === currentUser) {
      myCatMap.set(key, (myCatMap.get(key) ?? 0) + a)
    }
  }
  const categoryTotals: CategoryTotal[] = Array.from(myCatMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => a.category.localeCompare(b.category, "pt-BR"))
  const globalCategoryTotals: CategoryTotal[] = Array.from(globalCatMap.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)

  // ── Top transactions ──
  const topTransactions: CategoryTotal[] = [...filteredTransactions]
    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
    .slice(0, 10)
    .map((t) => ({
      category: normalizeText(t.description) || "Sem descrição",
      total: t.amount ?? 0,
    }))

  // ── Income map (only needs months present in transactions) ──
  const monthsSet = new Set<string>()
  for (const t of transactions) monthsSet.add(t.date.slice(0, 7))
  const incomeMap = buildIncomeMap(monthlyIncomes, Array.from(monthsSet))

  // ── Normalized transactions (sorted by date, shares pre-computed) ──
  const normalized = [...transactions]
    .filter((t) => t.paid_by !== PENDING_MARKER)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((t) => {
      const participants = t.participants ?? memberNames
      const amount = t.amount ?? 0
      const monthIncomes = incomeMap.get(t.date.slice(0, 7))
      const customShares = (t.custom_shares as Record<string, number> | null) ?? undefined
      const shares =
        participants.length === 0
          ? new Map<string, number>()
          : calculateShares({ amount, participants }, monthIncomes, customShares)
      return {
        date: t.date,
        amount,
        paid_by: t.paid_by,
        participants,
        shares,
        custom_shares: customShares ?? null,
      }
    })

  // ── Chart series (running balance for current user) ──
  let running = 0
  const dateBalance = new Map<string, number>()
  for (const t of normalized) {
    if (t.participants.length === 0) continue
    const myShare = t.shares.get(currentUser) ?? t.amount / t.participants.length
    const isParticipant = t.participants.includes(currentUser)
    const isPayer = t.paid_by === currentUser
    if (isPayer && isParticipant) running += t.amount - myShare
    else if (isPayer && !isParticipant) running += t.amount
    else if (!isPayer && isParticipant) running -= myShare
    if (isPayer || isParticipant)
      dateBalance.set(t.date, Number(running.toFixed(2)))
  }
  const chartSeries: BalancePoint[] = Array.from(dateBalance.entries()).map(
    ([date, balance]) => ({ date, balance })
  )

  // ── Debt simplification ──
  const simplifyInputs = transactions
    .filter((t) => t.paid_by !== PENDING_MARKER)
    .map((t) => ({
      paid_by: t.paid_by,
      amount: t.amount ?? 0,
      participants: t.participants ?? memberNames,
      date: t.date,
      custom_shares: (t.custom_shares as Record<string, number> | null) ?? null,
    }))
  const simplifiedDebts = simplifyDebts(simplifyInputs, incomeMap)
  const myDebts = simplifiedDebts.filter(
    (d) => d.from === currentUser || d.to === currentUser
  )
  const totalBalance = myDebts.reduce((acc, d) => {
    if (d.from === currentUser) return acc - d.amount
    if (d.to === currentUser) return acc + d.amount
    return acc
  }, 0)

  // ── Date range bounds (over user-visible txs) ──
  let min = ""
  let max = ""
  if (userTransactions.length > 0) {
    const dates = userTransactions.map((t) => t.date).sort()
    min = dates[0]
    max = dates[dates.length - 1]
  }

  return {
    userTransactions,
    filteredTransactions,
    pendingRequests,
    periodStats: {
      mySpend,
      totalSpend,
      transactionCount: filteredTransactions.length,
    },
    categoryTotals,
    globalCategoryTotals,
    topTransactions,
    chartSeries,
    simplifiedDebts,
    myDebts,
    totalBalance,
    dateRange: { min, max },
  }
}

/** Convenience: subset transactions by a quick range relative to the latest date. */
export function applyQuickRange(
  fullRange: { min: string; max: string },
  range: "1M" | "3M" | "6M" | "1A" | "ALL"
): DateRange {
  if (range === "ALL" || !fullRange.max) return {}
  const last = parseISO(fullRange.max)
  const first = fullRange.min ? parseISO(fullRange.min) : last
  let start = first
  if (range === "1M") start = new Date(last.getFullYear(), last.getMonth() - 1, last.getDate())
  else if (range === "3M") start = new Date(last.getFullYear(), last.getMonth() - 3, last.getDate())
  else if (range === "6M") start = new Date(last.getFullYear(), last.getMonth() - 6, last.getDate())
  else if (range === "1A") start = new Date(last.getFullYear() - 1, last.getMonth(), last.getDate())
  if (start < first) start = first
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  return { start: toISO(start), end: toISO(last) }
}
