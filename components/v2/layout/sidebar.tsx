"use client"

import * as React from "react"
import Link from "next/link"
import { PanelLeftClose, PanelLeft } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import { ScrollArea } from "@/components/v2/primitives/scroll-area"
import { Separator } from "@/components/v2/primitives/separator"
import { Button } from "@/components/v2/primitives/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/v2/primitives/tooltip"
import { NavSection, type NavItem } from "@/components/v2/layout/nav-section"

import { BrandIcon } from "@/components/v2/brand/brand-icon"

const STORAGE_KEY = "v2:sidebar-collapsed"

export type SidebarSecondaryNav = {
  label?: string
  items: NavItem[]
}

export type SidebarProps = {
  primaryNav: NavItem[]
  secondaryNav?: SidebarSecondaryNav | null
  footer: (collapsed: boolean) => React.ReactNode
  brandHref?: string
}

export function Sidebar({
  primaryNav,
  secondaryNav,
  footer,
  brandHref = "/dashboard",
}: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored !== null) setCollapsed(stored === "1")
    } catch {
      // ignore
    }
  }, [])

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {
        // ignore
      }
      return next
    })
  }

  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200 md:flex",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex h-14 items-center gap-2 px-3">
        <Link
          href={brandHref}
          className="flex items-center gap-2 overflow-hidden"
          aria-label="Ir para o dashboard"
        >
          <BrandIcon />
          {!collapsed && (
            <span className="truncate text-sm font-semibold">
              Zera<span className="text-muted-foreground">.</span>
            </span>
          )}
        </Link>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggle}
              className="ml-auto size-8 text-muted-foreground"
              aria-label={collapsed ? "Expandir sidebar" : "Colapsar sidebar"}
            >
              {collapsed ? (
                <PanelLeft className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? "Expandir" : "Colapsar"}
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-2 py-3">
        <NavSection items={primaryNav} collapsed={collapsed} />
        {secondaryNav && (
          <>
            <div className="my-3">
              <Separator />
            </div>
            <NavSection
              label={collapsed ? undefined : secondaryNav.label}
              items={secondaryNav.items}
              collapsed={collapsed}
            />
          </>
        )}
      </ScrollArea>

      <div className="border-t border-sidebar-border p-2">{footer(collapsed)}</div>
    </aside>
  )
}
