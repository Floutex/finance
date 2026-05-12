"use client"

import * as React from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  Tag,
  Users,
  ScrollText,
  Send,
} from "lucide-react"

import { ScrollArea } from "@/components/v2/primitives/scroll-area"
import { Separator } from "@/components/v2/primitives/separator"
import { NavSection, type NavItem } from "@/components/v2/layout/nav-section"
import { UserMenu } from "@/components/v2/layout/user-menu"
import { ADMIN_USER } from "@/lib/constants"

const PRIMARY_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Transações", href: "/dashboard/transactions", icon: Receipt },
  { label: "Ganho mensal", href: "/dashboard/income", icon: Wallet },
]

const ADMIN_NAV: NavItem[] = [
  { label: "Categorias", href: "/admin/categories", icon: Tag },
  { label: "Participantes", href: "/admin/participants", icon: Users },
  { label: "Audit", href: "/admin/audit", icon: ScrollText },
  { label: "Convites", href: "/admin/invites", icon: Send },
]

type MobileSidebarProps = {
  user: string
  /** Called when a nav link is clicked — used by the drawer to close. */
  onNavigate?: () => void
}

/**
 * Sidebar content adapted for use inside a Sheet on mobile. Same layout as the
 * desktop Sidebar but always expanded, dismisses on navigation.
 */
export function MobileSidebar({ user, onNavigate }: MobileSidebarProps) {
  const isAdmin = user === ADMIN_USER

  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-2"
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground font-display font-bold">
            G
          </div>
          <span className="text-sm font-semibold">
            Gastos<span className="text-muted-foreground">.</span>
          </span>
        </Link>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-2 py-3" onClick={onNavigate}>
        <NavSection items={PRIMARY_NAV} />
        {isAdmin && (
          <>
            <div className="my-3">
              <Separator />
            </div>
            <NavSection label="Admin" items={ADMIN_NAV} />
          </>
        )}
      </ScrollArea>
      <div className="border-t border-sidebar-border p-2">
        <UserMenu user={user} />
      </div>
    </div>
  )
}
