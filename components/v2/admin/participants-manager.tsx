"use client"

import * as React from "react"
import {
  Archive,
  ArchiveRestore,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { toast } from "sonner"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Input } from "@/components/v2/primitives/input"
import { Label } from "@/components/v2/primitives/label"
import { Badge } from "@/components/v2/primitives/badge"
import { Checkbox } from "@/components/v2/primitives/checkbox"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/v2/primitives/dialog"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"
import { reloadParticipants } from "@/lib/participants-cache"

type GuestToken = {
  token: string
  kind: string
  label: string | null
  participant_id: string | null
  created_at: string
  revoked_at: string | null
}

type Guest = {
  id: string
  name: string
  color: string
  kind: string
  is_archived: boolean
  created_at: string
  tokens: GuestToken[]
  transactionCount: number
  lastActivity: string | null
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/
const COLOR_PALETTE = [
  "#F87171", "#FB923C", "#FBBF24", "#A3E635", "#34D399",
  "#22D3EE", "#60A5FA", "#A78BFA", "#F472B6", "#E879F9",
  "#94A3B8", "#FDE047",
]

export function ParticipantsManager() {
  const [items, setItems] = React.useState<Guest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showArchived, setShowArchived] = React.useState(false)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [editGuest, setEditGuest] = React.useState<Guest | null>(null)
  const [pendingId, setPendingId] = React.useState<string | null>(null)
  const [copiedToken, setCopiedToken] = React.useState<string | null>(null)
  const [origin, setOrigin] = React.useState("")

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/guests", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha ao carregar")
      setItems(json.items)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao carregar")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    setOrigin(window.location.origin)
    load()
  }, [load])

  const visible = showArchived ? items : items.filter((g) => !g.is_archived)

  const toggleArchive = async (g: Guest) => {
    setPendingId(g.id)
    try {
      const res = await fetch("/api/admin/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: g.id, is_archived: !g.is_archived }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      await reloadParticipants()
      await load()
      toast.success(g.is_archived ? "Desarquivado." : "Arquivado.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha.")
    } finally {
      setPendingId(null)
    }
  }

  const generateToken = async (g: Guest) => {
    setPendingId(g.id)
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: g.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      await load()
      toast.success("Novo link gerado.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha.")
    } finally {
      setPendingId(null)
    }
  }

  const revokeToken = async (token: string) => {
    try {
      const res = await fetch("/api/admin/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revokeToken", token }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      await load()
      toast.success("Token revogado.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha.")
    }
  }

  const copyUrl = async (token: string) => {
    const url = `${origin}/v2/g/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 1500)
    } catch {}
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 md:gap-8 md:px-8 md:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Admin
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Participantes
          </h1>
          <p className="text-sm text-muted-foreground">
            Convidados dinâmicos da plataforma. Gere magic-links pessoais para
            que vejam o próprio saldo.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={showArchived}
            onCheckedChange={(v) => setShowArchived(!!v)}
          />
          Mostrar arquivados
        </label>
      </header>

      <div className="surface-1 overflow-hidden rounded-xl">
        {loading ? (
          <ul className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <Skeleton className="h-9 w-2/3" />
              </li>
            ))}
          </ul>
        ) : visible.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Nenhum convidado.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((g) => {
              const expanded = expandedId === g.id
              const busy = pendingId === g.id
              const activeTokens = g.tokens.filter((t) => !t.revoked_at)
              return (
                <li key={g.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : g.id)}
                      className="text-muted-foreground"
                      aria-label={expanded ? "Recolher" : "Expandir"}
                    >
                      {expanded ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <ParticipantAvatar name={g.name} hex={g.color} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm font-medium",
                          g.is_archived && "text-muted-foreground line-through"
                        )}
                      >
                        {g.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {g.transactionCount}{" "}
                        {g.transactionCount === 1 ? "transação" : "transações"}
                        {g.lastActivity && (
                          <>
                            {" · ativo "}
                            {format(parseISO(g.lastActivity), "dd MMM yyyy", {
                              locale: ptBR,
                            })}
                          </>
                        )}
                        {activeTokens.length > 0 && (
                          <>
                            {" · "}
                            <Badge
                              variant="outline"
                              className="ml-1 text-[10px] uppercase tracking-wider"
                            >
                              {activeTokens.length} link
                              {activeTokens.length > 1 ? "s" : ""}
                            </Badge>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label="Editar"
                        onClick={() => setEditGuest(g)}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label={g.is_archived ? "Desarquivar" : "Arquivar"}
                        disabled={busy}
                        onClick={() => toggleArchive(g)}
                      >
                        {busy ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : g.is_archived ? (
                          <ArchiveRestore className="size-3.5" />
                        ) : (
                          <Archive className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="ml-7 mt-3 space-y-3">
                      <div className="grid grid-cols-3 gap-3 rounded-md border border-border bg-background/40 p-3 text-xs">
                        <div>
                          <p className="font-medium">{g.transactionCount}</p>
                          <p className="text-muted-foreground">transações</p>
                        </div>
                        <div>
                          <p className="font-medium">
                            {g.lastActivity
                              ? format(parseISO(g.lastActivity), "dd MMM yyyy", {
                                  locale: ptBR,
                                })
                              : "—"}
                          </p>
                          <p className="text-muted-foreground">última atividade</p>
                        </div>
                        <div>
                          <p className="font-medium">
                            {format(parseISO(g.created_at), "dd MMM yyyy", {
                              locale: ptBR,
                            })}
                          </p>
                          <p className="text-muted-foreground">criado em</p>
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-muted-foreground">
                            Magic-links pessoais
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateToken(g)}
                            disabled={busy}
                          >
                            <Plus className="size-3.5" />
                            Novo link
                          </Button>
                        </div>
                        {g.tokens.length === 0 ? (
                          <p className="py-2 text-center text-xs italic text-muted-foreground">
                            Nenhum token gerado.
                          </p>
                        ) : (
                          <ul className="flex flex-col gap-1.5">
                            {g.tokens.map((t) => {
                              const url = `${origin}/v2/g/${t.token}`
                              const revoked = !!t.revoked_at
                              const isCopied = copiedToken === t.token
                              return (
                                <li
                                  key={t.token}
                                  className={cn(
                                    "flex flex-wrap items-center gap-2 rounded-md border border-border bg-background/40 px-3 py-2 text-xs",
                                    revoked && "opacity-50"
                                  )}
                                >
                                  <Input
                                    value={url}
                                    readOnly
                                    className="h-7 flex-1 min-w-[200px] font-mono text-[11px]"
                                  />
                                  <span className="tabular-nums text-muted-foreground">
                                    {format(parseISO(t.created_at), "dd/MM/yy HH:mm", {
                                      locale: ptBR,
                                    })}
                                  </span>
                                  {revoked ? (
                                    <span className="italic text-destructive">
                                      revogado
                                    </span>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7"
                                        aria-label="Copiar URL"
                                        onClick={() => copyUrl(t.token)}
                                      >
                                        {isCopied ? (
                                          <Check className="size-3.5" />
                                        ) : (
                                          <Copy className="size-3.5" />
                                        )}
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="size-7 text-muted-foreground hover:text-destructive"
                                        aria-label="Revogar"
                                        onClick={() => revokeToken(t.token)}
                                      >
                                        <Ban className="size-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </li>
                              )
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <EditParticipantDialog
        guest={editGuest}
        onClose={() => setEditGuest(null)}
        onSaved={async () => {
          setEditGuest(null)
          await reloadParticipants()
          await load()
        }}
      />
    </div>
  )
}

type EditDialogProps = {
  guest: Guest | null
  onClose: () => void
  onSaved: () => Promise<void>
}

function EditParticipantDialog({ guest, onClose, onSaved }: EditDialogProps) {
  const [name, setName] = React.useState("")
  const [color, setColor] = React.useState("")
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    if (guest) {
      setName(guest.name)
      setColor(guest.color)
    }
  }, [guest])

  const submit = async () => {
    if (!guest) return
    if (!name.trim()) {
      toast.error("Nome obrigatório.")
      return
    }
    if (!HEX_RE.test(color)) {
      toast.error("Cor deve ser hex #RRGGBB.")
      return
    }
    setPending(true)
    try {
      const res = await fetch("/api/admin/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: guest.id, name: name.trim(), color }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Falha")
      toast.success("Participante atualizado.")
      await onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha.")
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={guest !== null}
      onOpenChange={(o) => {
        if (!o && !pending) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar participante</DialogTitle>
          <DialogDescription>
            Renomear propaga em todas as transações. Cor afeta badges e charts.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="p-name">Nome</Label>
            <Input
              id="p-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-color">Cor</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="size-9 cursor-pointer rounded-md border border-border bg-transparent"
              />
              <Input
                id="p-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="max-w-[120px] font-mono text-xs"
                placeholder="#RRGGBB"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-6 rounded-full border-2 transition-all",
                    color.toLowerCase() === c.toLowerCase()
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-110"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
