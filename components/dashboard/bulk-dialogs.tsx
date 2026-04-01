"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { CategorySelector, PayerSelector } from "@/components/transaction-selectors"
import { Loader2, Save, Trash2, X } from "lucide-react"

// ── Bulk Delete ──

interface BulkDeleteDialogProps {
  open: boolean
  count: number
  pending: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}

export function BulkDeleteDialog({ open, count, pending, error, onClose, onConfirm }: BulkDeleteDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg outline-none" role="dialog" aria-modal="true" aria-labelledby="bulk-delete-title">
          <div className="flex items-center justify-between">
            <p id="bulk-delete-title" className="text-lg font-semibold">Excluir transações selecionadas</p>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Fechar" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {count === 1 ? "Deseja excluir 1 transação?" : `Deseja excluir ${count} transações?`}
          </p>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
            <Button type="button" onClick={onConfirm} disabled={pending}>
              {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Excluindo...</> : <><Trash2 className="mr-2 h-4 w-4" />Excluir</>}
            </Button>
          </div>
          {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Quick Edit ──

interface BulkQuickEditDialogProps {
  open: boolean
  pending: boolean
  error: string | null
  quickField: "category" | "paid_by"
  quickValue: string
  currentUser: string
  onClose: () => void
  onConfirm: () => void
  onFieldChange: (field: "category" | "paid_by") => void
  onValueChange: (value: string) => void
}

export function BulkQuickEditDialog({
  open, pending, error, quickField, quickValue, currentUser,
  onClose, onConfirm, onFieldChange, onValueChange,
}: BulkQuickEditDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full items-center justify-center p-4">
        <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg outline-none" role="dialog" aria-modal="true" aria-labelledby="bulk-quick-title">
          <div className="flex items-center justify-between">
            <p id="bulk-quick-title" className="text-lg font-semibold">Edição rápida</p>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Fechar" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quick-field">Campo</Label>
              <Select id="quick-field" value={quickField} onChange={e => onFieldChange(e.target.value as "category" | "paid_by")}>
                <option value="category">Categoria</option>
                <option value="paid_by">Pago por</option>
              </Select>
            </div>
            {quickField === "category" ? (
              <div className="space-y-2">
                <Label htmlFor="quick-value">Novo valor</Label>
                <CategorySelector value={quickValue} onChange={onValueChange} />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="quick-paid-by">Pago por</Label>
                <PayerSelector value={quickValue} onChange={onValueChange} currentUser={currentUser} />
              </div>
            )}
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
            <Button type="button" onClick={onConfirm} disabled={pending || (quickField === "paid_by" && !quickValue)}>
              {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Aplicar</>}
            </Button>
          </div>
          {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  )
}

// ── Advanced Edit ──

interface BulkAdvancedEditDialogProps {
  open: boolean
  pending: boolean
  error: string | null
  category: string
  paidBy: string
  date: string
  currentUser: string
  onClose: () => void
  onConfirm: () => void
  onCategoryChange: (value: string) => void
  onPaidByChange: (value: string) => void
  onDateChange: (value: string) => void
}

export function BulkAdvancedEditDialog({
  open, pending, error, category, paidBy, date, currentUser,
  onClose, onConfirm, onCategoryChange, onPaidByChange, onDateChange,
}: BulkAdvancedEditDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg outline-none" role="dialog" aria-modal="true" aria-labelledby="bulk-adv-title">
          <div className="flex items-center justify-between">
            <p id="bulk-adv-title" className="text-lg font-semibold">Edição avançada</p>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={pending} aria-label="Fechar" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="adv-category">Categoria</Label>
              <CategorySelector value={category} onChange={onCategoryChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adv-paid-by">Pago por</Label>
              <PayerSelector value={paidBy} onChange={onPaidByChange} currentUser={currentUser} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adv-date">Data</Label>
              <Input id="adv-date" type="date" value={date} onChange={e => onDateChange(e.target.value)} />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Cancelar</Button>
            <Button type="button" onClick={onConfirm} disabled={pending || (!category && !paidBy && !date)}>
              {pending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Aplicar</>}
            </Button>
          </div>
          {error && <p className="mt-4 text-sm text-destructive" role="alert">{error}</p>}
        </div>
      </div>
    </div>
  )
}
