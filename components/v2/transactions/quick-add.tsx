"use client"

import * as React from "react"
import { Loader2, Search, Sparkles } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Dialog, DialogContent } from "@/components/v2/primitives/dialog"

type QuickAddProps = {
  currentUser: string
  defaultParticipants: string[]
}

/**
 * Cmd+K palette: type a question, press Enter, the IA answers below.
 * Same visual as the previous command palette — just no actions.
 */
export function QuickAdd({ currentUser, defaultParticipants }: QuickAddProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [pending, setPending] = React.useState(false)
  const [answer, setAnswer] = React.useState<string | null>(null)
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

  // Reset transient state when dialog closes; autofocus when it opens.
  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setAnswer(null)
      setErrorMsg(null)
      setPending(false)
    } else {
      // small delay so the dialog mounts before we focus
      const t = setTimeout(() => inputRef.current?.focus(), 0)
      return () => clearTimeout(t)
    }
  }, [open])

  async function send() {
    const text = query.trim()
    if (!text || pending) return
    setPending(true)
    setErrorMsg(null)
    setAnswer(null)
    try {
      const res = await fetch("/api/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUser,
          members: [],
          participants: defaultParticipants,
          today: new Date().toISOString().slice(0, 10),
          messages: [{ role: "user", text }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.details || err.error || `HTTP ${res.status}`)
      }
      const data = (await res.json()) as { text: string }
      setAnswer(data.text || "(sem resposta)")
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Falha ao falar com a IA")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        hideClose
        className="max-w-2xl overflow-hidden p-0 shadow-2xl"
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground">
          {/* Input row — mimics CommandInput exactly */}
          <div className="flex items-center border-b border-border px-3">
            <Search className="mr-2 size-4 shrink-0 opacity-50" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder="Pergunte algo pra IA…"
              disabled={pending}
              className={cn(
                "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              )}
            />
          </div>

          {/* Response area */}
          <div className="max-h-[300px] overflow-y-auto px-4 py-4">
            {pending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Pensando…
              </div>
            ) : errorMsg ? (
              <p className="text-sm text-destructive">{errorMsg}</p>
            ) : answer ? (
              <div className="flex gap-3">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {answer}
                </p>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Escreva uma pergunta e aperte Enter.
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
