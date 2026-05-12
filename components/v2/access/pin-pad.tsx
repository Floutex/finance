"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/components/v2/primitives/utils"
import { SESSION_USER_KEY, USERS } from "@/lib/constants"

const PIN_LENGTH = 4
const ERROR_RESET_MS = 800

/**
 * Minimal PIN entry: four dot slots filled by a hidden input.
 * Auto-submits when the user has typed exactly 4 digits — on match, saves the
 * session and navigates to /v2/dashboard; on miss, shakes and clears.
 */
export function PinPad() {
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [pin, setPin] = React.useState("")
  const [state, setState] = React.useState<"idle" | "error" | "success">("idle")
  const [resolvedUser, setResolvedUser] = React.useState<string | null>(null)

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    if (state !== "error") return
    const t = setTimeout(() => {
      setState("idle")
      setPin("")
      inputRef.current?.focus()
    }, ERROR_RESET_MS)
    return () => clearTimeout(t)
  }, [state])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (state !== "idle") return
    const next = e.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH)
    setPin(next)
    if (next.length < PIN_LENGTH) return

    const match = USERS.find((u) => u.pin === next)
    if (!match) {
      setState("error")
      return
    }

    try {
      sessionStorage.setItem(SESSION_USER_KEY, match.name)
    } catch {}
    setResolvedUser(match.name)
    setState("success")
    // Slight delay so the success state is perceptible before navigating.
    setTimeout(() => router.replace("/dashboard"), 350)
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-6",
        state === "error" && "animate-[shake_0.4s_cubic-bezier(0.36,0.07,0.19,0.97)_both]"
      )}
      onClick={() => inputRef.current?.focus()}
    >
      <div className="flex items-center gap-3" aria-hidden>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled = i < pin.length
          return (
            <div
              key={i}
              className={cn(
                "h-3 w-3 rounded-full border transition-all duration-150",
                filled
                  ? state === "error"
                    ? "border-destructive bg-destructive"
                    : state === "success"
                    ? "border-success bg-success scale-110"
                    : "border-foreground bg-foreground"
                  : "border-border bg-transparent"
              )}
            />
          )
        })}
      </div>

      <input
        ref={inputRef}
        type="password"
        inputMode="numeric"
        pattern="\d*"
        autoComplete="one-time-code"
        name="v2_pin"
        maxLength={PIN_LENGTH}
        value={pin}
        onChange={handleChange}
        aria-label="PIN de 4 dígitos"
        className="sr-only"
      />

      <div className="h-5 text-center text-xs">
        {state === "error" && (
          <span className="text-destructive">PIN incorreto</span>
        )}
        {state === "success" && resolvedUser && (
          <span className="text-success">Bem-vindo, {resolvedUser}.</span>
        )}
        {state === "idle" && (
          <span className="text-muted-foreground">
            Digite seu PIN
          </span>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  )
}
