"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Command, HandCoins, Plus, ScanLine, Users } from "lucide-react"
import { toast } from "sonner"
import type { RowSelectionState } from "@tanstack/react-table"

import { useTransactions } from "@/hooks/use-transactions"
import { useParticipants } from "@/hooks/use-participants"
import { useMonthlyIncomes } from "@/hooks/use-monthly-incomes"
import { useSessionUser } from "@/hooks/use-session-user"
import { useDashboardData } from "@/hooks/use-dashboard-data"
import { useHotkeys } from "@/hooks/use-hotkeys"

import { isAdminUser } from "@/lib/constants"
import {
  bulkSoftDelete,
  bulkUpdate,
  createPendingRequest,
  createTransaction,
  softDeleteTransaction,
  updateTransaction,
  type CreatePayload,
  type CreatePendingRequestPayload,
} from "@/lib/v2/transaction-mutations"

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
import {
  RequestDialog,
  type RequestPayload,
} from "@/components/v2/transactions/request-dialog"
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

type SheetMode = null | "create" | { kind: "edit"; transaction: Transaction }

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

  const initialLoadComplete =
    !!user && !txLoading && !pLoading && !incLoading && !!metrics
  const hasShownContentRef = React.useRef(false)
  if (initialLoadComplete) hasShownContentRef.current = true
  const isLoading = !hasShownContentRef.current

  const selectedIds = React.useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection]
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

  const handleCreate = async (values: Omit<CreatePayload, "currentUser">) => {
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
      if (input.field === "category") values.category = input.value.trim() || null
      else values.paid_by = input.value.trim()
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

  const handleReceiptSaved = (created: Transaction[]) => {
    updateCache((prev) => [...created, ...prev])
    toast.success(
      `${created.length} ${created.length === 1 ? "transação criada" : "transações criadas"} a partir do recibo.`
    )
  }

  const defaultParticipants = React.useMemo(
    () => participants.map((p) => p.name),
    [participants]
  )

  const rowActionsRenderer = React.useCallback(
    (t: Transaction) => (
      <TransactionRowActions
        transaction={t}
        canDelete={isAdmin || t.paid_by === user}
        onEdit={(transaction) => setSheetMode({ kind: "edit", transaction })}
        onDelete={(transaction) => setPendingDelete(transaction)}
      />
    ),
    [isAdmin, user]
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
          onRowClick={(t) => setSheetMode({ kind: "edit", transaction: t })}
          pageSize={50}
          mobilePageSize={30}
        />
      )}

      <BulkActionsBar
        count={selectedIds.length}
        onQuickEdit={() => setBulkQuickEditOpen(true)}
        onAdvancedEdit={() => setBulkAdvancedOpen(true)}
        onDelete={() => setBulkDeleteOpen(true)}
        onClear={() => setRowSelection({})}
      />

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

      <DeleteTransactionDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null)
        }}
        label={pendingDelete?.description ?? undefined}
        pending={deleting}
        onConfirm={handleDelete}
      />

      <DeleteTransactionDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        count={selectedIds.length}
        pending={bulkPending}
        onConfirm={handleBulkDelete}
      />

      <BulkQuickEditDialog
        open={bulkQuickEditOpen}
        onOpenChange={setBulkQuickEditOpen}
        count={selectedIds.length}
        pending={bulkPending}
        onConfirm={handleBulkQuickEdit}
      />

      <BulkAdvancedEditDialog
        open={bulkAdvancedOpen}
        onOpenChange={setBulkAdvancedOpen}
        count={selectedIds.length}
        pending={bulkPending}
        onConfirm={handleBulkAdvancedEdit}
      />

      <RequestDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        onSubmit={handleCreateRequest}
      />

      <ReceiptAnalyzeSheet
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        currentUser={user ?? ""}
        onSaved={handleReceiptSaved}
      />

      {user && (
        <QuickAdd
          currentUser={user}
          defaultParticipants={defaultParticipants}
        />
      )}

      <Fab onClick={() => setSheetMode("create")} aria-label="Nova transação" />
    </div>
  )
}

function triggerCmdK() {
  window.dispatchEvent(
    new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true })
  )
}
