import type { ReactNode } from "react"
import { Toaster } from "@/components/v2/primitives/toaster"
import { TooltipProvider } from "@/components/v2/primitives/tooltip"
import "./globals.css"

/**
 * v2 root segment. Establishes the `.v2` token scope, mounts the toast outlet
 * and the global tooltip provider. Page-level chrome (sidebar, topbar) lives in
 * the `(shell)` route group's layout — login and guest pages render outside it.
 */
export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="v2 min-h-screen bg-background text-foreground">
        {children}
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
