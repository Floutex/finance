"use client"

import * as React from "react"
import { LayoutDashboard, Receipt } from "lucide-react"

import { Sidebar } from "@/components/v2/layout/sidebar"
import { MobileTopbar } from "@/components/v2/layout/mobile-topbar"
import { OfflineBanner } from "@/components/v2/layout/offline-banner"
import type { NavItem } from "@/components/v2/layout/nav-section"

import { GuestUserMenu } from "@/components/v2/guest/guest-user-menu"
import { useGuestContext } from "@/components/v2/guest/guest-context"

/**
 * Shell visual idêntico ao member (mesma sidebar/topbar), só que parametrizado
 * com a nav do guest e o footer próprio (avatar + atualizar). Consome o
 * `GuestProvider` que o layout monta acima dele.
 */
export function GuestShell({ children }: { children: React.ReactNode }) {
  const { token, state, refreshing, refresh } = useGuestContext()
  const { participant } = state

  const primaryNav = React.useMemo<NavItem[]>(
    () => [
      {
        label: "Dashboard",
        href: `/g/${token}`,
        icon: LayoutDashboard,
        exact: true,
      },
      {
        label: "Transações",
        href: `/g/${token}/transactions`,
        icon: Receipt,
      },
    ],
    [token]
  )

  const brandHref = `/g/${token}`

  const footer = React.useMemo(
    () => (
      <GuestUserMenu
        participant={participant}
        refreshing={refreshing}
        onRefresh={refresh}
      />
    ),
    [participant, refreshing, refresh]
  )

  const collapsedFooter = React.useCallback(
    (collapsed: boolean) => (
      <GuestUserMenu
        participant={participant}
        collapsed={collapsed}
        refreshing={refreshing}
        onRefresh={refresh}
      />
    ),
    [participant, refreshing, refresh]
  )

  return (
    <div className="flex min-h-screen bg-background">
      <a
        href="#guest-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-primary focus:px-3 focus:py-1.5 focus:text-sm focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <Sidebar primaryNav={primaryNav} footer={collapsedFooter} brandHref={brandHref} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <MobileTopbar
          primaryNav={primaryNav}
          drawerFooter={footer}
          rightSlot={
            <GuestUserMenu
              participant={participant}
              collapsed
              refreshing={refreshing}
              onRefresh={refresh}
            />
          }
          brandHref={brandHref}
        />
        <main id="guest-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
