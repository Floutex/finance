"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  Pencil,
  Archive,
  ArchiveRestore,
  Copy,
  Check,
  Plus,
  Ban,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { reloadParticipants } from "@/lib/participants-cache"

type Guest = {
  id: string
  name: string
  color: string
  kind: string
  is_archived: boolean
  created_at: string
  tokens: Array<{
    token: string
    kind: string
    label: string | null
    participant_id: string | null
    created_at: string
    revoked_at: string | null
  }>
  transactionCount: number
  lastActivity: string | null
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

export function GuestsPanel() {
  const [items, setItems] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [origin, setOrigin] = useState("")
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/admin/guests", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar")
      setItems(json.items)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setOrigin(window.location.origin)
    refresh()
  }, [refresh])

  const startEdit = (g: Guest) => {
    setEditingId(g.id)
    setEditName(g.name)
    setEditColor(g.color)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName("")
    setEditColor("")
  }

  const saveEdit = async (id: string) => {
    if (!editName.trim() || !HEX_RE.test(editColor)) {
      setError("Preencha nome e uma cor hex válida (#RRGGBB)")
      return
    }
    setPendingId(id); setError(null)
    try {
      const res = await fetch("/api/admin/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: id, name: editName.trim(), color: editColor }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro")
      await reloadParticipants()
      await refresh()
      cancelEdit()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setPendingId(null)
    }
  }

  const toggleArchive = async (g: Guest) => {
    setPendingId(g.id); setError(null)
    try {
      const res = await fetch("/api/admin/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: g.id, is_archived: !g.is_archived }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro")
      await reloadParticipants()
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setPendingId(null)
    }
  }

  const generateToken = async (g: Guest) => {
    setPendingId(g.id); setError(null)
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId: g.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro")
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setPendingId(null)
    }
  }

  const revokeToken = async (token: string) => {
    if (!confirm("Revogar esse token? O link mágico atual deixa de funcionar.")) return
    setError(null)
    try {
      const res = await fetch("/api/admin/guests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revokeToken", token }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro")
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    }
  }

  const copyTokenUrl = async (token: string) => {
    const url = `${origin}/g/${token}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(token)
      setTimeout(() => setCopiedToken(null), 1500)
    } catch { }
  }

  const visible = showArchived ? items : items.filter(g => !g.is_archived)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-black/40"
          />
          Mostrar arquivados
        </label>
        <span className="text-xs text-muted-foreground">
          {visible.length} {visible.length === 1 ? "convidado" : "convidados"}
        </span>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {loading && items.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin opacity-60 mb-2" />
            Carregando convidados...
          </div>
        ) : visible.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            Nenhum convidado.
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {visible.map(g => {
              const editing = editingId === g.id
              const expanded = expandedId === g.id
              const busy = pendingId === g.id
              const activeTokens = g.tokens.filter(t => !t.revoked_at)
              return (
                <li key={g.id} className="px-4 md:px-6 py-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : g.id)}
                      className="text-muted-foreground"
                      aria-label={expanded ? "Recolher" : "Expandir"}
                    >
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {editing ? (
                      <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Nome"
                          className="h-8 md:w-48"
                          autoFocus
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={editColor}
                            onChange={e => setEditColor(e.target.value)}
                            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent"
                          />
                          <Input
                            value={editColor}
                            onChange={e => setEditColor(e.target.value)}
                            className="h-8 w-28 font-mono text-xs"
                            placeholder="#RRGGBB"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" onClick={cancelEdit} disabled={busy}>Cancelar</Button>
                          <Button size="sm" onClick={() => saveEdit(g.id)} disabled={busy}>
                            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div
                          className="h-7 w-7 shrink-0 rounded-full ring-2 ring-background flex items-center justify-center text-[11px] font-bold"
                          style={{ backgroundColor: g.color, color: "#0a0a0a" }}
                          title={g.color}
                        >
                          {g.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={"text-sm font-medium truncate " + (g.is_archived ? "text-muted-foreground line-through" : "")}>
                            {g.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {g.transactionCount} {g.transactionCount === 1 ? "transação" : "transações"}
                            {g.lastActivity && (
                              <> · ativo {format(parseISO(g.lastActivity), "dd/MM/yyyy", { locale: ptBR })}</>
                            )}
                            {activeTokens.length > 0 && (
                              <> · {activeTokens.length} {activeTokens.length === 1 ? "link ativo" : "links ativos"}</>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Editar nome/cor"
                            onClick={() => startEdit(g)}
                            disabled={busy}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title={g.is_archived ? "Desarquivar" : "Arquivar"}
                            onClick={() => toggleArchive(g)}
                            disabled={busy}
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : g.is_archived ? (
                              <ArchiveRestore className="h-3.5 w-3.5" />
                            ) : (
                              <Archive className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </div>

                  {expanded && !editing && (
                    <div className="mt-3 ml-7 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground rounded-md border border-border/60 bg-muted/10 p-3">
                        <div>
                          <p className="text-foreground font-medium">{g.transactionCount}</p>
                          <p>transações</p>
                        </div>
                        <div>
                          <p className="text-foreground font-medium">
                            {g.lastActivity ? format(parseISO(g.lastActivity), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                          </p>
                          <p>última atividade</p>
                        </div>
                        <div>
                          <p className="text-foreground font-medium">
                            {format(parseISO(g.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                          <p>criado em</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-medium text-muted-foreground">Magic-links pessoais</p>
                          <Button size="sm" variant="outline" onClick={() => generateToken(g)} disabled={busy}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Novo link
                          </Button>
                        </div>
                        {g.tokens.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">Nenhum token gerado.</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {g.tokens.map(t => {
                              const url = `${origin}/g/${t.token}`
                              const revoked = !!t.revoked_at
                              const isCopied = copiedToken === t.token
                              return (
                                <li
                                  key={t.token}
                                  className={"flex flex-col md:flex-row md:items-center gap-2 rounded-md border border-border/60 bg-black/20 px-3 py-2 text-xs " + (revoked ? "opacity-50" : "")}
                                >
                                  <Input
                                    value={url}
                                    readOnly
                                    className="font-mono text-[11px] h-7 flex-1"
                                  />
                                  <span className="text-muted-foreground tabular-nums">
                                    {format(parseISO(t.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                  </span>
                                  {revoked ? (
                                    <span className="text-red-300 italic">revogado</span>
                                  ) : (
                                    <div className="flex gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => copyTokenUrl(t.token)}
                                        title="Copiar URL"
                                      >
                                        {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-red-400 hover:bg-red-500/10"
                                        onClick={() => revokeToken(t.token)}
                                        title="Revogar"
                                      >
                                        <Ban className="h-3.5 w-3.5" />
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
        {error && <p className="px-6 py-3 text-sm text-destructive" role="alert">{error}</p>}
      </div>
    </div>
  )
}
