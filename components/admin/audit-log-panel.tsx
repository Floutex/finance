"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { useParticipants } from "@/hooks/use-participants"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { formatCurrency, getParticipantStyle } from "@/lib/constants"

type AuditRow = {
  id: number
  transaction_id: string
  actor: string | null
  action: "insert" | "update" | "delete" | string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  created_at: string
}

const TRACKED_FIELDS: Array<{ key: string; label: string; format?: (v: unknown) => string }> = [
  { key: "description", label: "Descrição" },
  { key: "category", label: "Categoria" },
  { key: "paid_by", label: "Pago por" },
  { key: "date", label: "Data" },
  { key: "amount", label: "Valor", format: (v) => typeof v === "number" ? formatCurrency(v) : String(v ?? "") },
  { key: "participants", label: "Participantes", format: (v) => Array.isArray(v) ? v.join(", ") : String(v ?? "") },
  { key: "is_hidden", label: "Excluído", format: (v) => v ? "Sim" : "Não" },
  { key: "receipt_url", label: "Recibo", format: (v) => v ? "Anexado" : "—" },
]

function fmtValue(field: string, value: unknown): string {
  const def = TRACKED_FIELDS.find(f => f.key === field)
  if (def?.format) return def.format(value)
  if (value === null || value === undefined || value === "") return "—"
  return String(value)
}

export function AuditLogPanel() {
  const { active } = useParticipants()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [actorFilter, setActorFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [startFilter, setStartFilter] = useState("")
  const [endFilter, setEndFilter] = useState("")
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const fetchPage = useCallback(async (cursor: string | null) => {
    setLoading(true); setError(null)
    const params = new URLSearchParams()
    if (actorFilter) params.set("actor", actorFilter)
    if (actionFilter) params.set("action", actionFilter)
    if (startFilter) params.set("start", startFilter)
    if (endFilter) params.set("end", endFilter + "T23:59:59")
    if (cursor) params.set("cursor", cursor)
    try {
      const res = await fetch(`/api/admin/audit?${params.toString()}`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar logs")
      if (cursor) setRows(prev => [...prev, ...json.items])
      else setRows(json.items)
      setNextCursor(json.nextCursor)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setLoading(false)
    }
  }, [actorFilter, actionFilter, startFilter, endFilter])

  useEffect(() => {
    setRows([])
    setNextCursor(null)
    fetchPage(null)
  }, [fetchPage])

  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden flex flex-col">
      <div className="grid gap-3 px-6 py-4 border-b border-border/40 md:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="audit-actor">Ator</Label>
          <Select id="audit-actor" value={actorFilter} onChange={e => setActorFilter(e.target.value)}>
            <option value="">Todos</option>
            {active.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-action">Ação</Label>
          <Select id="audit-action" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
            <option value="">Todas</option>
            <option value="insert">Criação</option>
            <option value="update">Edição</option>
            <option value="delete">Exclusão</option>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-start">De</Label>
          <Input id="audit-start" type="date" value={startFilter} onChange={e => setStartFilter(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="audit-end">Até</Label>
          <Input id="audit-end" type="date" value={endFilter} onChange={e => setEndFilter(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 max-h-[65vh] overflow-y-auto">
        {loading && rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground">
            <Loader2 className="mx-auto h-6 w-6 animate-spin opacity-60 mb-2" />
            Carregando logs...
          </div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-12 text-center text-muted-foreground text-sm">
            Nenhum log encontrado para os filtros aplicados.
          </div>
        ) : (
          <ul className="divide-y divide-border/40">
            {rows.map(row => {
              const expanded = expandedId === row.id
              const desc = ((row.after?.description ?? row.before?.description) as string) || "—"
              const amount = (row.after?.amount ?? row.before?.amount) as number | null
              return (
                <li key={row.id} className="px-4 md:px-6 py-3 hover:bg-muted/20">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : row.id)}
                    className="w-full text-left flex flex-wrap items-center gap-3"
                  >
                    <span className="text-muted-foreground">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums min-w-[140px]">
                      {format(parseISO(row.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                    {row.actor ? (
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                        style={getParticipantStyle(row.actor, active)}
                      >
                        {row.actor}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">desconhecido</span>
                    )}
                    <span className={
                      "text-xs px-2 py-0.5 rounded-full font-medium " +
                      (row.action === "insert" ? "bg-green-500/15 text-green-300" :
                        row.action === "delete" ? "bg-red-500/15 text-red-300" :
                          "bg-blue-500/15 text-blue-300")
                    }>
                      {row.action === "insert" ? "criou" : row.action === "delete" ? "excluiu" : "editou"}
                    </span>
                    <span className="flex-1 truncate text-sm">{desc}</span>
                    {typeof amount === "number" && (
                      <span className="text-sm tabular-nums text-muted-foreground">{formatCurrency(amount)}</span>
                    )}
                  </button>

                  {expanded && (
                    <div className="mt-3 ml-7 rounded-md border border-border/60 bg-muted/10 p-3 text-xs">
                      {row.action === "insert" ? (
                        <div className="space-y-1">
                          <p className="text-muted-foreground font-medium mb-2">Valores criados:</p>
                          {TRACKED_FIELDS.map(f => (
                            <div key={f.key} className="flex gap-2">
                              <span className="min-w-[120px] text-muted-foreground">{f.label}</span>
                              <span className="font-medium">{fmtValue(f.key, row.after?.[f.key])}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {TRACKED_FIELDS.map(f => {
                            const oldV = row.before?.[f.key]
                            const newV = row.after?.[f.key]
                            const oldStr = fmtValue(f.key, oldV)
                            const newStr = fmtValue(f.key, newV)
                            if (oldStr === newStr) return null
                            return (
                              <div key={f.key} className="grid gap-1 md:grid-cols-[140px_1fr_auto_1fr]">
                                <span className="text-muted-foreground">{f.label}</span>
                                <span className="line-through text-red-300/80 break-all">{oldStr}</span>
                                <span className="text-muted-foreground hidden md:inline">→</span>
                                <span className="text-green-300 break-all">{newStr}</span>
                              </div>
                            )
                          })}
                          {TRACKED_FIELDS.every(f => fmtValue(f.key, row.before?.[f.key]) === fmtValue(f.key, row.after?.[f.key])) && (
                            <p className="text-muted-foreground italic">Nenhuma diferença em campos rastreados.</p>
                          )}
                        </div>
                      )}
                      <p className="mt-3 pt-2 border-t border-border/30 text-muted-foreground">
                        ID da transação: <code className="text-foreground">{row.transaction_id}</code>
                      </p>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        {error && <p className="px-6 py-3 text-sm text-destructive" role="alert">{error}</p>}
      </div>

      <div className="flex items-center justify-between border-t border-border/60 px-6 py-3">
        <span className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? "registro" : "registros"}</span>
        {nextCursor && (
          <Button type="button" variant="outline" size="sm" onClick={() => fetchPage(nextCursor)} disabled={loading}>
            {loading ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Carregando</> : "Carregar mais"}
          </Button>
        )}
      </div>
    </div>
  )
}
