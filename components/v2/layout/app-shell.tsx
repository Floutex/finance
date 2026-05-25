"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Wallet,
  Receipt,
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
import { SESSION_USER_KEY, USERS, isAdminUser } from "@/lib/constants"

const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Transações", href: "/dashboard/transactions", icon: Receipt },
  { label: "Ganho mensal", href: "/dashboard/income", icon: Wallet },
]

const ADMIN_NAV: NavItem[] = [
  { label: "Categorias", href: "/admin/categories", icon: Tag },
  { label: "Participantes", href: "/admin/participants", icon: Users },
  { label: "Audit", href: "/admin/audit", icon: ScrollText },
]

/**
 * Authenticated app shell — sidebar + content area. Reads the session user from
 * `sessionStorage` (shared with the legacy /); bounces to /login if absent
 * or unknown. Used by the `(shell)` route group's layout.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = React.useState<string | null>(null)
  const [checked, setChecked] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_USER_KEY)
      if (stored && USERS.some((u) => u.name === stored)) {
        setUser(stored)
      } else {
        router.replace("/login")
      }
    } catch {
      router.replace("/login")
    } finally {
      setChecked(true)
    }
  }, [router])

  if (!checked || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">
          Carregando…
        </div>
      </div>
    )
  }

  const isAdmin = isAdminUser(user)
  const secondaryNav: SidebarSecondaryNav | null = isAdmin
    ? { label: "Admin", items: ADMIN_NAV }
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
        primaryNav={PRIMARY_NAV}
        secondaryNav={secondaryNav}
        footer={(collapsed) => <UserMenu user={user} collapsed={collapsed} />}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <MobileTopbar
          primaryNav={PRIMARY_NAV}
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
