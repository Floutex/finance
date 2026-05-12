"use client"

import * as React from "react"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/v2/primitives/sheet"
import {
  TransactionForm,
  blankFormValues,
  type TransactionFormValues,
  type TransactionFormSubmit,
} from "@/components/v2/transactions/transaction-form"
import { useIsDesktop } from "@/hooks/use-media-query"
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
}

export function TransactionSheet({
  open,
  onOpenChange,
  mode,
  currentUser,
  createDefaults,
  onSubmit,
}: TransactionSheetProps) {
  const isDesktop = useIsDesktop()
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className={
          isDesktop
            ? "flex w-full flex-col gap-0 p-0 sm:max-w-xl"
            : "flex h-[92vh] w-full flex-col gap-0 rounded-t-xl p-0"
        }
      >
        <SheetHeader>
          <SheetTitle>
            {isEdit ? "Editar transação" : "Nova transação"}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? "Ajuste os dados da transação. Sua alteração fica registrada no audit log."
              : "Registre uma despesa compartilhada. Valores aceitam vírgula ou ponto."}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <TransactionForm
            key={isEdit ? mode.transaction.id : "create"}
            defaultValues={initial}
            currentUser={currentUser}
            existingReceiptUrl={existingReceiptUrl}
            onCancel={() => onOpenChange(false)}
            onSubmit={async (values) => {
              await onSubmit(values)
              onOpenChange(false)
            }}
            submitLabel={isEdit ? "Salvar alterações" : "Adicionar transação"}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
