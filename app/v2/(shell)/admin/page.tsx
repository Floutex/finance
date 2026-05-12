import Link from "next/link"
import { Tag, Users, ScrollText, Send, ArrowRight } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/v2/primitives/card"

const SECTIONS = [
  {
    href: "/v2/admin/categories",
    label: "Categorias",
    description: "Criar, renomear e remover categorias de gasto.",
    icon: Tag,
  },
  {
    href: "/v2/admin/participants",
    label: "Participantes",
    description: "Membros e convidados dinâmicos, com cor e tokens de acesso.",
    icon: Users,
  },
  {
    href: "/v2/admin/audit",
    label: "Audit log",
    description: "Histórico de ações na plataforma (filtros por ator, ação, data).",
    icon: ScrollText,
  },
  {
    href: "/v2/admin/invites",
    label: "Convites",
    description: "Gerar links de convite e revogar acessos pendentes.",
    icon: Send,
  },
] as const

export default function AdminOverviewPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:gap-8 md:px-8 md:py-12">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Admin
        </p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Painel administrativo
        </h1>
        <p className="text-sm text-muted-foreground">
          Gerencie categorias, participantes, convites e consulte o histórico de atividades.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {SECTIONS.map(({ href, label, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group"
          >
            <Card className="h-full transition-colors hover:border-foreground/20 hover:bg-accent/40">
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{label}</CardTitle>
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
