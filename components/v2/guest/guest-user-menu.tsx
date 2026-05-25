"use client"

import * as React from "react"
import { Loader2, RefreshCcw } from "lucide-react"

import { Button } from "@/components/v2/primitives/button"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/v2/primitives/tooltip"
import type { Participant } from "@/lib/participants-cache"

type GuestUserMenuProps = {
  participant: Participant
  collapsed?: boolean
  refreshing: boolean
  onRefresh: () => void
}

/**
 * Sidebar footer for the guest shell — avatar + name + refresh. No logout
 * (the token IS the session), no role dropdown (only one identity).
 */
export function GuestUserMenu({
  participant,
  collapsed = false,
  refreshing,
  onRefresh,
}: GuestUserMenuProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <ParticipantAvatar
          name={participant.name}
          hex={participant.color}
          size="sm"
        />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={refreshing}
              aria-label="Atualizar"
              className="size-8 text-muted-foreground"
            >
              {refreshing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Atualizar</TooltipContent>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-md px-2 py-2">
      <ParticipantAvatar
        name={participant.name}
        hex={participant.color}
        size="sm"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {participant.name}
        </span>
        <span className="text-xs text-muted-foreground">Convidado</span>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Atualizar"
            className="size-8 text-muted-foreground"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCcw className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Atualizar</TooltipContent>
      </Tooltip>
    </div>
  )
}
