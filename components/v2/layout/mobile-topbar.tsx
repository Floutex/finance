"use client"

import * as React from "react"
import Link from "next/link"
import { Menu } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { Button } from "@/components/v2/primitives/button"
import { Sheet, SheetContent, SheetTitle } from "@/components/v2/primitives/sheet"
import { MobileSidebar } from "@/components/v2/layout/mobile-sidebar"
import type { SidebarSecondaryNav } from "@/components/v2/layout/sidebar"
import type { NavItem } from "@/components/v2/layout/nav-section"

export type MobileTopbarProps = {
  primaryNav: NavItem[]
  secondaryNav?: SidebarSecondaryNav | null
  /** Footer used inside the drawer. */
  drawerFooter: React.ReactNode
  /** Right-aligned slot in the topbar (user menu / avatar). */
  rightSlot: React.ReactNode
  brandHref?: string
  className?: string
}

/**
 * Fixed-top mobile header — hidden on `md` and up. Hamburger opens the sidebar
 * as a drawer; `rightSlot` shows whatever account control fits the shell.
 */
export function MobileTopbar({
  primaryNav,
  secondaryNav,
  drawerFooter,
  rightSlot,
  brandHref = "/dashboard",
  className,
}: MobileTopbarProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur md:hidden",
          className
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="size-5" />
        </Button>
        <Link href={brandHref} className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground font-display text-sm font-bold">
            G
          </div>
          <span className="text-sm font-semibold">
            Gastos<span className="text-muted-foreground">.</span>
          </span>
        </Link>
        <div className="ml-auto">{rightSlot}</div>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="w-[280px] border-r border-sidebar-border bg-sidebar p-0"
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <MobileSidebar
            primaryNav={primaryNav}
            secondaryNav={secondaryNav}
            footer={drawerFooter}
            brandHref={brandHref}
            onNavigate={() => setOpen(false)}
          />
        </SheetContent>
      </Sheet>
    </>
  )
}
