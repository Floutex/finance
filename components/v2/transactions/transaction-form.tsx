"use client"

import * as React from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, SplitSquareHorizontal } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
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
import { Separator } from "@/components/v2/primitives/separator"
import { ParticipantBadge } from "@/components/v2/finance/participant-badge"
import { ReceiptUpload } from "@/components/v2/transactions/receipt-upload"
import { useCategories } from "@/hooks/use-categories"
import { useParticipants } from "@/hooks/use-participants"
import { normalizeNumber } from "@/lib/constants"

export type TransactionFormValues = {
  description: string
  category: string
  paid_by: string
  date: string
  amount: string
  participants: string[]
  customShares: Record<string, number> | null
}

export type TransactionFormSubmit = {
  description: string
  category: string | null
  paid_by: string
  date: string
  amount: number
  participants: string[]
  custom_shares: Record<string, number> | null
  receipt_file?: File | null
}

const schema = z.object({
  description: z.string().trim().min(1, "Descrição obrigatória"),
  category: z.string(),
  paid_by: z.string().min(1, "Selecione quem pagou"),
  date: z.string().min(1, "Data obrigatória"),
  amount: z.string().refine((v) => normalizeNumber(v) !== null, "Valor inválido"),
  participants: z.array(z.string()).min(1, "Selecione pelo menos um participante"),
  customShares: z.record(z.number()).nullable(),
})

const todayISO = () => new Date().toISOString().slice(0, 10)

export const blankFormValues = (
  defaults: { paid_by?: string; participants?: string[] } = {}
): TransactionFormValues => ({
  description: "",
  category: "",
  paid_by: defaults.paid_by ?? "",
  date: todayISO(),
  amount: "",
  participants: defaults.participants ?? [],
  customShares: null,
})

type TransactionFormProps = {
  /** Initial values — for edit, pass the existing transaction's projection. */
  defaultValues: TransactionFormValues
  currentUser: string
  /** Optional initial receipt URL (shown as "current attachment" in edit mode). */
  existingReceiptUrl?: string | null
  /** Render the cancel button. */
  onCancel?: () => void
  /** Async submit. Resolve when persisted (the parent closes the sheet then). */
  onSubmit: (values: TransactionFormSubmit) => Promise<void>
  /** Submit button label. Default "Salvar". */
  submitLabel?: string
  /** Compact mode — used in quick-add. Hides custom-shares & receipt upload. */
  compact?: boolean
  /**
   * Override the "Pago por" options. Defaults to `members`. Guests pass `active`
   * (or `[guestParticipant]`) so they can select themselves as the payer.
   */
  payerOptions?: { id: string; name: string }[]
  className?: string
}

export function TransactionForm({
  defaultValues,
  currentUser,
  existingReceiptUrl,
  onCancel,
  onSubmit,
  submitLabel = "Salvar",
  compact = false,
  payerOptions,
  className,
}: TransactionFormProps) {
  const { categories } = useCategories()
  const { active: participants, members } = useParticipants()
  const payers = payerOptions ?? members
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null)
  const [submitError, setSubmitError] = React.useState<string | null>(null)

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onSubmit",
  })

  const formParticipants = watch("participants")
  const formAmount = watch("amount")
  const formCustomShares = watch("customShares")
  const formPaidBy = watch("paid_by")

  const totalAmount = React.useMemo(
    () => normalizeNumber(formAmount) ?? 0,
    [formAmount]
  )
  const customSplitEnabled = formCustomShares !== null

  const customSharesSum = React.useMemo(() => {
    if (!formCustomShares) return 0
    return Object.values(formCustomShares).reduce((a, b) => a + b, 0)
  }, [formCustomShares])

  const customSplitValid =
    !customSplitEnabled ||
    (totalAmount > 0 && Math.abs(customSharesSum - totalAmount) < 0.01)

  // Sync custom shares when participants list changes
  React.useEffect(() => {
    if (!formCustomShares) return
    const keys = Object.keys(formCustomShares)
    const added = formParticipants.filter((p) => !keys.includes(p))
    const removed = keys.filter((p) => !formParticipants.includes(p))
    if (added.length === 0 && removed.length === 0) return
    const next = { ...formCustomShares }
    for (const p of removed) delete next[p]
    for (const p of added) next[p] = 0
    setValue("customShares", next, { shouldDirty: true })
  }, [formParticipants, formCustomShares, setValue])

  const toggleParticipant = (name: string) => {
    if (formParticipants.includes(name)) {
      setValue(
        "participants",
        formParticipants.filter((p) => p !== name),
        { shouldValidate: true, shouldDirty: true }
      )
    } else {
      setValue("participants", [...formParticipants, name], {
        shouldValidate: true,
        shouldDirty: true,
      })
    }
  }

  const handleToggleCustomSplit = () => {
    if (customSplitEnabled) {
      setValue("customShares", null, { shouldDirty: true })
    } else {
      if (formParticipants.length === 0 || totalAmount <= 0) return
      const equal = Number((totalAmount / formParticipants.length).toFixed(2))
      const shares: Record<string, number> = {}
      formParticipants.forEach((p, i) => {
        if (i === formParticipants.length - 1) {
          const assigned = Object.values(shares).reduce((a, b) => a + b, 0)
          shares[p] = Number((totalAmount - assigned).toFixed(2))
        } else {
          shares[p] = equal
        }
      })
      setValue("customShares", shares, { shouldDirty: true })
    }
  }

  const handleShareAmount = (participant: string, raw: string) => {
    const value = normalizeNumber(raw) ?? 0
    setValue(
      "customShares",
      { ...(formCustomShares ?? {}), [participant]: value },
      { shouldDirty: true }
    )
  }

  const onValid = handleSubmit(async (values) => {
    setSubmitError(null)
    // Involvement check (mirrors legacy rule)
    if (
      !values.participants.includes(currentUser) &&
      values.paid_by !== currentUser
    ) {
      setSubmitError(
        "Você não pode criar/editar uma transação sem estar envolvido (como pagador ou participante)."
      )
      return
    }
    if (!customSplitValid) {
      setSubmitError("A soma das partes precisa ser igual ao valor total.")
      return
    }
    try {
      await onSubmit({
        description: values.description.trim(),
        category: values.category.trim() || null,
        paid_by: values.paid_by.trim(),
        date: values.date,
        amount: normalizeNumber(values.amount)!,
        participants: values.participants,
        custom_shares: values.customShares,
        receipt_file: receiptFile,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Falha ao salvar.")
    }
  })

  return (
    <form
      onSubmit={onValid}
      noValidate
      className={cn("flex flex-col gap-5", className)}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2 space-y-1.5">
          <Label htmlFor="description">Descrição</Label>
          <Input
            id="description"
            autoComplete="off"
            placeholder="Ex.: Mercado, jantar, conta de luz"
            {...register("description")}
          />
          {errors.description && (
            <p className="text-xs text-destructive">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="amount">Valor total</Label>
          <Input
            id="amount"
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
          <Label htmlFor="date">Data</Label>
          <Input id="date" type="date" {...register("date")} />
          {errors.date && (
            <p className="text-xs text-destructive">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="paid_by">Pago por</Label>
          <Controller
            control={control}
            name="paid_by"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="paid_by">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {payers.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.paid_by && (
            <p className="text-xs text-destructive">
              {errors.paid_by.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="category">Categoria</Label>
          <Input
            id="category"
            list="v2-category-list"
            autoComplete="off"
            placeholder="Ex.: Mercado"
            {...register("category")}
          />
          <datalist id="v2-category-list">
            {categories.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Participantes</Label>
        <div className="flex flex-wrap gap-2">
          {participants.map((p) => {
            const selected = formParticipants.includes(p.name)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleParticipant(p.name)}
                className={cn(
                  "transition-opacity",
                  !selected && "opacity-40 hover:opacity-70"
                )}
              >
                <ParticipantBadge
                  name={p.name}
                  participants={participants}
                  hex={p.color}
                />
              </button>
            )
          })}
        </div>
        {errors.participants && (
          <p className="text-xs text-destructive">
            {errors.participants.message as string}
          </p>
        )}
      </div>

      {!compact && formParticipants.length >= 2 && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Divisão personalizada</p>
                <p className="text-xs text-muted-foreground">
                  Por padrão divide igualmente entre os participantes.
                </p>
              </div>
              <Button
                type="button"
                variant={customSplitEnabled ? "secondary" : "outline"}
                size="sm"
                onClick={handleToggleCustomSplit}
                disabled={!customSplitEnabled && totalAmount <= 0}
              >
                <SplitSquareHorizontal />
                {customSplitEnabled ? "Manual" : "Dividir manualmente"}
              </Button>
            </div>
            {customSplitEnabled && formCustomShares && (
              <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
                {formParticipants.map((p) => {
                  const shareValue = formCustomShares[p] ?? 0
                  return (
                    <div key={p} className="flex items-center gap-3">
                      <span className="w-24">
                        <ParticipantBadge name={p} participants={participants} />
                      </span>
                      <Input
                        inputMode="decimal"
                        className="h-8 max-w-[140px]"
                        value={
                          shareValue === 0 ? "" : String(shareValue).replace(".", ",")
                        }
                        placeholder="0,00"
                        onChange={(e) => handleShareAmount(p, e.target.value)}
                      />
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {totalAmount > 0
                          ? `${((shareValue / totalAmount) * 100).toFixed(1)}%`
                          : "—"}
                      </span>
                    </div>
                  )
                })}
                <div
                  className={cn(
                    "flex items-center justify-between border-t border-border pt-2 text-xs",
                    customSplitValid ? "text-muted-foreground" : "text-destructive"
                  )}
                >
                  <span>Total distribuído</span>
                  <span className="tabular-nums">
                    {customSharesSum.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}{" "}
                    /{" "}
                    {totalAmount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!compact && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label>Comprovante</Label>
            <ReceiptUpload
              value={receiptFile}
              onChange={setReceiptFile}
              existingUrl={existingReceiptUrl}
            />
          </div>
        </>
      )}

      {submitError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
