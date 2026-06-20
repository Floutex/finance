"use client"

import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/v2/primitives/dialog"
import {
  TransactionForm,
  blankFormValues,
  type TransactionFormValues,
  type TransactionFormSubmit,
} from "@/components/v2/transactions/transaction-form"
import type { Tables } from "@/lib/database.types"

type Transaction = Tables<"shared_transactions">

type TransactionSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "create" or the transaction being edited. */
  mode: "create" | { transaction: Transaction }
  currentUser: string
  /** Defaults for create mode. */
  createDefaults?: Partial<TransactionFormValues>
  /** Persistence callback. The parent integrates with cache/toasts. */
  onSubmit: (values: TransactionFormSubmit) => Promise<void>
  /** Override "Pago por" options (defaults to members in the form). */
  payerOptions?: { id: string; name: string }[]
  /** Only admins may choose the payer; others are locked to themselves. */
  canEditPayer?: boolean
}

export function TransactionSheet({
  open,
  onOpenChange,
  mode,
  currentUser,
  createDefaults,
  onSubmit,
  payerOptions,
  canEditPayer = true,
}: TransactionSheetProps) {
  const initial = React.useMemo<TransactionFormValues>(() => {
    if (mode === "create") {
      return {
        ...blankFormValues({
          paid_by: createDefaults?.paid_by ?? currentUser,
          participants: createDefaults?.participants ?? [],
        }),
        ...createDefaults,
      }
    }
    const t = mode.transaction
    return {
      description: t.description ?? "",
      category: t.category ?? "",
      paid_by: t.paid_by ?? "",
      date: t.date,
      amount: t.amount !== null ? String(t.amount).replace(".", ",") : "",
      participants: t.participants ?? [],
      customShares:
        (t.custom_shares as Record<string, number> | null) ?? null,
    }
  }, [mode, createDefaults, currentUser])

  const isEdit = mode !== "create"
  const existingReceiptUrl = isEdit ? mode.transaction.receipt_url : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-xl flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>
            {isEdit ? "Editar transação" : "Nova transação"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Ajuste os dados da transação. Sua alteração fica registrada no audit log."
              : "Registre uma despesa compartilhada. Valores aceitam vírgula ou ponto."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <TransactionForm
            key={isEdit ? mode.transaction.id : "create"}
            defaultValues={initial}
            currentUser={currentUser}
            existingReceiptUrl={existingReceiptUrl}
            payerOptions={payerOptions}
            canEditPayer={canEditPayer}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (values) => {
              await onSubmit(values)
              onOpenChange(false)
            }}
            submitLabel={isEdit ? "Salvar alterações" : "Adicionar transação"}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
