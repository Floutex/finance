import * as React from "react"
import { cn } from "@/components/v2/primitives/utils"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"

type ParticipantStackProps = {
  names: string[]
  participants?: { name: string; color: string }[] | null
  /** How many avatars to render before collapsing into "+N". Default 3. */
  max?: number
  size?: "xs" | "sm" | "md"
  className?: string
}

/**
 * Overlapping avatars for the participants column in the transactions table.
 * Stops at `max` and shows a "+N" pill for the rest.
 */
export function ParticipantStack({
  names,
  participants,
  max = 3,
  size = "sm",
  className,
}: ParticipantStackProps) {
  const visible = names.slice(0, max)
  const overflow = names.length - visible.length

  return (
    <div className={cn("flex items-center -space-x-1.5", className)}>
      {visible.map((name) => (
        <ParticipantAvatar
          key={name}
          name={name}
          participants={participants}
          size={size}
          ring
        />
      ))}
      {overflow > 0 && (
        <span
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background",
            size === "xs" && "h-5 w-5 text-[10px]",
            size === "sm" && "h-6 w-6 text-xs",
            size === "md" && "h-8 w-8 text-sm"
          )}
          title={`+${overflow}`}
          aria-label={`+${overflow}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
