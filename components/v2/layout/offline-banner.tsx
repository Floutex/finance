"use client"

import * as React from "react"
import { WifiOff } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"

/**
 * Banner que aparece quando `navigator.onLine === false`. Some quando a conexão
 * volta. Não interrompe nada — só sinaliza pro usuário que mutations vão
 * falhar.
 */
export function OfflineBanner() {
  const [offline, setOffline] = React.useState(false)

  React.useEffect(() => {
    const update = () => setOffline(!navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  if (!offline) return null

  return (
    <div
      className={cn(
        "sticky top-0 z-40 flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/15 px-4 py-1.5 text-xs font-medium text-warning"
      )}
      role="status"
    >
      <WifiOff className="size-3.5" />
      Você está offline — alterações não serão sincronizadas até reconectar.
    </div>
  )
}
