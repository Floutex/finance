"use client"

import { ReactNode, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ADMIN_USER, SESSION_USER_KEY, getUserGradient } from "@/lib/constants"
import { ArrowLeft, History, Tag, Users } from "lucide-react"
import { cn } from "@/components/ui/utils"

const TABS = [
  { href: "/admin/categories", label: "Categorias", icon: Tag },
  { href: "/admin/guests", label: "Convidados", icon: Users },
  { href: "/admin/logs", label: "Logs", icon: History },
] as const

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_USER_KEY)
      setUser(stored && stored.length > 0 ? stored : null)
    } catch {
      setUser(null)
    }
  }, [])

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
      </div>
    )
  }

  if (user === null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center">
        <p className="text-lg font-medium">Faça login para acessar o admin</p>
        <Link
          href="/"
          className="rounded-full border border-white/10 bg-black/30 px-5 py-2 text-sm font-medium text-foreground transition-all hover:bg-black/50"
        >
          Ir para login
        </Link>
      </div>
    )
  }

  if (user !== ADMIN_USER) {
    return (
      <div className={cn("flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center", getUserGradient(user))}>
        <p className="text-2xl font-semibold">Sem permissão</p>
        <p className="text-sm text-muted-foreground max-w-md">
          A área de administração é restrita ao admin da plataforma.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-full border border-white/10 bg-black/30 px-5 py-2 text-sm font-medium text-foreground transition-all hover:bg-black/50"
        >
          Voltar ao dashboard
        </button>
      </div>
    )
  }

  return (
    <div className={cn("min-h-screen", getUserGradient(user))}>
      <main className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-muted-foreground transition-all hover:bg-black/50 hover:text-foreground"
              aria-label="Voltar"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
              <p className="text-xs text-muted-foreground">Categorias, convidados e logs</p>
            </div>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-border/50 bg-black/30 p-1 backdrop-blur-xl">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = pathname === tab.href || pathname?.startsWith(tab.href + "/")
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            )
          })}
        </nav>

        <section className="animate-fade-in">{children}</section>
      </main>
    </div>
  )
}
