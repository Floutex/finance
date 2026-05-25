"use client"

import * as React from "react"

import type { Tables } from "@/lib/database.types"
import type { Participant } from "@/lib/participants-cache"

type Transaction = Tables<"shared_transactions">

export type GuestState = {
  participant: Participant
  members: Participant[]
  /** All non-archived participants (members + active guests). Used for badges. */
  participants: Participant[]
  /** Full transactions set (excluding `is_hidden`). */
  transactions: Transaction[]
  monthlyIncomes: Tables<"monthly_incomes">[]
}

type GuestContextValue = {
  token: string
  state: GuestState
  refreshing: boolean
  refresh: () => Promise<void>
  /** Optimistic local cache update — same shape as `useTransactions().updateCache`. */
  updateTransactions: (updater: (prev: Transaction[]) => Transaction[]) => void
}

const GuestContext = React.createContext<GuestContextValue | null>(null)

export function useGuestContext(): GuestContextValue {
  const ctx = React.useContext(GuestContext)
  if (!ctx) {
    throw new Error("useGuestContext deve ser usado dentro de <GuestProvider>")
  }
  return ctx
}

export function GuestProvider({
  token,
  initialState,
  children,
}: {
  token: string
  initialState: GuestState
  children: React.ReactNode
}) {
  const [state, setState] = React.useState<GuestState>(initialState)
  const [refreshing, setRefreshing] = React.useState(false)

  const refresh = React.useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/guest/${token}/state`, { cache: "no-store" })
      const json = await res.json()
      if (res.ok) setState(json)
    } finally {
      setRefreshing(false)
    }
  }, [token])

  const updateTransactions = React.useCallback(
    (updater: (prev: Transaction[]) => Transaction[]) => {
      setState((prev) => ({ ...prev, transactions: updater(prev.transactions) }))
    },
    []
  )

  const value = React.useMemo<GuestContextValue>(
    () => ({ token, state, refreshing, refresh, updateTransactions }),
    [token, state, refreshing, refresh, updateTransactions]
  )

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
}
