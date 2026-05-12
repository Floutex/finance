"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** If true, only matches the exact href (no children). */
  exact?: boolean
}

type NavSectionProps = {
  label?: string
  items: NavItem[]
  collapsed?: boolean
}

export function NavSection({ label, items, collapsed = false }: NavSectionProps) {
  const pathname = usePathname() ?? ""

  return (
    <div className="flex flex-col gap-1">
      {label && !collapsed && (
        <div className="px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      )}
      {items.map((item) => {
        const Icon = item.icon
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              active && "bg-accent text-foreground"
            )}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && <span className="truncate">{item.label}</span>}
            {!collapsed && active && (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
