"use client"

import * as React from "react"
import {
  Command,
  HandCoins,
  Plus,
  Receipt,
  ScanLine,
  Tag,
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
  createPendingRequest,
  createTransaction,
  markRequestPaid,
  softDeleteTransaction,
  updateTransaction,
  type CreatePayload,
  type CreatePendingRequestPayload,
} from "@/lib/v2/transaction-mutations"

import { Button } from "@/components/v2/primitives/button"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import { MetricCard } from "@/components/v2/finance/metric-card"
import { BalanceCard } from "@/components/v2/finance/balance-card"
import { BalanceChart } from "@/components/v2/charts/balance-chart"
import { CategoryPieChart } from "@/components/v2/charts/category-pie-chart"
import { LazyMount } from "@/components/v2/charts/lazy-mount"
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
import dynamic from "next/dynamic"

const ReceiptAnalyzeSheet = dynamic(
  () =>
    import("@/components/v2/transactions/receipt-analyze-sheet").then(
      (m) => m.ReceiptAnalyzeSheet
    ),
  { ssr: false }
)
import { PendingRequests } from "@/components/v2/transactions/pending-requests"
import {
  RequestDialog,
  type RequestPayload,
} from "@/components/v2/transactions/request-dialog"
import { MobileTransactionsList } from "@/components/v2/transactions/mobile-transactions-list"
import { MobileFiltersSheet } from "@/components/v2/transactions/mobile-filters-sheet"
import { Fab } from "@/components/v2/layout/fab"
import { useHotkeys } from "@/hooks/use-hotkeys"
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
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [markingPaidIds, setMarkingPaidIds] = React.useState<Set<string>>(
    () => new Set()
  )

  const memberNames = React.useMemo(() => members.map((m) => m.name), [members])
  const isAdmin = user === ADMIN_USER

  useHotkeys(
    React.useMemo(
      () => [
        {
          key: "n",
          handler: (e) => {
            e.preventDefault()
            setSheetMode("create")
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
      []
    )
  )

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

  const handleCreateRequest = async (payload: RequestPayload) => {
    if (!user) return
    try {
      const created = await createPendingRequest({
        ...payload,
        currentUser: user,
      } as CreatePendingRequestPayload)
      updateCache((prev) => [created, ...prev])
      toast.success("Solicitação enviada.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar solicitação.")
    }
  }

  const handleMarkPaid = async (transaction: Transaction) => {
    if (!user) return
    setMarkingPaidIds((prev) => {
      const next = new Set(prev)
      next.add(transaction.id)
      return next
    })
    try {
      const updated = await markRequestPaid(transaction.id, user)
      updateCache((prev) =>
        prev.map((t) => (t.id === transaction.id ? updated : t))
      )
      toast.success("Cobrança marcada como paga.")
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Falha ao marcar como pago."
      )
    } finally {
      setMarkingPaidIds((prev) => {
        const next = new Set(prev)
        next.delete(transaction.id)
        return next
      })
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
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
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" onClick={() => setReceiptOpen(true)}>
            <ScanLine />
            Analisar recibo
          </Button>
          <Button variant="outline" onClick={() => setRequestOpen(true)}>
            <HandCoins />
            Solicitar
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
          <BalanceCard totalBalance={metrics!.totalBalance} />

          <section className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:pb-0 [&>*]:min-w-[78%] [&>*]:snap-start md:[&>*]:min-w-0">
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
              label="Top categoria"
              icon={<Tag />}
              hint={
                metrics!.topCategory && metrics!.periodStats.totalSpend > 0 ? (
                  <span className="flex items-center gap-1.5">
                    <span className="tabular-nums">
                      {Math.round(
                        (metrics!.topCategory.total /
                          metrics!.periodStats.totalSpend) *
                          100
                      )}
                      %
                    </span>
                    <span>do total do grupo</span>
                  </span>
                ) : (
                  "Sem dados no período"
                )
              }
            >
              {metrics!.topCategory ? (
                <div className="flex w-full min-w-0 flex-col gap-0.5">
                  <span className="truncate font-display text-2xl font-semibold">
                    {metrics!.topCategory.category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <span className="tabular-nums">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(metrics!.topCategory.total)}
                    </span>
                  </span>
                </div>
              ) : (
                <span className="font-display text-3xl font-semibold text-muted-foreground">
                  —
                </span>
              )}
            </MetricCard>
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

          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LazyMount minHeight={336}>
              <CategoryPieChart
                title="Você por categoria"
                description="Gastos pagos por você no período"
                data={metrics!.categoryTotals}
                drilldownFor={(category) =>
                  metrics!.filteredTransactions
                    .filter(
                      (t) =>
                        t.paid_by === user &&
                        (t.category?.trim() || "Sem categoria") === category
                    )
                    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
                    .slice(0, 8)
                    .map((t) => ({
                      category:
                        t.description?.trim() || "Sem descrição",
                      total: t.amount ?? 0,
                    }))
                }
              />
            </LazyMount>
            <LazyMount minHeight={336}>
              <CategoryPieChart
                title="Grupo por categoria"
                description="Todas as transações em que você está envolvido"
                data={metrics!.globalCategoryTotals}
                drilldownFor={(category) =>
                  metrics!.filteredTransactions
                    .filter(
                      (t) =>
                        (t.category?.trim() || "Sem categoria") === category
                    )
                    .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
                    .slice(0, 8)
                    .map((t) => ({
                      category:
                        t.description?.trim() || "Sem descrição",
                      total: t.amount ?? 0,
                    }))
                }
              />
            </LazyMount>
          </section>

          <LazyMount minHeight={336}>
            <BalanceChart
              series={metrics!.chartSeries}
              startDate={effectiveFilters.start}
              endDate={effectiveFilters.end}
            />
          </LazyMount>

          <PendingRequests
            requests={metrics!.pendingRequests}
            participants={participants}
            markingPaidIds={markingPaidIds}
            onMarkPaid={handleMarkPaid}
            onCreate={() => setRequestOpen(true)}
          />

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Transações</h2>
                <p className="text-xs text-muted-foreground">
                  Todas as transações visíveis para você no período.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <TransactionsToolbar
                value={toolbar}
                onChange={setToolbar}
                disabledQuickRange={!fullDateRange.max}
                className="flex-1"
              />
              <MobileFiltersSheet value={toolbar} onChange={setToolbar} />
            </div>
            <div className="hidden md:block">
              <TransactionsTable
                transactions={metrics!.filteredTransactions}
                participants={participants}
                enableSelection
                rowSelection={rowSelection}
                onRowSelectionChange={setRowSelection}
                rowActions={rowActionsRenderer}
              />
            </div>
            <div className="md:hidden">
              <MobileTransactionsList
                transactions={metrics!.filteredTransactions}
                participants={participants}
                selection={rowSelection as Record<string, boolean>}
                onToggleSelect={(id, next) =>
                  setRowSelection((prev) => {
                    const out = { ...prev }
                    if (next) out[id] = true
                    else delete out[id]
                    return out
                  })
                }
                onRowClick={(t) => setSheetMode({ kind: "edit", transaction: t })}
              />
            </div>
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

      {/* Request payment dialog */}
      <RequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onSubmit={handleCreateRequest}
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

      {/* Mobile floating action button */}
      <Fab onClick={() => setSheetMode("create")} aria-label="Nova transação" />
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
