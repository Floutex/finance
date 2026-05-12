"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react"

import { Button } from "@/components/v2/primitives/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/v2/primitives/dropdown-menu"
import { ParticipantAvatar } from "@/components/v2/finance/participant-avatar"
import { SESSION_USER_KEY } from "@/lib/constants"

type UserMenuProps = {
  user: string
  collapsed?: boolean
}

export function UserMenu({ user, collapsed = false }: UserMenuProps) {
  const router = useRouter()

  const handleLogout = () => {
    try {
      sessionStorage.removeItem(SESSION_USER_KEY)
    } catch {}
    router.replace("/login")
  }

  if (collapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Conta · ${user}`}
            className="flex w-full items-center justify-center rounded-md p-1 transition-colors hover:bg-accent"
          >
            <ParticipantAvatar name={user} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <UserMenuContent user={user} onLogout={handleLogout} />
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto w-full justify-start gap-3 px-2 py-2 hover:bg-accent"
        >
          <ParticipantAvatar name={user} size="sm" />
          <span className="flex min-w-0 flex-1 flex-col items-start">
            <span className="truncate text-sm font-medium text-foreground">
              {user}
            </span>
            <span className="text-xs text-muted-foreground">Membro</span>
          </span>
          <ChevronDown className="size-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <UserMenuContent user={user} onLogout={handleLogout} />
    </DropdownMenu>
  )
}

function UserMenuContent({
  user,
  onLogout,
}: {
  user: string
  onLogout: () => void
}) {
  return (
    <DropdownMenuContent align="end" side="top" className="w-56">
      <DropdownMenuLabel>Sessão</DropdownMenuLabel>
      <DropdownMenuItem disabled>
        <UserIcon />
        <span className="truncate">{user}</span>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:text-destructive">
        <LogOut />
        Sair
      </DropdownMenuItem>
    </DropdownMenuContent>
  )
}
