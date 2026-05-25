"use client"

import * as React from "react"
import { Image as ImageIcon, Loader2, Save, Sparkles, Trash2, X } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Separator } from "@/components/v2/primitives/separator"
import { useParticipants } from "@/hooks/use-participants"
import { useCategories } from "@/hooks/use-categories"
import { getSupabaseClient } from "@/lib/supabase"
import { uploadReceipt } from "@/lib/storage"
import type { TablesInsert, Tables } from "@/lib/database.types"

type ExtractedTransaction = {
  description: string
  date: string
  amount: number
  participants: string[]
  paid_by: string
  category: string
}

type Transaction = Tables<"shared_transactions">

type ReceiptAnalyzeSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUser: string
  /** Called when transactions have been saved successfully. */
  onSaved: (transactions: Transaction[]) => void
  /** Override "Pago por" dropdown options (defaults to members). */
  payerOptions?: { id: string; name: string }[]
}

/**
 * Two-step sheet for OCR-driven bulk insert:
 * 1. Upload an image (or paste with Ctrl+V).
 * 2. Analyze via /api/analyze-image, edit extracted rows, then persist.
 *
 * After saving, the same image is attached as the receipt to all newly created
 * transactions (mirrors the legacy UploadDialog behavior).
 */
export function ReceiptAnalyzeSheet({
  open,
  onOpenChange,
  currentUser,
  onSaved,
  payerOptions,
}: ReceiptAnalyzeSheetProps) {
  const { active: participants, members } = useParticipants()
  const { categories } = useCategories()
  const payers = payerOptions ?? members

  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [analyzing, setAnalyzing] = React.useState(false)
  const [savePending, setSavePending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [extracted, setExtracted] = React.useState<ExtractedTransaction[]>([])

  const reset = React.useCallback(() => {
    setFile(null)
    setPreview(null)
    setExtracted([])
    setError(null)
    setAnalyzing(false)
    setSavePending(false)
  }, [])

  React.useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  // Paste support while the sheet is open.
  React.useEffect(() => {
    if (!open) return
    const onPaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith("image/")) {
          e.preventDefault()
          const f = item.getAsFile()
          if (f) loadFile(f)
          break
        }
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
  }, [open])

  const loadFile = (f: File) => {
    setFile(f)
    setExtracted([])
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const handleAnalyze = async () => {
    if (!file) return
    setAnalyzing(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch("/api/analyze-image", { method: "POST", body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? "Falha ao analisar imagem")
      }
      const data = await res.json()
      setExtracted(
        (data.transactions as ExtractedTransaction[]).map((t) => ({
          ...t,
          participants: participants.map((p) => p.name),
          paid_by: "",
          category: "",
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao analisar imagem")
    } finally {
      setAnalyzing(false)
    }
  }

  const updateExtracted = (
    i: number,
    field: keyof ExtractedTransaction,
    value: string | number
  ) => {
    setExtracted((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))
  }

  const removeExtracted = (i: number) => {
    setExtracted((prev) => prev.filter((_, idx) => idx !== i))
  }

  const handleSave = async () => {
    const invalid = extracted.filter(
      (t) => !t.description.trim() || !t.paid_by || !t.date
    )
    if (invalid.length > 0) {
      setError("Preencha descrição, data e pagador em todas as transações.")
      return
    }
    const uninvolved = extracted.filter(
      (t) => t.paid_by !== currentUser && !t.participants.includes(currentUser)
    )
    if (uninvolved.length > 0) {
      setError(
        "Você não pode salvar transações nas quais não está envolvido (como pagador ou participante)."
      )
      return
    }
    setSavePending(true)
    setError(null)
    try {
      const supabase = getSupabaseClient()
      const nowIso = new Date().toISOString()
      const payloads: TablesInsert<"shared_transactions">[] = extracted.map((t) => ({
        description: t.description.trim(),
        category: t.category.trim() || null,
        paid_by: t.paid_by.trim(),
        date: t.date,
        amount: t.amount,
        participants: t.participants,
        last_edited_by: currentUser,
        last_edited_at: nowIso,
      }))
      const { data, error: insertError } = await supabase
        .from("shared_transactions")
        .insert(payloads)
        .select("*")
      if (insertError) throw new Error(insertError.message)
      let final = data ?? []
      if (file && final.length > 0) {
        try {
          const url = await uploadReceipt(file, final[0].id)
          const ids = final.map((r) => r.id)
          const { data: updated } = await supabase
            .from("shared_transactions")
            .update({
              receipt_url: url,
              last_edited_by: currentUser,
              last_edited_at: new Date().toISOString(),
            })
            .in("id", ids)
            .select("*")
          if (updated) final = updated
        } catch (e) {
          console.error("Falha ao subir comprovante:", e)
        }
      }
      onSaved(final)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar")
    } finally {
      setSavePending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Analisar recibo</DialogTitle>
          <DialogDescription>
            Faça upload de uma imagem (ou cole com Ctrl+V). A IA extrai as
            transações e você confirma antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {!preview ? (
            <UploadStep onFile={loadFile} />
          ) : (
            <div className="flex flex-col gap-4">
              <div className="relative overflow-hidden rounded-md border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Imagem do recibo"
                  className="max-h-64 w-full object-contain"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={reset}
                  className="absolute right-2 top-2 bg-black/40 hover:bg-black/60"
                  aria-label="Remover imagem"
                >
                  <X className="size-4" />
                </Button>
              </div>

              {extracted.length === 0 ? (
                <Button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full"
                >
                  {analyzing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  {analyzing ? "Analisando…" : "Analisar imagem"}
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-medium">
                    {extracted.length === 1
                      ? "1 transação extraída"
                      : `${extracted.length} transações extraídas`}
                  </p>
                  <Separator />
                  <ul className="flex flex-col gap-4">
                    {extracted.map((t, i) => (
                      <li
                        key={i}
                        className={cn(
                          "rounded-lg border border-border bg-background/40 p-4"
                        )}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Transação {i + 1}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => removeExtracted(i)}
                            aria-label="Remover"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor={`d-${i}`}>Descrição</Label>
                            <Input
                              id={`d-${i}`}
                              value={t.description}
                              onChange={(e) =>
                                updateExtracted(i, "description", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`a-${i}`}>Valor</Label>
                            <Input
                              id={`a-${i}`}
                              type="number"
                              step="0.01"
                              value={t.amount}
                              onChange={(e) =>
                                updateExtracted(
                                  i,
                                  "amount",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`dt-${i}`}>Data</Label>
                            <Input
                              id={`dt-${i}`}
                              type="date"
                              value={t.date}
                              onChange={(e) =>
                                updateExtracted(i, "date", e.target.value)
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`p-${i}`}>Pago por</Label>
                            <Select
                              value={t.paid_by}
                              onValueChange={(v) => updateExtracted(i, "paid_by", v)}
                            >
                              <SelectTrigger id={`p-${i}`}>
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
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`c-${i}`}>Categoria</Label>
                            <Input
                              id={`c-${i}`}
                              list={`cat-list-${i}`}
                              value={t.category}
                              onChange={(e) =>
                                updateExtracted(i, "category", e.target.value)
                              }
                            />
                            <datalist id={`cat-list-${i}`}>
                              {categories.map((c) => (
                                <option key={c.id} value={c.name} />
                              ))}
                            </datalist>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          {error && (
            <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        {extracted.length > 0 && (
          <div className="flex items-center justify-end gap-2 border-t border-border p-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={savePending}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={savePending}>
              {savePending ? <Loader2 className="size-4 animate-spin" /> : <Save />}
              Salvar transações
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function UploadStep({ onFile }: { onFile: (file: File) => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = React.useState(false)

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onFile(f)
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-background/40 py-16 text-sm transition-colors hover:bg-accent/40",
        dragOver && "border-primary bg-accent"
      )}
      role="button"
      tabIndex={0}
    >
      <div className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <ImageIcon className="size-5" />
      </div>
      <div className="text-center">
        <p className="font-medium">Arraste ou clique para selecionar uma imagem</p>
        <p className="text-xs text-muted-foreground">
          Você também pode colar com <kbd className="rounded bg-muted px-1 text-[10px]">Ctrl+V</kbd>
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
        }}
      />
    </div>
  )
}
