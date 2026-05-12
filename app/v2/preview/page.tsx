import { Button } from "@/components/v2/primitives/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/v2/primitives/card"
import { Input } from "@/components/v2/primitives/input"
import { Label } from "@/components/v2/primitives/label"
import { Badge } from "@/components/v2/primitives/badge"
import { Separator } from "@/components/v2/primitives/separator"
import { Skeleton } from "@/components/v2/primitives/skeleton"
import { Currency } from "@/components/v2/finance/currency"
import { ParticipantBadge } from "@/components/v2/finance/participant-badge"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"
import { ParticipantStack } from "@/components/v2/finance/participant-stack"
import { MetricCard } from "@/components/v2/finance/metric-card"
import { ArrowUpRight, Wallet, Users, Receipt } from "lucide-react"

/**
 * Phase 1 smoke page — proves the v2 foundations render correctly.
 * Replaced in Phase 2 with a redirect to /v2/dashboard.
 */
export default function V2Index() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <header className="mb-10 space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Fase 1 · Foundations
        </p>
        <h1 className="font-display text-4xl font-semibold tracking-tight">
          Gastos Compartilhados <span className="text-muted-foreground">v2</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Smoke page validando primitives. Será substituído pelo dashboard na Fase 3.
        </p>
      </header>

      <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard
          label="Saldo do mês"
          value={2847.5}
          signed
          hint="+12,4% vs mês anterior"
          trend="up"
          icon={<Wallet />}
        />
        <MetricCard
          label="Gastos"
          value={1832.9}
          hint="42 transações"
          icon={<Receipt />}
        />
        <MetricCard
          label="Pendente"
          value={-318.2}
          signed
          hint="você deve a Júlia"
          trend="down"
          icon={<ArrowUpRight />}
        />
        <MetricCard
          label="Participantes"
          icon={<Users />}
        >
          <span className="font-display text-3xl font-semibold">4</span>
        </MetricCard>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Currency variants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Padrão</span>
              <Currency value={1234.56} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sinalizado positivo</span>
              <Currency value={420.0} signed />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Sinalizado negativo</span>
              <Currency value={-89.9} signed />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Display</span>
              <Currency value={5827.42} display />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Participantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <ParticipantBadge name="Antônio" />
              <ParticipantBadge name="Júlia" />
              <ParticipantBadge name="Simões" />
              <ParticipantBadge name="Pietro" />
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <ParticipantAvatar name="Antônio" size="sm" />
              <ParticipantAvatar name="Júlia" size="md" />
              <ParticipantAvatar name="Simões" size="lg" />
            </div>
            <Separator />
            <div className="flex items-center gap-4">
              <ParticipantStack names={["Antônio", "Júlia", "Simões", "Pietro"]} />
              <span className="text-xs text-muted-foreground">
                stack máximo 3 + overflow
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Form + badges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="smoke-input">Descrição</Label>
              <Input id="smoke-input" placeholder="Almoço com pessoal" />
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>default</Badge>
              <Badge variant="secondary">secondary</Badge>
              <Badge variant="success">success</Badge>
              <Badge variant="warning">warning</Badge>
              <Badge variant="destructive">destructive</Badge>
              <Badge variant="outline">outline</Badge>
            </div>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card>
          <CardHeader>
            <CardTitle>Skeleton</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
