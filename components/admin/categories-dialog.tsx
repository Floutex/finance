"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Pencil, Trash2, X, GitMerge, Check } from "lucide-react"
import { invalidateCategoriesCache } from "@/components/transaction-selectors"
import { reloadTransactions } from "@/lib/transactions-cache"

type Cat = { id: string | null; name: string; inTable: boolean; usage: number }

interface CategoriesDialogProps {
  open: boolean
  actor: string
  onClose: () => void
}

type Mode = { kind: "rename" | "merge"; from: string; to: string } | null

export function CategoriesDialog({ open, actor, onClose }: CategoriesDialogProps) {
  const [items, setItems] = useState<Cat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingName, setPendingName] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>(null)
  const [filter, setFilter] = useState("")

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/admin/categories", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar")
      setItems(json.categories)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    refresh()
  }, [open, refresh])

  const submit = async (action: "rename" | "merge" | "delete", from: string, to?: string) => {
    setPendingName(from); setError(null)
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, from, to, actor }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro ao aplicar")
      invalidateCategoriesCache()
      await reloadTransactions()
      await refresh()
      setMode(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setPendingName(null)
    }
  }

  const filtered = items.filter(c => c.name.toLowerCase().includes(filter.toLowerCase()))

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full items-end md:items-center justify-center p-0 md:p-4">
        <div
          className="w-full md:max-w-2xl max-h-[95vh] md:max-h-[85vh] overflow-hidden rounded-t-2xl md:rounded-lg border border-border bg-card shadow-lg outline-none flex flex-col"
          role="dialog" aria-modal="true" aria-labelledby="cats-title"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <p id="cats-title" className="text-lg font-semibold">Gerenciar categorias</p>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
          </div>

          <div className="px-6 py-3 border-b border-border/40">
            <Input placeholder="Filtrar..." value={filter} onChange={e => setFilter(e.target.value)} />
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading && items.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-6 w-6 animate-spin opacity-60 mb-2" />
                Carregando categorias...
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-12 text-center text-muted-foreground text-sm">
                {filter ? "Nenhuma categoria corresponde ao filtro." : "Nenhuma categoria."}
              </div>
            ) : (
              <ul className="divide-y divide-border/40">
                {filtered.map(c => {
                  const editing = mode && mode.from === c.name
                  const busy = pendingName === c.name
                  return (
                    <li key={c.name} className="px-4 md:px-6 py-3">
                      {editing ? (
                        <div className="flex flex-col gap-2 md:flex-row md:items-center">
                          <span className="text-sm flex-1 truncate">
                            {mode!.kind === "rename" ? "Renomear" : "Mesclar"} <strong>{c.name}</strong> {mode!.kind === "merge" ? "em" : "para"}:
                          </span>
                          <Input
                            autoFocus
                            value={mode!.to}
                            onChange={e => setMode({ ...mode!, to: e.target.value })}
                            className="h-8 w-full md:w-64"
                          />
                          <div className="flex gap-1.5 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setMode(null)} disabled={busy}>Cancelar</Button>
                            <Button
                              size="sm"
                              onClick={() => submit(mode!.kind, c.name, mode!.to)}
                              disabled={busy || !mode!.to.trim() || mode!.to.trim() === c.name}
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {c.usage} {c.usage === 1 ? "transação" : "transações"}
                              {!c.inTable && " · só em transações"}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Renomear"
                              onClick={() => setMode({ kind: "rename", from: c.name, to: c.name })}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              title="Mesclar com outra"
                              onClick={() => setMode({ kind: "merge", from: c.name, to: "" })}
                            >
                              <GitMerge className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-400 hover:bg-red-500/10"
                              title="Excluir"
                              disabled={c.usage > 0 || busy}
                              onClick={() => submit("delete", c.name)}
                            >
                              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            </Button>
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
      </div>
    </div>
  )
}
