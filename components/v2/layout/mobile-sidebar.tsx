"use client"

import * as React from "react"
import Link from "next/link"

import { ScrollArea } from "@/components/v2/primitives/scroll-area"
import { Separator } from "@/components/v2/primitives/separator"
import { NavSection } from "@/components/v2/layout/nav-section"
import type { SidebarSecondaryNav } from "@/components/v2/layout/sidebar"
import type { NavItem } from "@/components/v2/layout/nav-section"

export type MobileSidebarProps = {
  primaryNav: NavItem[]
  secondaryNav?: SidebarSecondaryNav | null
  footer: React.ReactNode
  brandHref?: string
  /** Called when a nav link is clicked — used by the drawer to close. */
  onNavigate?: () => void
}

/**
 * Sidebar content adapted for use inside a Sheet on mobile. Same layout as the
 * desktop Sidebar but always expanded, dismisses on navigation.
 */
export function MobileSidebar({
  primaryNav,
  secondaryNav,
  footer,
  brandHref = "/dashboard",
  onNavigate,
}: MobileSidebarProps) {
  return (
    <div className="flex h-full flex-col text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2 px-3">
        <Link href={brandHref} onClick={onNavigate} className="flex items-center gap-2">
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
        <NavSection items={primaryNav} />
        {secondaryNav && (
          <>
            <div className="my-3">
              <Separator />
            </div>
            <NavSection label={secondaryNav.label} items={secondaryNav.items} />
          </>
        )}
      </ScrollArea>
      <div className="border-t border-sidebar-border p-2">{footer}</div>
    </div>
  )
}
