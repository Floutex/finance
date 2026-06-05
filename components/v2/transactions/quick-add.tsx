"use client"

import * as React from "react"
import { Loader2, Sparkles } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Dialog, DialogContent } from "@/components/v2/primitives/dialog"
import { useParticipants } from "@/hooks/use-participants"

type CreatePayload = {
  description: string
  category: string | null
  paid_by: string
  date: string
  amount: number
  participants: string[]
  custom_shares: Record<string, number> | null
  receipt_file?: File | null
}

type QuickAddProps = {
  currentUser: string
  defaultParticipants: string[]
  /** Persiste uma ou várias transações de uma vez (mesma lógica do formulário). */
  onCreateMany: (payloads: CreatePayload[]) => Promise<void>
  /**
   * Quem pode ser "pago por". Default = membros. Convidados passam só o próprio
   * nome para registrarem o que eles pagaram.
   */
  payerNames?: string[]
}

/**
 * Cmd+K: digite um ou vários gastos em linguagem natural ("mercado 80, uber 25
 * ontem com a Ana"), aperte Enter e a IA extrai e cria todas as transações num
 * único disparo — sem perguntas de follow-up. Falha → mensagem curta.
 */
export function QuickAdd({
  currentUser,
  defaultParticipants,
  onCreateMany,
  payerNames,
}: QuickAddProps) {
  const { active, members } = useParticipants()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setErrorMsg(null)
      setPending(false)
    } else {
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  async function submit() {
    const text = query.trim()
    if (!text || pending) return
    setPending(true)
    setErrorMsg(null)
    try {
      const res = await fetch("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          currentUser,
          members: payerNames ?? members.map((m) => m.name),
          participants: active.map((p) => p.name),
          defaultParticipants,
          today: new Date().toISOString().slice(0, 10),
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        transactions?: {
          description: string
          amount: number
          date: string
          paid_by: string
          category: string | null
          participants: string[]
        }[]
      }

      if (!res.ok || !data.ok || !data.transactions?.length) {
        setErrorMsg(data.error || `Falha ao processar (HTTP ${res.status}).`)
        return
      }

      await onCreateMany(
        data.transactions.map((t) => ({
          description: t.description,
          category: t.category,
          paid_by: t.paid_by,
          date: t.date,
          amount: t.amount,
          participants: t.participants,
          custom_shares: null,
          receipt_file: null,
        }))
      )
      // handleCreateMany já mostra o toast de resumo; fecha o palette.
      setOpen(false)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Falha ao adicionar.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent hideClose className="max-w-2xl overflow-hidden p-0 shadow-2xl">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
          {/* Input row */}
          <div className="flex items-center border-b border-border px-3">
            {pending ? (
              <Loader2 className="mr-2 size-4 shrink-0 animate-spin text-primary" />
            ) : (
              <Sparkles className="mr-2 size-4 shrink-0 text-primary opacity-80" />
            )}
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="Adicionar gastos: ex. “mercado 80, uber 25 ontem com a Ana”"
              disabled={pending}
              className={cn(
                "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>

          {/* Status area */}
          <div className="px-4 py-4">
            {pending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Adicionando…
              </div>
            ) : errorMsg ? (
              <p className="text-sm text-destructive">{errorMsg}</p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Descreva um ou vários gastos e aperte Enter. A IA cria as
                transações pra você.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
