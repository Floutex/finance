"use client"

import * as React from "react"
import { MoreHorizontal, Pencil, Trash2, Paperclip } from "lucide-react"

import { Button } from "@/components/v2/primitives/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/v2/primitives/dropdown-menu"
import type { Tables } from "@/lib/database.types"

type Transaction = Tables<"shared_transactions">

type Props = {
  transaction: Transaction
  onEdit: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
  /** Member who can delete this row. Hides Delete if not authorized. */
  canDelete?: boolean
}

export function TransactionRowActions({
  transaction,
  onEdit,
  onDelete,
  canDelete = true,
}: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          aria-label="Ações da transação"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onEdit(transaction)}>
          <Pencil />
          Editar
        </DropdownMenuItem>
        {transaction.receipt_url && (
          <DropdownMenuItem asChild>
            <a
              href={transaction.receipt_url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              <Paperclip />
              Ver comprovante
            </a>
          </DropdownMenuItem>
        )}
        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => onDelete(transaction)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 />
              Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
