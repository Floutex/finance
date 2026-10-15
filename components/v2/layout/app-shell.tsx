"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  CalendarHeart,
  Tag,
  Users,
  ScrollText,
} from "lucide-react"

import { Sidebar, type SidebarSecondaryNav } from "@/components/v2/layout/sidebar"
import { MobileTopbar } from "@/components/v2/layout/mobile-topbar"
import { OfflineBanner } from "@/components/v2/layout/offline-banner"
import { ShortcutsCheatsheet } from "@/components/v2/layout/shortcuts-cheatsheet"
import { UserMenu } from "@/components/v2/layout/user-menu"
import type { NavItem } from "@/components/v2/layout/nav-section"
import { clearSession, readSession, validateSession, writeSession } from "@/lib/session"
import { useUserPermissions } from "@/hooks/use-user-permissions"

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<string | null>(null)
  const [checked, setChecked] = React.useState(false)

  React.useEffect(() => {
    const session = readSession()
    setChecked(true)
    if (!session) {
      router.replace("/login")
      return
    }
    setUser(session.name)

    let cancelled = false
    validateSession(session).then((name) => {
      if (cancelled || name === undefined) return
      if (name === null) {
        clearSession()
        router.replace("/login")
        return
      }
      if (name !== session.name) {
        writeSession({ ...session, name })
        window.location.reload()
      }
    })
    return () => {
      cancelled = true
    }
  }, [router])

  const { permissions } = useUserPermissions(user)

  if (!checked || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Carregando…
        </div>
      </div>
    )
  }

  const primaryNav: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
    { label: "Transações", href: "/dashboard/transactions", icon: Receipt },
    ...(permissions.can_manage_income
      ? [{ label: "Ganho mensal", href: "/dashboard/income", icon: Wallet }]
      : []),
  ]

  const adminItems: NavItem[] = []
  if (permissions.can_manage_categories) {
    adminItems.push({ label: "Categorias", href: "/admin/categories", icon: Tag })
    adminItems.push({ label: "Eventos", href: "/admin/events", icon: CalendarHeart })
  }
  if (permissions.can_manage_invites || permissions.isAdmin) {
    adminItems.push({ label: "Participantes", href: "/admin/participants", icon: Users })
  }
  if (permissions.can_view_audit) {
    adminItems.push({ label: "Audit", href: "/admin/audit", icon: ScrollText })
  }

  const secondaryNav: SidebarSecondaryNav | null =
    adminItems.length > 0
      ? { label: "Admin", items: adminItems }
      : null

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#v2-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <Sidebar
        primaryNav={primaryNav}
        secondaryNav={secondaryNav}
        footer={(collapsed) => <UserMenu user={user} collapsed={collapsed} />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <MobileTopbar
          primaryNav={primaryNav}
          secondaryNav={secondaryNav}
          drawerFooter={<UserMenu user={user} />}
          rightSlot={<UserMenu user={user} collapsed />}
        />
        <main id="v2-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
      <ShortcutsCheatsheet />
    </div>
  )
}
