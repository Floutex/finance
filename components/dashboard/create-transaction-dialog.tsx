"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CategorySelector, PayerSelector } from "@/components/transaction-selectors"
import { cn } from "@/components/ui/utils"
import { getUserColorClasses, PARTICIPANTS } from "@/lib/constants"
import { Loader2, Plus, X } from "lucide-react"
import type { FormState } from "./types"

interface CreateTransactionDialogProps {
  open: boolean
  form: FormState
  pending: boolean
  amountInvalid: boolean
  formValid: boolean
  error: string | null
  currentUser: string
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onFormChange: (updates: Partial<FormState>) => void
}

export function CreateTransactionDialog({
  open,
  form,
  pending,
  amountInvalid,
  formValid,
  error,
  currentUser,
  onClose,
  onSubmit,
  onInputChange,
  onFormChange,
}: CreateTransactionDialogProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      firstFieldRef.current?.focus()
    })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !pending) {
      event.stopPropagation()
      onClose()
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex h-full items-center justify-center p-4" onKeyDown={handleKeyDown}>
        <div
          className="w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-lg outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-transaction-title"
          aria-describedby="create-transaction-description"
        >
          <div className="flex items-center justify-between">
            <p id="create-transaction-title" className="text-lg font-semibold">
              Adicionar transação
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={pending}
              aria-label="Fechar formulário de criação"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p id="create-transaction-description" className="mt-2 text-sm text-muted-foreground">
            Informe os campos obrigatórios. Valores aceitam vírgula ou ponto.
          </p>
          <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2" noValidate>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                ref={firstFieldRef}
                id="description"
                name="description"
                autoComplete="off"
                value={form.description}
                onChange={onInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <CategorySelector
                value={form.category}
                onChange={(value) => onFormChange({ category: value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paid_by">Pago por</Label>
              <PayerSelector
                value={form.paid_by}
                onChange={(value) => onFormChange({ paid_by: value })}
                currentUser={currentUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={form.date}
                onChange={onInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Valor total</Label>
              <Input
                id="amount"
                name="amount"
                autoComplete="off"
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={onInputChange}
                aria-invalid={amountInvalid}
              />
            </div>
            <div className="space-y-2">
              <Label>Participantes</Label>
              <div className="flex flex-wrap gap-2">
                {PARTICIPANTS.map(participant => {
                  const isSelected = form.participants.includes(participant)
                  return (
                    <label
                      key={participant}
                      className={cn(
                        "flex items-center gap-1.5 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 border",
                        isSelected
                          ? getUserColorClasses(participant)
                          : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.target.checked
                          const current = form.participants
                          onFormChange({
                            participants: checked
                              ? [...current, participant]
                              : current.filter(p => p !== participant)
                          })
                        }}
                        className="sr-only"
                      />
                      {participant}
                    </label>
                  )
                })}
              </div>
              {form.participants.length === 0 && (
                <p className="text-xs text-destructive">Selecione pelo menos um participante</p>
              )}
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={pending || !formValid} aria-busy={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                    Adicionar transação
                  </>
                )}
              </Button>
            </div>
          </form>
          {error && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
