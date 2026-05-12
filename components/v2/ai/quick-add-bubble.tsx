"use client"

import * as React from "react"
import { Bot, ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Currency } from "@/components/v2/finance/currency"
import { createTransaction, type CreatePayload } from "@/lib/v2/transaction-mutations"
import { updateTransactionsCache } from "@/lib/transactions-cache"
import type { Tables } from "@/lib/database.types"

type Transaction = Tables<"shared_transactions">

type TxIntentData = {
  description: string
  amount: number
  date: string
  paid_by: string
  participants: string[]
  category: string | null
}

type Intent =
  | { intent: "create_transaction"; data: TxIntentData; summary?: string }
  | { intent: "create_transactions_batch"; items: TxIntentData[]; summary?: string }
  | null

type Message = {
  id: string
  role: "user" | "assistant"
  text?: string
  imageDataUrl?: string
  intent?: Intent
  /** When the proposal was already actioned (accepted/declined). */
  resolved?: "accepted" | "declined"
}

type QuickAddBubbleProps = {
  currentUser: string
  members: string[]
  participants: string[]
  /** Optional: called after a transaction is created (in addition to the global cache update). */
  onTransactionCreated?: (created: Transaction) => void
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

const GREETING: Message = {
  id: "greet",
  role: "assistant",
  text:
    "Oi! Posso registrar despesas e ler recibos pra você. Escreva algo como “Almoço com pessoal 45,90” ou anexe a foto de um cupom. ✨",
}

export function QuickAddBubble({
  currentUser,
  members,
  participants,
  onTransactionCreated,
}: QuickAddBubbleProps) {
  const [open, setOpen] = React.useState(false)
  const [messages, setMessages] = React.useState<Message[]>([GREETING])
  const [input, setInput] = React.useState("")
  const [pendingImage, setPendingImage] = React.useState<string | null>(null)
  const [sending, setSending] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [messages, sending])

  // Paste image from clipboard while panel is open.
  React.useEffect(() => {
    if (!open) return
    const handler = async (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) =>
        i.type.startsWith("image/")
      )
      if (!item) return
      const file = item.getAsFile()
      if (file) {
        e.preventDefault()
        loadImage(file)
      }
    }
    window.addEventListener("paste", handler)
    return () => window.removeEventListener("paste", handler)
  }, [open])

  function loadImage(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      setPendingImage(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  async function send() {
    const text = input.trim()
    if (!text && !pendingImage) return
    if (sending) return

    const userMsg: Message = {
      id: uid(),
      role: "user",
      text,
      imageDataUrl: pendingImage ?? undefined,
    }
    const nextMessages = [...messages, userMsg]
    setMessages(nextMessages)
    setInput("")
    setPendingImage(null)
    setSending(true)

    try {
      const payload = {
        currentUser,
        members,
        participants,
        today: new Date().toISOString().slice(0, 10),
        messages: nextMessages
          .filter((m) => m.id !== "greet")
          .map((m) => ({
            role: m.role,
            text: m.text,
            imageDataUrl: m.imageDataUrl,
          })),
      }
      const res = await fetch("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.details || err.error || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { text: string; intent: Intent }

      let humanText = data.text
      if (data.intent) {
        humanText = data.intent.summary ?? "Aqui está a proposta — confirme abaixo."
      }

      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: humanText,
          intent: data.intent,
        },
      ])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao falar com a IA")
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: "Tive um problema falando com a IA. Tenta de novo?",
        },
      ])
    } finally {
      setSending(false)
    }
  }

  async function confirmIntent(messageId: string, intent: Intent) {
    if (!intent) return
    try {
      const items =
        intent.intent === "create_transaction"
          ? [intent.data]
          : intent.items
      const created: Transaction[] = []
      for (const it of items) {
        const payload: CreatePayload = {
          description: it.description,
          category: it.category,
          paid_by: it.paid_by,
          date: it.date,
          amount: Number(it.amount),
          participants:
            it.participants && it.participants.length > 0
              ? it.participants
              : participants,
          custom_shares: null,
          currentUser,
        }
        const tx = await createTransaction(payload)
        created.push(tx)
        updateTransactionsCache((prev) => [tx, ...prev])
        onTransactionCreated?.(tx)
      }
      toast.success(
        created.length === 1
          ? "Transação criada."
          : `${created.length} transações criadas.`
      )
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, resolved: "accepted" } : m))
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar.")
    }
  }

  function declineIntent(messageId: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, resolved: "declined" } : m))
    )
  }

  function reset() {
    setMessages([GREETING])
    setInput("")
    setPendingImage(null)
  }

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-4 right-4 z-40 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          open && "scale-90"
        )}
        aria-label={open ? "Fechar assistente" : "Abrir assistente"}
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-40 flex h-[min(640px,calc(100vh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
          {/* Header */}
          <header className="flex items-center gap-2 border-b border-border bg-muted/30 px-4 py-3">
            <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
              <Bot className="size-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Assistente</p>
              <p className="text-[11px] text-muted-foreground">
                Quick-add com IA
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              className="text-xs"
            >
              Limpar
            </Button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3">
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  onConfirm={() => confirmIntent(m.id, m.intent ?? null)}
                  onDecline={() => declineIntent(m.id)}
                  currentUser={currentUser}
                />
              ))}
              {sending && (
                <div className="flex items-center gap-2 px-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  pensando…
                </div>
              )}
            </div>
          </div>

          {/* Pending image preview */}
          {pendingImage && (
            <div className="flex items-center gap-2 border-t border-border bg-muted/30 px-3 py-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={pendingImage}
                alt="Anexo"
                className="size-12 rounded-md border border-border object-cover"
              />
              <span className="flex-1 text-xs text-muted-foreground">
                Imagem anexada
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPendingImage(null)}
                aria-label="Remover anexo"
              >
                <X className="size-4" />
              </Button>
            </div>
          )}

          {/* Composer */}
          <div className="border-t border-border bg-background px-3 py-2">
            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Anexar imagem"
                disabled={sending}
              >
                <ImagePlus className="size-4" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) loadImage(f)
                  e.target.value = ""
                }}
              />
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    send()
                  }
                }}
                placeholder="Escreva ou cole uma imagem…"
                rows={1}
                className="flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm leading-tight outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring"
                disabled={sending}
              />
              <Button
                type="button"
                size="icon"
                onClick={send}
                disabled={sending || (!input.trim() && !pendingImage)}
                aria-label="Enviar"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function MessageBubble({
  message,
  onConfirm,
  onDecline,
  currentUser,
}: {
  message: Message
  onConfirm: () => void
  onDecline: () => void
  currentUser: string
}) {
  const isUser = message.role === "user"
  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.imageDataUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={message.imageDataUrl}
            alt="Anexo"
            className="mb-2 max-h-48 rounded-md object-contain"
          />
        )}
        {message.text && (
          <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
        )}
        {!isUser && message.intent && (
          <IntentCard
            intent={message.intent}
            resolved={message.resolved}
            onConfirm={onConfirm}
            onDecline={onDecline}
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  )
}

function IntentCard({
  intent,
  resolved,
  onConfirm,
  onDecline,
  currentUser,
}: {
  intent: Intent
  resolved?: "accepted" | "declined"
  onConfirm: () => void
  onDecline: () => void
  currentUser: string
}) {
  if (!intent) return null
  const items =
    intent.intent === "create_transaction" ? [intent.data] : intent.items

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-border bg-background/60 p-2 text-foreground">
      {items.map((it, i) => (
        <div key={i} className="rounded-md border border-border/60 bg-card p-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-xs font-medium">{it.description}</span>
            <Currency value={Number(it.amount)} className="text-xs font-semibold" />
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
            <span>{it.date}</span>
            <span>
              pago por <strong className="text-foreground">{it.paid_by || currentUser}</strong>
            </span>
            {it.category && <span>· {it.category}</span>}
            {it.participants?.length > 0 && (
              <span>· {it.participants.join(", ")}</span>
            )}
          </div>
        </div>
      ))}
      {resolved === "accepted" ? (
        <p className="text-xs font-medium text-emerald-500">✓ Salvo</p>
      ) : resolved === "declined" ? (
        <p className="text-xs text-muted-foreground">Descartado</p>
      ) : (
        <div className="flex gap-2">
          <Button type="button" size="sm" className="h-7 flex-1" onClick={onConfirm}>
            Confirmar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7"
            onClick={onDecline}
          >
            Descartar
          </Button>
        </div>
      )}
    </div>
  )
}
