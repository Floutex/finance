"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Copy, RefreshCw, X, Check } from "lucide-react"

interface InviteDialogProps {
  open: boolean
  onClose: () => void
}

export function InviteDialog({ open, onClose }: InviteDialogProps) {
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
    if (!open) return
    setOrigin(window.location.origin)
    refresh()
  }, [open, refresh])

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative flex h-full items-end md:items-center justify-center p-0 md:p-4">
        <div
          className="w-full md:max-w-lg rounded-t-2xl md:rounded-lg border border-border bg-card shadow-lg outline-none"
          role="dialog" aria-modal="true" aria-labelledby="invite-title"
        >
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
            <p id="invite-title" className="text-lg font-semibold">Convidar amigo</p>
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar"><X className="h-4 w-4" /></Button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Mande este link no zap. Quem abrir escolhe um nome e uma cor, e recebe um link mágico próprio pra acessar.
            </p>

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
        </div>
      </div>
    </div>
  )
}
