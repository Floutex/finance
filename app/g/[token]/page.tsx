"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { HandCoins, Plus, ScanLine, Sparkles } from "lucide-react"
import type { RowSelectionState } from "@tanstack/react-table"

import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useDashboardMutations } from "@/hooks/use-dashboard-mutations"
import { useHotkeys } from "@/hooks/use-hotkeys"

import { Button } from "@/components/v2/primitives/button"
import { DashboardOverview } from "@/components/v2/finance/dashboard-overview"
import { TransactionsWorkspace } from "@/components/v2/transactions/transactions-workspace"
import { TransactionSheet } from "@/components/v2/transactions/transaction-sheet"
import { TransactionRowActions } from "@/components/v2/transactions/transaction-row-actions"
import { DeleteTransactionDialog } from "@/components/v2/transactions/delete-transaction-dialog"
import { QuickAdd } from "@/components/v2/transactions/quick-add"
import { BulkActionsBar } from "@/components/v2/transactions/bulk-actions-bar"
import {
  BulkAdvancedEditDialog,
  BulkQuickEditDialog,
} from "@/components/v2/transactions/bulk-edit-dialogs"
import { PendingRequests } from "@/components/v2/transactions/pending-requests"
import { RequestDialog } from "@/components/v2/transactions/request-dialog"
import { Fab } from "@/components/v2/layout/fab"
import { useGuestContext } from "@/components/v2/guest/guest-context"
import type { Tables } from "@/lib/database.types"

const ReceiptAnalyzeSheet = dynamic(
  () =>
    import("@/components/v2/transactions/receipt-analyze-sheet").then(
      (m) => m.ReceiptAnalyzeSheet
    ),
  { ssr: false }
)

type Transaction = Tables<"shared_transactions">

function triggerCmdK() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true })
  )
}

export default function GuestDashboardPage() {
  const { state, refresh, updateTransactions } = useGuestContext()
  const { participant, members, participants, transactions, monthlyIncomes } = state
  const user = participant.name

  const memberNames = React.useMemo(() => members.map((mm) => mm.name), [members])
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
    currentUser: user,
  })

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  )

  const mut = useDashboardMutations({
    currentUser: user,
    isAdmin: false,
    filteredTransactions: metrics?.filteredTransactions,
    selectedIds,
    updateCache: updateTransactions,
    reload: refresh,
    setRowSelection,
  })

  useHotkeys(
    React.useMemo(
      () => [
        {
          key: "n",
          handler: (e) => {
            e.preventDefault()
            mut.setSheetMode("create")
          },
        },
        {
          key: "/",
          handler: (e) => {
            const el = document.querySelector<HTMLInputElement>(
              'input[placeholder^="Buscar"]'
            )
            if (el) {
              e.preventDefault()
              el.focus()
            }
          },
        },
      ],
      [mut]
    )
  )

  React.useEffect(() => {
    if (selectedIds.length === 0) return
    const visible = new Set(metrics?.filteredTransactions.map((t) => t.id) ?? [])
    let stale = false
    const next: RowSelectionState = {}
    for (const id of selectedIds) {
      if (visible.has(id)) next[id] = true
      else stale = true
    }
    if (stale) setRowSelection(next)
  }, [metrics?.filteredTransactions, selectedIds])

  // Guest pode pagar (own name) e ver members no dropdown. Inclui só ele
  // mesmo + members ativos — outros guests nunca aparecem como "pago por"
  // pra evitar guest A criar transações fingindo que B pagou.
  const payerOptions = React.useMemo(
    () => [{ id: participant.id, name: participant.name }, ...members],
    [participant.id, participant.name, members]
  )

  const defaultParticipants = React.useMemo(
    () => participants.map((p) => p.name),
    [participants]
  )

  const rowActionsRenderer = React.useCallback(
    (t: Transaction) => (
      <TransactionRowActions
        transaction={t}
        canDelete={t.paid_by === user}
        onEdit={(transaction) => mut.setSheetMode({ kind: "edit", transaction })}
        onDelete={(transaction) => mut.setPendingDelete(transaction)}
      />
    ),
    [user, mut]
  )

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
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" onClick={() => mut.setReceiptOpen(true)}>
            <ScanLine />
            Analisar recibo
          </Button>
          <Button variant="outline" onClick={() => mut.setRequestOpen(true)}>
            <HandCoins />
            Solicitar
          </Button>
          <Button variant="outline" onClick={() => triggerCmdK()}>
            <Sparkles />
            <span>Quick-add</span>
            <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline-block">
              ⌘K
            </kbd>
          </Button>
          <Button onClick={() => mut.setSheetMode("create")}>
            <Plus />
            Nova transação
          </Button>
        </div>
      </header>

      <DashboardOverview
        metrics={metrics}
        currentUser={user}
        effectiveFilters={effectiveFilters}
        daysInPeriod={daysInPeriod}
      />

      <PendingRequests
        requests={metrics.pendingRequests}
        participants={participants}
        markingPaidIds={mut.markingPaidIds}
        onMarkPaid={mut.handleMarkPaid}
        onCreate={() => mut.setRequestOpen(true)}
      />

      <TransactionsWorkspace
        transactions={metrics.filteredTransactions}
        participants={participants}
        toolbar={toolbar}
        onToolbarChange={setToolbar}
        disabledQuickRange={!fullDateRange.max}
        enableSelection
        rowSelection={rowSelection}
        onRowSelectionChange={setRowSelection}
        rowActions={rowActionsRenderer}
        onRowClick={(t) => mut.setSheetMode({ kind: "edit", transaction: t })}
        heading={
          <div>
            <h2 className="text-base font-semibold">Transações</h2>
            <p className="text-xs text-muted-foreground">
              Todas as transações em que você aparece no período.
            </p>
          </div>
        }
      />

      <BulkActionsBar
        count={selectedIds.length}
        onQuickEdit={() => mut.setBulkQuickEditOpen(true)}
        onAdvancedEdit={() => mut.setBulkAdvancedOpen(true)}
        onDelete={() => mut.setBulkDeleteOpen(true)}
        onClear={() => setRowSelection({})}
      />

      <TransactionSheet
        open={mut.sheetMode !== null}
        onOpenChange={(o) => {
          if (!o) mut.setSheetMode(null)
        }}
        mode={
          mut.sheetMode === "create"
            ? "create"
            : mut.sheetMode
            ? { transaction: mut.sheetMode.transaction }
            : "create"
        }
        currentUser={user}
        createDefaults={{
          paid_by: user,
          participants: defaultParticipants,
        }}
        payerOptions={payerOptions}
        onSubmit={async (values) => {
          if (mut.sheetMode === "create" || mut.sheetMode === null) {
            await mut.handleCreate(values)
          } else {
            await mut.handleEdit(mut.sheetMode.transaction.id, values)
          }
        }}
      />

      <DeleteTransactionDialog
        open={mut.pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) mut.setPendingDelete(null)
        }}
        label={mut.pendingDelete?.description ?? undefined}
        pending={mut.deleting}
        onConfirm={mut.handleDelete}
      />

      <DeleteTransactionDialog
        open={mut.bulkDeleteOpen}
        onOpenChange={mut.setBulkDeleteOpen}
        count={selectedIds.length}
        pending={mut.bulkPending}
        onConfirm={mut.handleBulkDelete}
      />

      <BulkQuickEditDialog
        open={mut.bulkQuickEditOpen}
        onOpenChange={mut.setBulkQuickEditOpen}
        count={selectedIds.length}
        pending={mut.bulkPending}
        onConfirm={mut.handleBulkQuickEdit}
      />

      <BulkAdvancedEditDialog
        open={mut.bulkAdvancedOpen}
        onOpenChange={mut.setBulkAdvancedOpen}
        count={selectedIds.length}
        pending={mut.bulkPending}
        onConfirm={mut.handleBulkAdvancedEdit}
      />

      <RequestDialog
        open={mut.requestOpen}
        onOpenChange={mut.setRequestOpen}
        onSubmit={mut.handleCreateRequest}
      />

      <ReceiptAnalyzeSheet
        open={mut.receiptOpen}
        onOpenChange={mut.setReceiptOpen}
        currentUser={user}
        onSaved={mut.handleReceiptSaved}
        payerOptions={payerOptions}
      />

      <QuickAdd
        currentUser={user}
        defaultParticipants={defaultParticipants}
        onCreate={mut.handleCreate}
        payerNames={[user]}
      />

      <Fab onClick={() => mut.setSheetMode("create")} aria-label="Nova transação" />
    </div>
  )
}
