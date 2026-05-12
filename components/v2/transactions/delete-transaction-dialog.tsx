"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/v2/primitives/alert-dialog"
import { buttonVariants } from "@/components/v2/primitives/button"
import { cn } from "@/components/v2/primitives/utils"

type DeleteTransactionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Description shown to the user, e.g. transaction description. */
  label?: string
  /** Pluralization when deleting multiple rows. */
  count?: number
  pending?: boolean
  onConfirm: () => void | Promise<void>
}

export function DeleteTransactionDialog({
  open,
  onOpenChange,
  label,
  count = 1,
  pending,
  onConfirm,
}: DeleteTransactionDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {count > 1 ? `Excluir ${count} transações?` : "Excluir transação?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {label
              ? `“${label}” será removida do dashboard. A operação é reversível pelo admin via Supabase.`
              : "A operação é reversível pelo admin via Supabase, mas as linhas saem da lista para todos os participantes."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            disabled={pending}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
