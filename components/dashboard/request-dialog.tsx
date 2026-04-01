"use client"

import { useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HandCoins, Loader2, Send, X } from "lucide-react"
import type { RequestFormState } from "./types"

interface RequestDialogProps {
  open: boolean
  form: RequestFormState
  pending: boolean
  formValid: boolean
  error: string | null
  onClose: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onFormChange: (updates: Partial<RequestFormState>) => void
}

export function RequestDialog({
  open,
  form,
  pending,
  formValid,
  error,
  onClose,
  onSubmit,
  onFormChange,
}: RequestDialogProps) {
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
          className="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-lg outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-dialog-title"
          aria-describedby="request-dialog-description"
        >
          <div className="flex items-center justify-between">
            <p id="request-dialog-title" className="text-lg font-semibold flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-amber-500" />
              Solicitar Dinheiro
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              disabled={pending}
              aria-label="Fechar solicitação de dinheiro"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p id="request-dialog-description" className="mt-2 text-sm text-muted-foreground">
            Envie uma notificação para os outros membros solicitando um pagamento.
          </p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="request-description">Descrição da Solicitação</Label>
              <Input
                ref={firstFieldRef}
                id="request-description"
                name="description"
                autoComplete="off"
                value={form.description}
                onChange={(e) => onFormChange({ description: e.target.value })}
                placeholder="Ex: Conta de luz, Almoço..."
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="request-amount">Valor total</Label>
                <Input
                  id="request-amount"
                  name="amount"
                  autoComplete="off"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={form.amount}
                  onChange={(e) => onFormChange({ amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="request-date">Data</Label>
                <Input
                  id="request-date"
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={(e) => onFormChange({ date: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-pix">Chave PIX (Opcional)</Label>
              <Input
                id="request-pix"
                name="pix"
                autoComplete="off"
                placeholder="Celular, CPF, Email ou Aleatória..."
                value={form.pix}
                onChange={(e) => onFormChange({ pix: e.target.value })}
              />
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={pending || !formValid} className="bg-amber-500 hover:bg-amber-600 text-black border-amber-500/50" aria-busy={pending}>
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                    Enviar Solicitação
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
