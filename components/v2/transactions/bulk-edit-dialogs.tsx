"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/v2/primitives/dialog"
import { Button } from "@/components/v2/primitives/button"
import { Input } from "@/components/v2/primitives/input"
import { Label } from "@/components/v2/primitives/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/v2/primitives/select"
import { useCategories } from "@/hooks/use-categories"
import { useParticipants } from "@/hooks/use-participants"

type QuickField = "category" | "paid_by"

type BulkQuickEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  pending?: boolean
  onConfirm: (values: { field: QuickField; value: string }) => void | Promise<void>
}

export function BulkQuickEditDialog({
  open,
  onOpenChange,
  count,
  pending,
  onConfirm,
}: BulkQuickEditDialogProps) {
  const [field, setField] = React.useState<QuickField>("category")
  const [value, setValue] = React.useState("")
  const { categories } = useCategories()
  const { members } = useParticipants()

  React.useEffect(() => {
    if (!open) {
      setField("category")
      setValue("")
    }
  }, [open])

  const submitDisabled = pending || (field === "paid_by" && !value)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edição rápida</DialogTitle>
          <DialogDescription>
            Aplique uma alteração em {count}{" "}
            {count === 1 ? "transação selecionada" : "transações selecionadas"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-field">Campo</Label>
            <Select value={field} onValueChange={(v) => setField(v as QuickField)}>
              <SelectTrigger id="bulk-field">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">Categoria</SelectItem>
                <SelectItem value="paid_by">Pago por</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {field === "category" ? (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-category">Nova categoria</Label>
              <Input
                id="bulk-category"
                list="bulk-category-list"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Ex.: Mercado"
              />
              <datalist id="bulk-category-list">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-paid-by">Pago por</Label>
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger id="bulk-paid-by">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ field, value })}
            disabled={submitDisabled}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type BulkAdvancedEditDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  count: number
  pending?: boolean
  onConfirm: (values: {
    category?: string
    paid_by?: string
    date?: string
  }) => void | Promise<void>
}

export function BulkAdvancedEditDialog({
  open,
  onOpenChange,
  count,
  pending,
  onConfirm,
}: BulkAdvancedEditDialogProps) {
  const [category, setCategory] = React.useState("")
  const [paidBy, setPaidBy] = React.useState("")
  const [date, setDate] = React.useState("")
  const { categories } = useCategories()
  const { members } = useParticipants()

  React.useEffect(() => {
    if (!open) {
      setCategory("")
      setPaidBy("")
      setDate("")
    }
  }, [open])

  const anyValue = category.trim() || paidBy.trim() || date.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edição avançada</DialogTitle>
          <DialogDescription>
            Defina apenas os campos a sobrescrever. Os demais permanecem
            inalterados em {count}{" "}
            {count === 1 ? "transação" : "transações"}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="adv-category">Categoria</Label>
            <Input
              id="adv-category"
              list="adv-category-list"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
            <datalist id="adv-category-list">
              {categories.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adv-paid-by">Pago por</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger id="adv-paid-by">
                <SelectValue placeholder="Manter atual" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.name}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="adv-date">Data</Label>
            <Input
              id="adv-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                category: category.trim() || undefined,
                paid_by: paidBy.trim() || undefined,
                date: date.trim() || undefined,
              })
            }
            disabled={pending || !anyValue}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
