"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { HandCoins, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import { DatePicker } from "@/components/v2/primitives/date-picker"
import { normalizeNumber } from "@/lib/constants"

type Member = { id: string; name: string }

type PaybackDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  guestName: string
  members: Member[]
  onSuccess: () => Promise<void> | void
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const schema = z.object({
  member: z.string().min(1, "Selecione para quem"),
  amount: z.string().refine((v) => normalizeNumber(v) !== null, "Valor inválido"),
  date: z.string().min(1, "Data obrigatória"),
  description: z.string().optional(),
})

export function GuestPaybackDialog({
  open,
  onOpenChange,
  token,
  guestName,
  members,
  onSuccess,
}: PaybackDialogProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      member: members[0]?.name ?? "",
      amount: "",
      date: todayISO(),
      description: "",
    },
  })

  React.useEffect(() => {
    if (!open) {
      reset({
        member: members[0]?.name ?? "",
        amount: "",
        date: todayISO(),
        description: "",
      })
    }
  }, [open, members, reset])

  const member = watch("member")

  const onValid = handleSubmit(async (v) => {
    try {
      const res = await fetch(`/api/guest/${token}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member: v.member,
          amount: normalizeNumber(v.amount)!,
          date: v.date,
          description: v.description?.trim() || "Acerto de contas",
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      toast.success("Pagamento registrado.")
      await onSuccess()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha")
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HandCoins className="size-5 text-primary" />
            Registrar pagamento
          </DialogTitle>
          <DialogDescription>
            Você ({guestName}) está pagando um valor para um membro. Vai aparecer
            no extrato e abater seu saldo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onValid} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="payback-member">Para quem</Label>
            <Select value={member} onValueChange={(v) => setValue("member", v)}>
              <SelectTrigger id="payback-member">
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
            {errors.member && (
              <p className="text-xs text-destructive">{errors.member.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payback-amount">Valor</Label>
              <Input
                id="payback-amount"
                inputMode="decimal"
                placeholder="0,00"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payback-date">Data</Label>
              <DatePicker
                id="payback-date"
                value={watch("date")}
                onChange={(v) => setValue("date", v, { shouldValidate: true })}
                aria-label="Data"
              />
              {errors.date && (
                <p className="text-xs text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="payback-description">Descrição (opcional)</Label>
            <Input
              id="payback-description"
              placeholder="Acerto de contas"
              {...register("description")}
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
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
