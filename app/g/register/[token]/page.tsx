"use client"

import { use, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ArrowRight, Copy, Check } from "lucide-react"
import { cn } from "@/components/ui/utils"

const COLOR_PALETTE = [
  "#F87171", "#FB923C", "#FBBF24", "#A3E635", "#34D399",
  "#22D3EE", "#60A5FA", "#A78BFA", "#F472B6", "#E879F9",
  "#94A3B8", "#FDE047",
]

export default function GuestRegisterPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()

  const [name, setName] = useState("")
  const [color, setColor] = useState(COLOR_PALETTE[6])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personalToken, setPersonalToken] = useState<string | null>(null)
  const [participantName, setParticipantName] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const personalUrl = personalToken && typeof window !== "undefined"
    ? `${window.location.origin}/g/${personalToken}` : ""

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true); setError(null)
    try {
      const res = await fetch("/api/invite/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name: name.trim(), color }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Erro ao cadastrar")
      setPersonalToken(json.personalToken)
      setParticipantName(json.participant?.name ?? name.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido")
    } finally {
      setSubmitting(false)
    }
  }

  const handleCopy = async () => {
    if (!personalUrl) return
    try {
      await navigator.clipboard.writeText(personalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { }
  }

  if (personalToken) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-lg space-y-6 rounded-2xl border border-border bg-card p-8 shadow-lg">
          <div className="space-y-2 text-center">
            <div
              className="mx-auto h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: color, color: "#0a0a0a" }}
            >
              {participantName?.charAt(0)?.toUpperCase()}
            </div>
            <h1 className="text-2xl font-semibold">Bem-vindo, {participantName}</h1>
            <p className="text-sm text-muted-foreground">
              Salve este link — é seu acesso. Se perder, peça um novo convite.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Seu link mágico</Label>
            <div className="flex gap-2">
              <Input value={personalUrl} readOnly className="font-mono text-xs" />
              <Button type="button" onClick={handleCopy} aria-label="Copiar" className="shrink-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => router.push(`/g/${personalToken}`)}
          >
            Entrar agora <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-8 shadow-lg">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Você foi convidado</h1>
          <p className="text-sm text-muted-foreground">Escolha um nome e uma cor pra te identificar.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome</Label>
          <Input
            id="name"
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={40}
            required
            placeholder="Como o pessoal te chama"
          />
        </div>

        <div className="space-y-2">
          <Label>Cor</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={cn(
                  "h-9 w-9 rounded-full border-2 transition-all",
                  color === c ? "border-foreground scale-110" : "border-transparent hover:scale-110"
                )}
                style={{ backgroundColor: c }}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={submitting || !name.trim()}>
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando</> : "Cadastrar"}
        </Button>
      </form>
    </div>
  )
}
