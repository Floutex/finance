"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Copy, RefreshCw, Check } from "lucide-react"

export function InvitePanel() {
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState("")

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch("/api/invite", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro")
      setToken(json.token)
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

  const url = token ? `${origin}/g/register/${token}` : ""

  const handleCopy = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { }
  }

  const handleRegenerate = async () => {
    if (!confirm("Gerar um link novo invalida o atual. Confirma?")) return
    setRegenerating(true); setError(null)
    try {
      const res = await fetch("/api/invite", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro")
      setToken(json.token)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold mb-1">Link de convite global</h3>
        <p className="text-sm text-muted-foreground">
          Mande este link no zap. Quem abrir escolhe um nome e uma cor, e recebe um link mágico próprio pra acessar.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando link...
        </div>
      ) : (
        <div className="flex gap-2">
          <Input value={url} readOnly className="font-mono text-xs" />
          <Button type="button" onClick={handleCopy} disabled={!url} className="shrink-0" aria-label="Copiar">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" size="sm" onClick={handleRegenerate} disabled={regenerating || loading}>
          {regenerating ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Gerando</> : <><RefreshCw className="mr-2 h-3.5 w-3.5" />Gerar novo link</>}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
