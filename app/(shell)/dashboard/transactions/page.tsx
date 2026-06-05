"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { HandCoins, Plus, ScanLine, Sparkles, Users } from "lucide-react"
import type { RowSelectionState } from "@tanstack/react-table"

import { useTransactions } from "@/hooks/use-transactions"
import { useParticipants } from "@/hooks/use-participants"
import { useMonthlyIncomes } from "@/hooks/use-monthly-incomes"
import { useSessionUser } from "@/hooks/use-session-user"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useDashboardMutations } from "@/hooks/use-dashboard-mutations"
import { useHotkeys } from "@/hooks/use-hotkeys"

import { isAdminUser } from "@/lib/constants"

import { Button } from "@/components/v2/primitives/button"
import { Skeleton } from "@/components/v2/primitives/skeleton"
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
import { RequestDialog } from "@/components/v2/transactions/request-dialog"
import { Fab } from "@/components/v2/layout/fab"
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

export default function TransactionsPage() {
  const user = useSessionUser()
  const {
    transactions,
    loading: txLoading,
    updateCache,
    reload: reloadTransactions,
  } = useTransactions()
  const {
    active: participants,
    members,
    loading: pLoading,
  } = useParticipants()
  const { incomes, loading: incLoading } = useMonthlyIncomes()

  const memberNames = React.useMemo(() => members.map((m) => m.name), [members])
  const isAdmin = isAdminUser(user)

  const [viewAll, setViewAll] = React.useState(false)
  const { toolbar, setToolbar, fullDateRange, metrics } = useDashboardData({
    transactions,
    monthlyIncomes: incomes,
    memberNames,
    currentUser: user,
    viewAll,
  })

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  )

  const m = useDashboardMutations({
    currentUser: user,
    isAdmin,
    filteredTransactions: metrics?.filteredTransactions,
    selectedIds,
    updateCache,
    reload: reloadTransactions,
    setRowSelection,
  })

  useHotkeys(
    React.useMemo(
      () => [
        {
          key: "n",
          handler: (e) => {
            e.preventDefault()
            m.setSheetMode("create")
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
      [m]
    )
  )

  const initialLoadComplete =
    !!user && !txLoading && !pLoading && !incLoading && !!metrics
  const hasShownContentRef = React.useRef(false)
  if (initialLoadComplete) hasShownContentRef.current = true
  const isLoading = !hasShownContentRef.current

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

  const defaultParticipants = React.useMemo(
    () => participants.map((p) => p.name),
    [participants]
  )

  const rowActionsRenderer = React.useCallback(
    (t: Transaction) => (
      <TransactionRowActions
        transaction={t}
        canDelete={isAdmin || t.paid_by === user}
        onEdit={(transaction) => m.setSheetMode({ kind: "edit", transaction })}
        onDelete={(transaction) => m.setPendingDelete(transaction)}
      />
    ),
    [isAdmin, user, m]
  )

  return (
    <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Transações
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Todas as transações
          </h1>
          <p className="text-sm text-muted-foreground">
            {metrics
              ? `${metrics.filteredTransactions.length} de ${metrics.userTransactions.length} visíveis`
              : "—"}
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          {isAdmin && (
            <Button
              variant={viewAll ? "default" : "outline"}
              onClick={() => setViewAll((v) => !v)}
              aria-pressed={viewAll}
            >
              <Users />
              {viewAll ? "Vendo tudo" : "Ver tudo"}
            </Button>
          )}
          <Button variant="outline" onClick={() => m.setReceiptOpen(true)}>
            <ScanLine />
            Analisar recibo
          </Button>
          <Button variant="outline" onClick={() => m.setRequestOpen(true)}>
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
          <Button onClick={() => m.setSheetMode("create")}>
            <Plus />
            Nova
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-[600px] w-full rounded-xl" />
        </div>
      ) : (
        <TransactionsWorkspace
          transactions={metrics!.filteredTransactions}
          participants={participants}
          toolbar={toolbar}
          onToolbarChange={setToolbar}
          disabledQuickRange={!fullDateRange.max}
          enableSelection
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          rowActions={rowActionsRenderer}
          onRowClick={(t) => m.setSheetMode({ kind: "edit", transaction: t })}
          pageSize={50}
          mobilePageSize={30}
        />
      )}

      <BulkActionsBar
        count={selectedIds.length}
        onQuickEdit={() => m.setBulkQuickEditOpen(true)}
        onAdvancedEdit={() => m.setBulkAdvancedOpen(true)}
        onDelete={() => m.setBulkDeleteOpen(true)}
        onClear={() => setRowSelection({})}
      />

      <TransactionSheet
        open={m.sheetMode !== null}
        onOpenChange={(o) => {
          if (!o) m.setSheetMode(null)
        }}
        mode={
          m.sheetMode === "create"
            ? "create"
            : m.sheetMode
            ? { transaction: m.sheetMode.transaction }
            : "create"
        }
        currentUser={user ?? ""}
        createDefaults={{
          paid_by: user ?? undefined,
          participants: defaultParticipants,
        }}
        onSubmit={async (values) => {
          if (m.sheetMode === "create" || m.sheetMode === null) {
            await m.handleCreate(values)
          } else {
            await m.handleEdit(m.sheetMode.transaction.id, values)
          }
        }}
      />

      <DeleteTransactionDialog
        open={m.pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) m.setPendingDelete(null)
        }}
        label={m.pendingDelete?.description ?? undefined}
        pending={m.deleting}
        onConfirm={m.handleDelete}
      />

      <DeleteTransactionDialog
        open={m.bulkDeleteOpen}
        onOpenChange={m.setBulkDeleteOpen}
        count={selectedIds.length}
        pending={m.bulkPending}
        onConfirm={m.handleBulkDelete}
      />

      <BulkQuickEditDialog
        open={m.bulkQuickEditOpen}
        onOpenChange={m.setBulkQuickEditOpen}
        count={selectedIds.length}
        pending={m.bulkPending}
        onConfirm={m.handleBulkQuickEdit}
      />

      <BulkAdvancedEditDialog
        open={m.bulkAdvancedOpen}
        onOpenChange={m.setBulkAdvancedOpen}
        count={selectedIds.length}
        pending={m.bulkPending}
        onConfirm={m.handleBulkAdvancedEdit}
      />

      <RequestDialog
        open={m.requestOpen}
        onOpenChange={m.setRequestOpen}
        onSubmit={m.handleCreateRequest}
      />

      <ReceiptAnalyzeSheet
        open={m.receiptOpen}
        onOpenChange={m.setReceiptOpen}
        currentUser={user ?? ""}
        onSaved={m.handleReceiptSaved}
      />

      {user && (
        <QuickAdd
          currentUser={user}
          defaultParticipants={defaultParticipants}
          onCreateMany={m.handleCreateMany}
        />
      )}

      <Fab onClick={() => m.setSheetMode("create")} aria-label="Nova transação" />
    </div>
  )
}
