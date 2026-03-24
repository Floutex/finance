import type { Tables } from "./database.types"

type MonthlyIncome = Tables<"monthly_incomes">

const PROPORTIONAL_PAIR = ["Antônio", "Júlia"]

/**
 * Resolve the income for a person in a given month.
 * First checks for an exact match, then falls back to the most recent is_fixed=true entry.
 */
export function resolveIncomeForMonth(
  person: string,
  yearMonth: string,
  allIncomes: MonthlyIncome[]
): number | null {
  // Exact match for the month
  const exact = allIncomes.find(i => i.person === person && i.year_month === yearMonth)
  if (exact) return exact.amount

  // Fallback: most recent fixed entry before or equal to this month
  const fixed = allIncomes
    .filter(i => i.person === person && i.is_fixed && i.year_month <= yearMonth)
    .sort((a, b) => b.year_month.localeCompare(a.year_month))

  return fixed.length > 0 ? fixed[0].amount : null
}

/**
 * Build a lookup: Map<yearMonth, Map<person, income>>
 * Handles fixed income propagation for all months that have transactions.
 */
export function buildIncomeMap(
  allIncomes: MonthlyIncome[],
  transactionMonths: string[]
): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>()

  for (const month of transactionMonths) {
    const monthMap = new Map<string, number>()
    for (const person of PROPORTIONAL_PAIR) {
      const income = resolveIncomeForMonth(person, month, allIncomes)
      if (income !== null) {
        monthMap.set(person, income)
      }
    }
    map.set(month, monthMap)
  }

  return map
}

/**
 * Calculate each participant's share of a transaction amount.
 * Uses proportional split for Antônio+Júlia when both have income data.
 */
export function calculateShares(
  transaction: { amount: number; participants: string[] },
  monthIncomes: Map<string, number> | undefined
): Map<string, number> {
  const { amount, participants } = transaction
  const shares = new Map<string, number>()

  if (participants.length === 0) return shares

  const equalShare = amount / participants.length

  const bothPresent =
    PROPORTIONAL_PAIR.every(p => participants.includes(p))

  const bothHaveIncome =
    bothPresent &&
    monthIncomes !== undefined &&
    PROPORTIONAL_PAIR.every(p => monthIncomes.has(p))

  if (!bothHaveIncome) {
    // Fallback: equal split
    for (const p of participants) {
      shares.set(p, equalShare)
    }
    return shares
  }

  // Proportional split for the pair
  const antonioIncome = monthIncomes!.get("Antônio")!
  const juliaIncome = monthIncomes!.get("Júlia")!
  const totalIncome = antonioIncome + juliaIncome

  if (totalIncome === 0) {
    // Both incomes are 0 — fall back to equal split
    for (const p of participants) {
      shares.set(p, equalShare)
    }
    return shares
  }

  const combinedShare = equalShare * 2
  const antonioShare = combinedShare * (antonioIncome / totalIncome)
  const juliaShare = combinedShare * (juliaIncome / totalIncome)

  for (const p of participants) {
    if (p === "Antônio") {
      shares.set(p, antonioShare)
    } else if (p === "Júlia") {
      shares.set(p, juliaShare)
    } else {
      shares.set(p, equalShare)
    }
  }

  return shares
}

/**
 * Get a specific person's share in a transaction, using monthly income data.
 */
export function getPersonShare(
  participant: string,
  transaction: { amount: number; participants: string[]; date: string },
  incomeMap: Map<string, Map<string, number>>
): number {
  const yearMonth = transaction.date.slice(0, 7)
  const monthIncomes = incomeMap.get(yearMonth)
  const shares = calculateShares(transaction, monthIncomes)
  return shares.get(participant) ?? (transaction.amount / Math.max(transaction.participants.length, 1))
}
