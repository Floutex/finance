"use client"

import * as React from "react"
import { HandCoins } from "lucide-react"

import { useDashboardData } from "@/hooks/use-dashboard-data"

import { Button } from "@/components/v2/primitives/button"
import { TransactionsWorkspace } from "@/components/v2/transactions/transactions-workspace"
import { GuestPaybackDialog } from "@/components/v2/guest/guest-payback-dialog"
import { useGuestContext } from "@/components/v2/guest/guest-context"

export default function GuestTransactionsPage() {
  const { token, state, refresh } = useGuestContext()
  const { participant, members, participants, transactions, monthlyIncomes } = state

  const memberNames = React.useMemo(() => members.map((m) => m.name), [members])
  const { toolbar, setToolbar, fullDateRange, metrics } = useDashboardData({
    transactions,
    monthlyIncomes,
    memberNames,
    currentUser: participant.name,
  })

  const [paybackOpen, setPaybackOpen] = React.useState(false)

  if (!metrics) return null

  return (
    <div className="flex flex-col gap-6 py-6 md:gap-8 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Transações
          </p>
          <h2 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
            Todas as transações
          </h2>
          <p className="text-sm text-muted-foreground">
            {metrics.filteredTransactions.length} de {metrics.userTransactions.length} visíveis
          </p>
        </div>
        <Button onClick={() => setPaybackOpen(true)}>
          <HandCoins />
          Acertar conta
        </Button>
      </div>

      <TransactionsWorkspace
        transactions={metrics.filteredTransactions}
        participants={participants}
        toolbar={toolbar}
        onToolbarChange={setToolbar}
        disabledQuickRange={!fullDateRange.max}
        pageSize={50}
        mobilePageSize={30}
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
