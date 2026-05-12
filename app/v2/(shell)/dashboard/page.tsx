"use client"

import * as React from "react"
import {
  Command,
  Plus,
  Receipt,
  ScanLine,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { toast } from "sonner"
import type { RowSelectionState } from "@tanstack/react-table"

import { useTransactions } from "@/hooks/use-transactions"
import { useParticipants } from "@/hooks/use-participants"
import { useMonthlyIncomes } from "@/hooks/use-monthly-incomes"
import { useSessionUser } from "@/hooks/use-session-user"

import { ADMIN_USER } from "@/lib/constants"
import {
  applyQuickRange,
  computeDashboardMetrics,
} from "@/lib/v2/dashboard-metrics"
import {
  bulkSoftDelete,
  bulkUpdate,
  createTransaction,
  softDeleteTransaction,
  updateTransaction,
  type CreatePayload,
} from "@/lib/v2/transaction-mutations"

import { Button } from "@/components/v2/primitives/button"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import { MetricCard } from "@/components/v2/finance/metric-card"
import { BalanceCard } from "@/components/v2/finance/balance-card"
import { BalanceChart } from "@/components/v2/charts/balance-chart"
import { CategoryPieChart } from "@/components/v2/charts/category-pie-chart"
import { TransactionsTable } from "@/components/v2/transactions/transactions-table"
import {
  TransactionsToolbar,
  type TransactionsToolbarValue,
} from "@/components/v2/transactions/transactions-toolbar"
import { TransactionSheet } from "@/components/v2/transactions/transaction-sheet"
import { TransactionRowActions } from "@/components/v2/transactions/transaction-row-actions"
import { DeleteTransactionDialog } from "@/components/v2/transactions/delete-transaction-dialog"
import { QuickAdd } from "@/components/v2/transactions/quick-add"
import { BulkActionsBar } from "@/components/v2/transactions/bulk-actions-bar"
import {
  BulkAdvancedEditDialog,
  BulkQuickEditDialog,
} from "@/components/v2/transactions/bulk-edit-dialogs"
import { ReceiptAnalyzeSheet } from "@/components/v2/transactions/receipt-analyze-sheet"
import type { Tables } from "@/lib/database.types"

type Transaction = Tables<"shared_transactions">

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Bom dia"
  if (h < 18) return "Boa tarde"
  return "Boa noite"
}

const EMPTY_TOOLBAR: TransactionsToolbarValue = {
  search: "",
  start: "",
  end: "",
  activeRange: null,
}

type SheetMode = null | "create" | { kind: "edit"; transaction: Transaction }

export default function DashboardPage() {
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

  const [toolbar, setToolbar] = React.useState<TransactionsToolbarValue>(EMPTY_TOOLBAR)
  const [sheetMode, setSheetMode] = React.useState<SheetMode>(null)
  const [pendingDelete, setPendingDelete] = React.useState<Transaction | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [bulkQuickEditOpen, setBulkQuickEditOpen] = React.useState(false)
  const [bulkAdvancedOpen, setBulkAdvancedOpen] = React.useState(false)
  const [bulkPending, setBulkPending] = React.useState(false)
  const [receiptOpen, setReceiptOpen] = React.useState(false)

  const memberNames = React.useMemo(() => members.map((m) => m.name), [members])
  const isAdmin = user === ADMIN_USER

  const fullDateRange = React.useMemo(() => {
    if (transactions.length === 0) return { min: "", max: "" }
    const dates = transactions.map((t) => t.date).sort()
    return { min: dates[0], max: dates[dates.length - 1] }
  }, [transactions])

  const effectiveFilters = React.useMemo(() => {
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
    if (!user) return null
    return computeDashboardMetrics({
      transactions,
      monthlyIncomes: incomes,
      memberNames,
      currentUser: user,
      filters: effectiveFilters,
    })
  }, [user, transactions, incomes, memberNames, effectiveFilters])

  const isLoading = !user || txLoading || pLoading || incLoading || !metrics

  // ── Selection helpers ─────────────────────────────────────────────────────
  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
  )

  // Drop selections that no longer exist (filters changed, etc.).
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

  // ── Mutations ────────────────────────────────────────────────────────────
  const handleCreate = async (
    values: Omit<CreatePayload, "currentUser">
  ) => {
    if (!user) return
    try {
      const created = await createTransaction({ ...values, currentUser: user })
      updateCache((prev) => [created, ...prev])
      toast.success("Transação criada.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar.")
      throw e
    }
  }

  const handleEdit = async (
    id: string,
    values: Omit<CreatePayload, "currentUser">
  ) => {
    if (!user) return
    try {
      const updated = await updateTransaction({ ...values, id, currentUser: user })
      updateCache((prev) => prev.map((t) => (t.id === id ? updated : t)))
      toast.success("Transação atualizada.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.")
      throw e
    }
  }

  const handleDelete = async () => {
    if (!user || !pendingDelete) return
    if (!isAdmin && pendingDelete.paid_by !== user) {
      toast.error("Você só pode deletar transações que você pagou.")
      setPendingDelete(null)
      return
    }
    setDeleting(true)
    try {
      await softDeleteTransaction(pendingDelete.id, user)
      updateCache((prev) => prev.filter((t) => t.id !== pendingDelete.id))
      setRowSelection((prev) => {
        const next = { ...prev }
        delete next[pendingDelete.id]
        return next
      })
      toast.success("Transação excluída.")
      setPendingDelete(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao excluir.")
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!user) return
    const unauthorized = metrics?.filteredTransactions.filter(
      (t) => selectedIds.includes(t.id) && !isAdmin && t.paid_by !== user
    )
    if (unauthorized && unauthorized.length > 0) {
      toast.error(
        `Você não pode excluir ${unauthorized.length} transações (não foi você quem pagou).`
      )
      return
    }
    setBulkPending(true)
    try {
      await bulkSoftDelete(selectedIds, user)
      await reloadTransactions()
      setRowSelection({})
      toast.success(`${selectedIds.length} transações excluídas.`)
      setBulkDeleteOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no bulk delete.")
    } finally {
      setBulkPending(false)
    }
  }

  const handleBulkQuickEdit = async (input: {
    field: "category" | "paid_by"
    value: string
  }) => {
    if (!user) return
    setBulkPending(true)
    try {
      const values: Record<string, string | null> = {}
      if (input.field === "category") {
        values.category = input.value.trim() || null
      } else {
        values.paid_by = input.value.trim()
      }
      await bulkUpdate(selectedIds, values as any, user)
      await reloadTransactions()
      setRowSelection({})
      toast.success("Transações atualizadas.")
      setBulkQuickEditOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no bulk update.")
    } finally {
      setBulkPending(false)
    }
  }

  const handleBulkAdvancedEdit = async (input: {
    category?: string
    paid_by?: string
    date?: string
  }) => {
    if (!user) return
    setBulkPending(true)
    try {
      const values: Record<string, unknown> = {}
      if (input.category) values.category = input.category
      if (input.paid_by) values.paid_by = input.paid_by
      if (input.date) values.date = input.date
      await bulkUpdate(selectedIds, values as any, user)
      await reloadTransactions()
      setRowSelection({})
      toast.success("Transações atualizadas.")
      setBulkAdvancedOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no bulk update.")
    } finally {
      setBulkPending(false)
    }
  }

  const handleReceiptSaved = (created: Transaction[]) => {
    updateCache((prev) => [...created, ...prev])
    toast.success(
      `${created.length} ${created.length === 1 ? "transação criada" : "transações criadas"} a partir do recibo.`
    )
  }

  // ── Render ──────────────────────────────────────────────────────────────
  const defaultParticipants = React.useMemo(
    () => participants.map((p) => p.name),
    [participants]
  )

  const rowActionsRenderer = React.useCallback(
    (t: Transaction) => (
      <TransactionRowActions
        transaction={t}
        canDelete={isAdmin || t.paid_by === user}
        onEdit={(transaction) =>
          setSheetMode({ kind: "edit", transaction })
        }
        onDelete={(transaction) => setPendingDelete(transaction)}
      />
    ),
    [isAdmin, user]
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-8 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Dashboard
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {getGreeting()}
            {user ? `, ${user}` : ""}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setReceiptOpen(true)}>
            <ScanLine />
            Analisar recibo
          </Button>
          <Button variant="outline" onClick={() => triggerCmdK()}>
            <Command />
            <span>Quick-add</span>
            <kbd className="hidden rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline-block">
              ⌘K
            </kbd>
          </Button>
          <Button onClick={() => setSheetMode("create")}>
            <Plus />
            Nova transação
          </Button>
        </div>
      </header>

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <BalanceCard
            currentUser={user!}
            totalBalance={metrics!.totalBalance}
            myDebts={metrics!.myDebts}
            participants={participants}
          />

          <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <MetricCard
              label="Gastos no período"
              value={metrics!.periodStats.totalSpend}
              icon={<Receipt />}
              hint={`${metrics!.periodStats.transactionCount} transações`}
            />
            <MetricCard
              label="Você pagou"
              value={metrics!.periodStats.mySpend}
              icon={<Wallet />}
              hint={
                metrics!.periodStats.totalSpend > 0
                  ? `${Math.round(
                      (metrics!.periodStats.mySpend /
                        metrics!.periodStats.totalSpend) *
                        100
                    )}% do total`
                  : "Sem transações no período"
              }
            />
            <MetricCard
              label="Saldo líquido"
              value={metrics!.totalBalance}
              signed
              icon={
                metrics!.totalBalance >= 0 ? <TrendingUp /> : <TrendingDown />
              }
              hint={
                metrics!.totalBalance > 0
                  ? "A receber"
                  : metrics!.totalBalance < 0
                  ? "A pagar"
                  : "Quitado"
              }
              trend={
                metrics!.totalBalance > 0
                  ? "up"
                  : metrics!.totalBalance < 0
                  ? "down"
                  : "neutral"
              }
            />
            <MetricCard
              label="Pendentes"
              icon={<Receipt />}
              hint={
                metrics!.pendingRequests.length === 0
                  ? "Nenhuma cobrança em aberto"
                  : "Cobranças aguardando pagamento"
              }
            >
              <span className="font-display text-3xl font-semibold">
                {metrics!.pendingRequests.length}
              </span>
            </MetricCard>
          </section>

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
            <BalanceChart
              series={metrics!.chartSeries}
              startDate={effectiveFilters.start}
              endDate={effectiveFilters.end}
            />
            <CategoryPieChart
              title="Você por categoria"
              description="Gastos pagos por você no período"
              data={metrics!.categoryTotals}
            />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Transações</h2>
                <p className="text-xs text-muted-foreground">
                  Todas as transações visíveis para você no período.
                </p>
              </div>
            </div>
            <TransactionsToolbar
              value={toolbar}
              onChange={setToolbar}
              disabledQuickRange={!fullDateRange.max}
            />
            <TransactionsTable
              transactions={metrics!.filteredTransactions}
              participants={participants}
              enableSelection
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              rowActions={rowActionsRenderer}
            />
          </section>
        </>
      )}

      {/* Floating bulk actions */}
      <BulkActionsBar
        count={selectedIds.length}
        onQuickEdit={() => setBulkQuickEditOpen(true)}
        onAdvancedEdit={() => setBulkAdvancedOpen(true)}
        onDelete={() => setBulkDeleteOpen(true)}
        onClear={() => setRowSelection({})}
      />

      {/* Create / edit sheet */}
      <TransactionSheet
        open={sheetMode !== null}
        onOpenChange={(o) => {
          if (!o) setSheetMode(null)
        }}
        mode={
          sheetMode === "create"
            ? "create"
            : sheetMode
            ? { transaction: sheetMode.transaction }
            : "create"
        }
        currentUser={user ?? ""}
        createDefaults={{
          paid_by: user ?? undefined,
          participants: defaultParticipants,
        }}
        onSubmit={async (values) => {
          if (sheetMode === "create" || sheetMode === null) {
            await handleCreate(values)
          } else {
            await handleEdit(sheetMode.transaction.id, values)
          }
        }}
      />

      {/* Single row delete */}
      <DeleteTransactionDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
        label={pendingDelete?.description ?? undefined}
        pending={deleting}
        onConfirm={handleDelete}
      />

      {/* Bulk delete */}
      <DeleteTransactionDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        count={selectedIds.length}
        pending={bulkPending}
        onConfirm={handleBulkDelete}
      />

      {/* Bulk quick edit */}
      <BulkQuickEditDialog
        open={bulkQuickEditOpen}
        onOpenChange={setBulkQuickEditOpen}
        count={selectedIds.length}
        pending={bulkPending}
        onConfirm={handleBulkQuickEdit}
      />

      {/* Bulk advanced edit */}
      <BulkAdvancedEditDialog
        open={bulkAdvancedOpen}
        onOpenChange={setBulkAdvancedOpen}
        count={selectedIds.length}
        pending={bulkPending}
        onConfirm={handleBulkAdvancedEdit}
      />

      {/* Receipt OCR sheet */}
      <ReceiptAnalyzeSheet
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        currentUser={user ?? ""}
        onSaved={handleReceiptSaved}
      />

      {/* Cmd+K palette (mounts its own keyboard listener) */}
      {user && (
        <QuickAdd
          currentUser={user}
          defaultParticipants={defaultParticipants}
          onSubmit={handleCreate}
        />
      )}
    </div>
  )
}

/** Manually dispatch a Cmd+K event so the visible button feels first-class. */
function triggerCmdK() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true })
  )
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Skeleton className="h-80 rounded-xl" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}
