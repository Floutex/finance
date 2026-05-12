"use client"

import * as React from "react"
import { CheckSquare, Pencil, SlidersHorizontal, Trash2, X } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Separator } from "@/components/v2/primitives/separator"

type BulkActionsBarProps = {
  count: number
  onQuickEdit: () => void
  onAdvancedEdit: () => void
  onDelete: () => void
  onClear: () => void
  className?: string
}

/**
 * Floating bar at the bottom of the dashboard that appears when one or more
 * transactions are selected. Operations open dedicated dialogs.
 */
export function BulkActionsBar({
  count,
  onQuickEdit,
  onAdvancedEdit,
  onDelete,
  onClear,
  className,
}: BulkActionsBarProps) {
  if (count === 0) return null
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4",
        className
      )}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-popover px-3 py-1.5 text-sm shadow-2xl">
        <span className="flex items-center gap-2 pl-1 pr-2">
          <CheckSquare className="size-4 text-primary" />
          <span className="tabular-nums">
            {count} {count === 1 ? "selecionada" : "selecionadas"}
          </span>
        </span>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="sm" onClick={onQuickEdit}>
          <Pencil />
          Edição rápida
        </Button>
        <Button variant="ghost" size="sm" onClick={onAdvancedEdit}>
          <SlidersHorizontal />
          Avançada
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 />
          Excluir
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <Button variant="ghost" size="icon" onClick={onClear} aria-label="Limpar seleção">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
