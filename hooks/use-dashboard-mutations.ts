"use client"

import * as React from "react"
import { toast } from "sonner"
import type { RowSelectionState } from "@tanstack/react-table"

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
import type { Tables, TablesUpdate } from "@/lib/database.types"
import type { RequestPayload } from "@/components/v2/transactions/request-dialog"

type Transaction = Tables<"shared_transactions">

type SheetMode = null | "create" | { kind: "edit"; transaction: Transaction }

export type UseDashboardMutationsArgs = {
  currentUser: string | null
  isAdmin: boolean
  /** Filtered set used to validate bulk operations. */
  filteredTransactions: Transaction[] | undefined
  selectedIds: string[]
  updateCache: (updater: (prev: Transaction[]) => Transaction[]) => void
  /** Re-fetch the canonical state. Used after bulk ops. Return value ignored. */
  reload: () => Promise<unknown> | unknown
  setRowSelection: React.Dispatch<React.SetStateAction<RowSelectionState>>
}

export type UseDashboardMutationsResult = {
  // Sheet/dialog state
  sheetMode: SheetMode
  setSheetMode: React.Dispatch<React.SetStateAction<SheetMode>>
  pendingDelete: Transaction | null
  setPendingDelete: React.Dispatch<React.SetStateAction<Transaction | null>>
  deleting: boolean
  bulkDeleteOpen: boolean
  setBulkDeleteOpen: React.Dispatch<React.SetStateAction<boolean>>
  bulkQuickEditOpen: boolean
  setBulkQuickEditOpen: React.Dispatch<React.SetStateAction<boolean>>
  bulkAdvancedOpen: boolean
  setBulkAdvancedOpen: React.Dispatch<React.SetStateAction<boolean>>
  bulkPending: boolean
  receiptOpen: boolean
  setReceiptOpen: React.Dispatch<React.SetStateAction<boolean>>
  requestOpen: boolean
  setRequestOpen: React.Dispatch<React.SetStateAction<boolean>>
  markingPaidIds: Set<string>
  // Handlers
  handleCreate: (values: Omit<CreatePayload, "currentUser">) => Promise<void>
  /** Cria várias transações de uma vez (quick-add multi). Um toast de resumo. */
  handleCreateMany: (
    items: Omit<CreatePayload, "currentUser">[]
  ) => Promise<void>
  handleEdit: (id: string, values: Omit<CreatePayload, "currentUser">) => Promise<void>
  handleDelete: () => Promise<void>
  handleBulkDelete: () => Promise<void>
  handleBulkQuickEdit: (input: {
    field: "category" | "paid_by"
    value: string
  }) => Promise<void>
  handleBulkAdvancedEdit: (input: {
    category?: string
    paid_by?: string
    date?: string
  }) => Promise<void>
  handleCreateRequest: (payload: RequestPayload) => Promise<void>
  handleMarkPaid: (transaction: Transaction) => Promise<void>
  handleReceiptSaved: (created: Transaction[]) => void
}

/**
 * Shared mutation handlers + dialog state for the dashboard pages. Member and
 * guest shells call this with their own `currentUser`/`isAdmin`/cache helpers.
 *
 * `canDelete` rule lives here (admin: any; non-admin/guest: only what they paid).
 */
export function useDashboardMutations({
  currentUser,
  isAdmin,
  filteredTransactions,
  selectedIds,
  updateCache,
  reload,
  setRowSelection,
}: UseDashboardMutationsArgs): UseDashboardMutationsResult {
  const [sheetMode, setSheetMode] = React.useState<SheetMode>(null)
  const [pendingDelete, setPendingDelete] = React.useState<Transaction | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false)
  const [bulkQuickEditOpen, setBulkQuickEditOpen] = React.useState(false)
  const [bulkAdvancedOpen, setBulkAdvancedOpen] = React.useState(false)
  const [bulkPending, setBulkPending] = React.useState(false)
  const [receiptOpen, setReceiptOpen] = React.useState(false)
  const [requestOpen, setRequestOpen] = React.useState(false)
  const [markingPaidIds, setMarkingPaidIds] = React.useState<Set<string>>(
    () => new Set()
  )

  const handleCreate = async (values: Omit<CreatePayload, "currentUser">) => {
    if (!currentUser) return
    try {
      const created = await createTransaction({ ...values, currentUser })
      updateCache((prev) => [created, ...prev])
      toast.success("Transação criada.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar.")
      throw e
    }
  }

  const handleCreateMany = async (
    items: Omit<CreatePayload, "currentUser">[]
  ) => {
    if (!currentUser || items.length === 0) return
    try {
      const created: Transaction[] = []
      for (const v of items) {
        created.push(await createTransaction({ ...v, currentUser }))
      }
      updateCache((prev) => [...created, ...prev])
      toast.success(
        created.length === 1
          ? "Transação criada."
          : `${created.length} transações criadas.`
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar.")
      throw e
    }
  }

  const handleEdit = async (
    id: string,
    values: Omit<CreatePayload, "currentUser">
  ) => {
    if (!currentUser) return
    try {
      const updated = await updateTransaction({ ...values, id, currentUser })
      updateCache((prev) => prev.map((t) => (t.id === id ? updated : t)))
      toast.success("Transação atualizada.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao atualizar.")
      throw e
    }
  }

  const handleDelete = async () => {
    if (!currentUser || !pendingDelete) return
    if (!isAdmin && pendingDelete.paid_by !== currentUser) {
      toast.error("Você só pode deletar transações que você pagou.")
      setPendingDelete(null)
      return
    }
    setDeleting(true)
    try {
      await softDeleteTransaction(pendingDelete.id, currentUser)
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
    if (!currentUser) return
    const unauthorized = filteredTransactions?.filter(
      (t) => selectedIds.includes(t.id) && !isAdmin && t.paid_by !== currentUser
    )
    if (unauthorized && unauthorized.length > 0) {
      toast.error(
        `Você não pode excluir ${unauthorized.length} transações (não foi você quem pagou).`
      )
      return
    }
    setBulkPending(true)
    try {
      await bulkSoftDelete(selectedIds, currentUser)
      await reload()
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
    if (!currentUser) return
    setBulkPending(true)
    try {
      const values: Record<string, string | null> = {}
      if (input.field === "category") {
        values.category = input.value.trim() || null
      } else {
        values.paid_by = input.value.trim()
      }
      await bulkUpdate(
        selectedIds,
        values as Partial<TablesUpdate<"shared_transactions">>,
        currentUser
      )
      await reload()
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
    if (!currentUser) return
    setBulkPending(true)
    try {
      const values: Partial<TablesUpdate<"shared_transactions">> = {}
      if (input.category) values.category = input.category
      if (input.paid_by) values.paid_by = input.paid_by
      if (input.date) values.date = input.date
      await bulkUpdate(selectedIds, values, currentUser)
      await reload()
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
    if (!currentUser) return
    try {
      const created = await createPendingRequest({
        ...payload,
        currentUser,
      } as CreatePendingRequestPayload)
      updateCache((prev) => [created, ...prev])
      toast.success("Solicitação enviada.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar solicitação.")
    }
  }

  const handleMarkPaid = async (transaction: Transaction) => {
    if (!currentUser) return
    setMarkingPaidIds((prev) => {
      const next = new Set(prev)
      next.add(transaction.id)
      return next
    })
    try {
      const updated = await markRequestPaid(transaction.id, currentUser)
      updateCache((prev) =>
        prev.map((t) => (t.id === transaction.id ? updated : t))
      )
      toast.success("Cobrança marcada como paga.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao marcar como pago.")
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

  return {
    sheetMode,
    setSheetMode,
    pendingDelete,
    setPendingDelete,
    deleting,
    bulkDeleteOpen,
    setBulkDeleteOpen,
    bulkQuickEditOpen,
    setBulkQuickEditOpen,
    bulkAdvancedOpen,
    setBulkAdvancedOpen,
    bulkPending,
    receiptOpen,
    setReceiptOpen,
    requestOpen,
    setRequestOpen,
    markingPaidIds,
    handleCreate,
    handleCreateMany,
    handleEdit,
    handleDelete,
    handleBulkDelete,
    handleBulkQuickEdit,
    handleBulkAdvancedEdit,
    handleCreateRequest,
    handleMarkPaid,
    handleReceiptSaved,
  }
}

export type { SheetMode }
