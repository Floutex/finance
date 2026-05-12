import * as React from "react"
import { cn } from "@/components/v2/primitives/utils"
import { participantBadge } from "@/lib/v2/tokens"
import { resolveHex } from "@/lib/constants"

type ParticipantBadgeProps = {
  name: string
  participants?: { name: string; color: string }[] | null
  /** Override hex directly (skips `resolveHex`). */
  hex?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Pill displaying a participant name colored by their hex.
 * Works for both static members (USERS) and dynamic guests (participants table).
 */
export function ParticipantBadge({
  name,
  participants,
  hex,
  className,
  children,
}: ParticipantBadgeProps) {
  const color = hex ?? resolveHex(name, participants)
  return (
    <span
      style={participantBadge(color)}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium leading-none",
        className
      )}
    >
      {children ?? name}
    </span>
  )
}
