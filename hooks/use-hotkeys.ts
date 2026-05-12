"use client"

import { useEffect } from "react"

type HotkeyHandler = (e: KeyboardEvent) => void

type HotkeyDef = {
  /** e.g. "Mod+k", "shift+/", "n", "/", "Escape". Modifiers: `mod` (Cmd/Ctrl). */
  key: string
  handler: HotkeyHandler
  /** Skip when the user is typing in an input/textarea/contenteditable. */
  allowInInput?: boolean
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}

function matches(def: HotkeyDef, e: KeyboardEvent): boolean {
  const parts = def.key.toLowerCase().split("+")
  const main = parts.pop()!
  const wantMod = parts.includes("mod")
  const wantShift = parts.includes("shift")
  const wantAlt = parts.includes("alt")
  const pressedMod = e.metaKey || e.ctrlKey
  if (wantMod !== pressedMod) return false
  if (wantShift !== e.shiftKey) return false
  if (wantAlt !== e.altKey) return false
  return e.key.toLowerCase() === main
}

/** Register a set of keyboard shortcuts on `window`. */
export function useHotkeys(defs: HotkeyDef[]) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      for (const def of defs) {
        if (!def.allowInInput && isEditable(e.target)) continue
        if (matches(def, e)) {
          def.handler(e)
          return
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [defs])
}
