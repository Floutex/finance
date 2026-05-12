import * as React from "react"
import { cn } from "@/components/v2/primitives/utils"
import { participantAvatar } from "@/lib/v2/tokens"
import { resolveHex } from "@/lib/constants"

type Size = "xs" | "sm" | "md" | "lg"

const sizeClasses: Record<Size, string> = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
}

type ParticipantAvatarProps = {
  name: string
  participants?: { name: string; color: string }[] | null
  hex?: string
  size?: Size
  className?: string
  /** Show a thin ring around the avatar — useful in stacks. */
  ring?: boolean
}

export function ParticipantAvatar({
  name,
  participants,
  hex,
  size = "md",
  className,
  ring = false,
}: ParticipantAvatarProps) {
  const color = hex ?? resolveHex(name, participants)
  return (
    <span
      style={participantAvatar(color)}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        sizeClasses[size],
        ring && "ring-2 ring-background",
        className
      )}
      title={name}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
