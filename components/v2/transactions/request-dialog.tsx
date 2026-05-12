"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { HandCoins, Loader2, Send } from "lucide-react"

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
import { normalizeNumber } from "@/lib/constants"

const todayISO = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória"),
  amount: z.string().refine((v) => normalizeNumber(v) !== null, "Valor inválido"),
  date: z.string().min(1, "Data obrigatória"),
  pix: z.string().optional(),
})

export type RequestPayload = {
  description: string
  amount: number
  date: string
  pix?: string
}

type RequestDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: RequestPayload) => Promise<void>
}

/**
 * Cobrar alguém — registra uma transação com `paid_by = PENDING_MARKER`
 * que aparece na seção PendingRequests para outros membros marcarem como paga.
 */
export function RequestDialog({ open, onOpenChange, onSubmit }: RequestDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { description: "", amount: "", date: todayISO(), pix: "" },
  })

  React.useEffect(() => {
    if (!open) reset({ description: "", amount: "", date: todayISO(), pix: "" })
  }, [open, reset])

  const onValid = handleSubmit(async (v) => {
    await onSubmit({
      description: v.description.trim(),
      amount: normalizeNumber(v.amount)!,
      date: v.date,
      pix: v.pix?.trim() || undefined,
    })
    onOpenChange(false)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="size-5 text-warning" />
            Solicitar pagamento
          </DialogTitle>
          <DialogDescription>
            Cria uma cobrança visível para os outros membros. Quando alguém pagar,
            basta clicar em “Marcar como pago” no card.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onValid} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="req-description">Descrição</Label>
            <Input
              id="req-description"
              autoComplete="off"
              placeholder="Ex.: Almoço de domingo, conta de luz"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="req-amount">Valor</Label>
              <Input
                id="req-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0,00"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-date">Data</Label>
              <Input id="req-date" type="date" {...register("date")} />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-pix">Chave PIX (opcional)</Label>
            <Input
              id="req-pix"
              autoComplete="off"
              placeholder="CPF, celular, email ou chave aleatória"
              {...register("pix")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Send />}
              Enviar solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
