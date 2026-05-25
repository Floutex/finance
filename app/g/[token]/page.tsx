"use client"

import * as React from "react"
import { HandCoins } from "lucide-react"

import { useDashboardData } from "@/hooks/use-dashboard-data"

import { Button } from "@/components/v2/primitives/button"
import { DashboardOverview } from "@/components/v2/finance/dashboard-overview"
import { TransactionsWorkspace } from "@/components/v2/transactions/transactions-workspace"
import { GuestPaybackDialog } from "@/components/v2/guest/guest-payback-dialog"
import { useGuestContext } from "@/components/v2/guest/guest-context"

export default function GuestDashboardPage() {
  const { token, state, refresh } = useGuestContext()
  const { participant, members, participants, transactions, monthlyIncomes } = state

  const memberNames = React.useMemo(() => members.map((m) => m.name), [members])
  const {
    toolbar,
    setToolbar,
    fullDateRange,
    effectiveFilters,
    metrics,
    daysInPeriod,
  } = useDashboardData({
    transactions,
    monthlyIncomes,
    memberNames,
    currentUser: participant.name,
  })

  const [paybackOpen, setPaybackOpen] = React.useState(false)

  if (!metrics) return null

  return (
    <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Olá, {participant.name}
          </h1>
        </div>
        <Button onClick={() => setPaybackOpen(true)}>
          <HandCoins />
          Acertar conta
        </Button>
      </header>

      <DashboardOverview
        metrics={metrics}
        currentUser={participant.name}
        effectiveFilters={effectiveFilters}
        daysInPeriod={daysInPeriod}
      />

      <TransactionsWorkspace
        transactions={metrics.filteredTransactions}
        participants={participants}
        toolbar={toolbar}
        onToolbarChange={setToolbar}
        disabledQuickRange={!fullDateRange.max}
        heading={
          <div>
            <h2 className="text-base font-semibold">Transações</h2>
            <p className="text-xs text-muted-foreground">
              Todas as transações em que você aparece no período.
            </p>
          </div>
        }
      />

      <GuestPaybackDialog
        open={paybackOpen}
        onOpenChange={setPaybackOpen}
        token={token}
        guestName={participant.name}
        members={members}
        onSuccess={refresh}
      />
    </div>
  )
}
