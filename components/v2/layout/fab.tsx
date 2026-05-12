"use client"

import * as React from "react"
import { Plus } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"

type FabProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: React.ReactNode
}

/**
 * Mobile Floating Action Button — hidden on `md` and up. Sits in the safe-area
 * bottom-right and rises above the bulk-actions bar via z-index.
 */
export function Fab({ icon, className, children, ...props }: FabProps) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "fixed bottom-6 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-2xl ring-1 ring-black/20 transition-transform active:scale-95 md:hidden",
        "[padding-bottom:env(safe-area-inset-bottom)]",
        className
      )}
      aria-label={typeof children === "string" ? children : "Ação rápida"}
    >
      {icon ?? <Plus className="size-6" />}
    </button>
  )
}
