"use client"

import * as React from "react"

import type { Tables } from "@/lib/database.types"
import type { Participant } from "@/lib/participants-cache"

export type GuestState = {
  participant: Participant
  members: Participant[]
  /** All non-archived participants (members + active guests). Used for badges. */
  participants: Participant[]
  /** Full transactions set (excluding `is_hidden`). */
  transactions: Tables<"shared_transactions">[]
  monthlyIncomes: Tables<"monthly_incomes">[]
}

type GuestContextValue = {
  token: string
  state: GuestState
  refreshing: boolean
  refresh: () => Promise<void>
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

  const value = React.useMemo<GuestContextValue>(
    () => ({ token, state, refreshing, refresh }),
    [token, state, refreshing, refresh]
  )

  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
}
