"use client"

import { useEffect, useRef, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CategorySelector, PayerSelector } from "@/components/transaction-selectors"
import { cn } from "@/components/ui/utils"
import { getParticipantStyle, normalizeNumber } from "@/lib/constants"
import { useParticipants } from "@/hooks/use-participants"
import { getSupabaseClient } from "@/lib/supabase"
import { reloadParticipants } from "@/lib/participants-cache"
import { Loader2, Plus, X, SplitSquareHorizontal, UserPlus } from "lucide-react"
import type { FormState } from "./types"

const GUEST_COLOR_PALETTE = [
  "#F87171", "#FB923C", "#FBBF24", "#A3E635", "#34D399",
  "#22D3EE", "#60A5FA", "#A78BFA", "#F472B6", "#E879F9",
  "#94A3B8", "#FDE047",
]

interface CreateTransactionDialogProps {
  open: boolean
  form: FormState
  pending: boolean
  amountInvalid: boolean
  formValid: boolean
  error: string | null
  currentUser: string
  receiptFile: File | null
  onReceiptFileChange: (file: File | null) => void
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
  receiptFile,
  onReceiptFileChange,
  onClose,
  onSubmit,
  onInputChange,
  onFormChange,
}: CreateTransactionDialogProps) {
  const firstFieldRef = useRef<HTMLInputElement>(null)
  const { active: activeParticipants } = useParticipants()

  // Inline "add friend" UI state
  const [addingFriend, setAddingFriend] = useState(false)
  const [newFriendName, setNewFriendName] = useState("")
  const [newFriendColor, setNewFriendColor] = useState(GUEST_COLOR_PALETTE[0])
  const [creatingFriend, setCreatingFriend] = useState(false)
  const [friendError, setFriendError] = useState<string | null>(null)

  const handleCreateFriend = async () => {
    const name = newFriendName.trim()
    if (!name) { setFriendError("Informe um nome"); return }
    if (activeParticipants.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      setFriendError("Já existe um participante com esse nome")
      return
    }
    setCreatingFriend(true)
    setFriendError(null)
    const supabase = getSupabaseClient()
    const { error } = await supabase.from("participants").insert({
      name, color: newFriendColor, kind: "guest",
    })
    if (error) { setFriendError(error.message); setCreatingFriend(false); return }
    await reloadParticipants()
    onFormChange({ participants: [...form.participants, name] })
    setNewFriendName("")
    setNewFriendColor(GUEST_COLOR_PALETTE[0])
    setAddingFriend(false)
    setCreatingFriend(false)
  }

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

  const totalAmount = useMemo(() => normalizeNumber(form.amount) ?? 0, [form.amount])
  const customSplitEnabled = form.customShares !== null

  const customSharesSum = useMemo(() => {
    if (!form.customShares) return 0
    return Object.values(form.customShares).reduce((a, b) => a + b, 0)
  }, [form.customShares])

  const customSplitValid = !customSplitEnabled || (
    totalAmount > 0 && Math.abs(customSharesSum - totalAmount) < 0.01
  )

  const handleToggleCustomSplit = () => {
    if (customSplitEnabled) {
      onFormChange({ customShares: null })
    } else {
      if (form.participants.length === 0 || totalAmount <= 0) return
      const equalShare = Number((totalAmount / form.participants.length).toFixed(2))
      const shares: Record<string, number> = {}
      form.participants.forEach((p, i) => {
        // Assign remainder to last participant to avoid floating-point drift
        if (i === form.participants.length - 1) {
          const assigned = Object.values(shares).reduce((a, b) => a + b, 0)
          shares[p] = Number((totalAmount - assigned).toFixed(2))
        } else {
          shares[p] = equalShare
        }
      })
      onFormChange({ customShares: shares })
    }
  }

  const handleShareAmountChange = (participant: string, rawValue: string) => {
    const value = normalizeNumber(rawValue) ?? 0
    const updated = { ...(form.customShares ?? {}), [participant]: value }
    onFormChange({ customShares: updated })
  }

  const handleSharePercentChange = (participant: string, rawValue: string) => {
    if (totalAmount <= 0) return
    const pct = normalizeNumber(rawValue)
    if (pct === null) return
    const value = Number(((pct / 100) * totalAmount).toFixed(2))
    const updated = { ...(form.customShares ?? {}), [participant]: value }
    onFormChange({ customShares: updated })
  }

  // Sync customShares when participants change while custom split is on
  useEffect(() => {
    if (!form.customShares) return
    const currentKeys = Object.keys(form.customShares)
    const addedParticipants = form.participants.filter(p => !currentKeys.includes(p))
    const removedParticipants = currentKeys.filter(p => !form.participants.includes(p))
    if (addedParticipants.length === 0 && removedParticipants.length === 0) return
    const updated = { ...form.customShares }
    for (const p of removedParticipants) delete updated[p]
    for (const p of addedParticipants) updated[p] = 0
    onFormChange({ customShares: updated })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.participants])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex h-full items-end md:items-center justify-center p-0 md:p-4" onKeyDown={handleKeyDown}>
        <div
          className="w-full md:max-w-3xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto rounded-t-2xl md:rounded-lg border border-border bg-card p-6 shadow-lg outline-none"
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
            <div className="md:col-span-2 space-y-2">
              <Label>Participantes</Label>
              <div className="flex flex-wrap gap-2">
                {activeParticipants.map(p => {
                  const isSelected = form.participants.includes(p.name)
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-1.5 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 border"
                      style={isSelected
                        ? getParticipantStyle(p.name, activeParticipants)
                        : { backgroundColor: "rgba(255,255,255,0.03)", color: "rgb(148, 163, 184)", borderColor: "rgba(148,163,184,0.2)" }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const checked = e.target.checked
                          const current = form.participants
                          onFormChange({
                            participants: checked
                              ? [...current, p.name]
                              : current.filter(x => x !== p.name)
                          })
                        }}
                        className="sr-only"
                      />
                      {p.name}
                    </label>
                  )
                })}
                {!addingFriend && (
                  <button
                    type="button"
                    onClick={() => { setAddingFriend(true); setFriendError(null) }}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border border-dashed border-border/60 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Adicionar amigo
                  </button>
                )}
              </div>

              {addingFriend && (
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <Input
                      autoFocus
                      placeholder="Nome do amigo"
                      value={newFriendName}
                      onChange={e => setNewFriendName(e.target.value)}
                      className="h-9 flex-1"
                      maxLength={40}
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {GUEST_COLOR_PALETTE.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewFriendColor(c)}
                          className={cn(
                            "h-7 w-7 rounded-full border-2 transition-all",
                            newFriendColor === c ? "border-foreground scale-110" : "border-transparent hover:scale-110"
                          )}
                          style={{ backgroundColor: c }}
                          aria-label={`Selecionar cor ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  {friendError && <p className="text-xs text-destructive">{friendError}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => { setAddingFriend(false); setNewFriendName(""); setFriendError(null) }} disabled={creatingFriend}>
                      Cancelar
                    </Button>
                    <Button type="button" size="sm" onClick={handleCreateFriend} disabled={creatingFriend || !newFriendName.trim()}>
                      {creatingFriend ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Criando</> : <><Plus className="mr-2 h-3.5 w-3.5" />Criar</>}
                    </Button>
                  </div>
                </div>
              )}

              {form.participants.length === 0 && (
                <p className="text-xs text-destructive">Selecione pelo menos um participante</p>
              )}
            </div>

            {/* Custom split section */}
            {form.participants.length >= 2 && (
              <div className="md:col-span-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Divisão personalizada</span>
                  <button
                    type="button"
                    onClick={handleToggleCustomSplit}
                    disabled={totalAmount <= 0 && !customSplitEnabled}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all",
                      customSplitEnabled
                        ? "bg-primary/15 text-primary border-primary/30"
                        : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
                    )}
                  >
                    <SplitSquareHorizontal className="h-3.5 w-3.5" />
                    {customSplitEnabled ? "Dividindo manualmente" : "Dividir manualmente"}
                  </button>
                </div>

                {customSplitEnabled && form.customShares && (
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2">
                    {form.participants.map(participant => {
                      const shareValue = form.customShares?.[participant] ?? 0
                      const pct = totalAmount > 0
                        ? Number(((shareValue / totalAmount) * 100).toFixed(1))
                        : 0
                      return (
                        <div key={participant} className="flex items-center gap-2">
                          <span
                            className="min-w-[80px] rounded-full px-2.5 py-0.5 text-xs font-medium border"
                            style={getParticipantStyle(participant, activeParticipants)}
                          >
                            {participant}
                          </span>
                          <div className="flex items-center gap-1 flex-1">
                            <span className="text-xs text-muted-foreground">R$</span>
                            <Input
                              className="h-7 text-xs"
                              inputMode="decimal"
                              value={shareValue === 0 ? "" : String(shareValue).replace(".", ",")}
                              placeholder="0,00"
                              onChange={(e) => handleShareAmountChange(participant, e.target.value)}
                            />
                          </div>
                          <div className="flex items-center gap-1 w-24">
                            <Input
                              className="h-7 text-xs"
                              inputMode="decimal"
                              value={pct === 0 ? "" : String(pct).replace(".", ",")}
                              placeholder="0"
                              onChange={(e) => handleSharePercentChange(participant, e.target.value)}
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                          </div>
                        </div>
                      )
                    })}
                    <div className={cn(
                      "flex items-center justify-between pt-1 border-t border-border/40 text-xs",
                      customSplitValid ? "text-muted-foreground" : "text-destructive"
                    )}>
                      <span>Total distribuído</span>
                      <span className="font-medium tabular-nums">
                        {customSharesSum.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        {" / "}
                        {totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                    </div>
                    {!customSplitValid && (
                      <p className="text-xs text-destructive">A soma das partes deve ser igual ao valor total.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="receipt">Comprovante (opcional)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={e => onReceiptFileChange(e.target.files?.[0] ?? null)}
                  className="cursor-pointer"
                />
                {receiptFile && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => onReceiptFileChange(null)} aria-label="Remover comprovante">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {receiptFile && <p className="text-xs text-muted-foreground truncate">{receiptFile.name}</p>}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={pending || !formValid || !customSplitValid} aria-busy={pending}>
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
