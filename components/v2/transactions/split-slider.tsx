"use client"

import * as React from "react"

import { cn } from "@/components/v2/primitives/utils"
import { Input } from "@/components/v2/primitives/input"
import { resolveHex, normalizeNumber } from "@/lib/constants"

type ParticipantMeta = { name: string; color: string }

type SplitSliderProps = {
  /** Ordered participant names that share the expense. */
  participants: string[]
  /** Current shares in R$, keyed by name. Should sum to `total`. */
  shares: Record<string, number>
  /** Total amount of the transaction (sum target). */
  total: number
  /** Participant records used to resolve colors. */
  participantsMeta?: ParticipantMeta[]
  /** Emits a fresh map that always sums to `total`. */
  onChange: (next: Record<string, number>) => void
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Force a shares map to sum exactly to `total` (absorb rounding on the biggest). */
function reconcile(
  shares: Record<string, number>,
  participants: string[],
  total: number
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const p of participants) out[p] = round2(Math.max(0, shares[p] ?? 0))
  const sum = participants.reduce((a, p) => a + out[p], 0)
  const diff = round2(total - sum)
  if (Math.abs(diff) >= 0.01 && participants.length > 0) {
    // put the leftover on the largest share so the bar stays clean
    let big = participants[0]
    for (const p of participants) if (out[p] > out[big]) big = p
    out[big] = round2(Math.max(0, out[big] + diff))
  }
  return out
}

/**
 * Set `target` to `value` and redistribute the difference across the other
 * participants proportionally (equally if they're all at zero). Keeps the sum
 * locked to `total`.
 */
function redistribute(
  shares: Record<string, number>,
  participants: string[],
  total: number,
  target: string,
  value: number
): Record<string, number> {
  const v = Math.min(Math.max(0, value), total)
  const others = participants.filter((p) => p !== target)
  const out: Record<string, number> = { ...shares, [target]: v }
  const remaining = round2(total - v)
  const othersSum = others.reduce((a, p) => a + (shares[p] ?? 0), 0)
  if (others.length === 0) {
    out[target] = total
  } else if (othersSum <= 0) {
    const each = remaining / others.length
    others.forEach((p) => (out[p] = each))
  } else {
    const scale = remaining / othersSum
    others.forEach((p) => (out[p] = (shares[p] ?? 0) * scale))
  }
  return reconcile(out, participants, total)
}

export function SplitSlider({
  participants,
  shares,
  total,
  participantsMeta,
  onChange,
}: SplitSliderProps) {
  const barRef = React.useRef<HTMLDivElement>(null)
  const [draft, setDraft] = React.useState<{ key: string; text: string } | null>(
    null
  )

  const colorOf = React.useCallback(
    (name: string) => resolveHex(name, participantsMeta ?? null),
    [participantsMeta]
  )

  const pct = (name: string) =>
    total > 0 ? ((shares[name] ?? 0) / total) * 100 : 0

  // Cumulative right-edge value (R$) for participant index i.
  const prefix = React.useMemo(() => {
    const acc: number[] = []
    let run = 0
    for (const p of participants) {
      run += shares[p] ?? 0
      acc.push(run)
    }
    return acc
  }, [participants, shares])

  // Latest state for drag handlers (attached imperatively on pointer-down so
  // they always read fresh shares without re-binding listeners mid-drag).
  const stateRef = React.useRef({ participants, shares, prefix, total, onChange })
  stateRef.current = { participants, shares, prefix, total, onChange }

  const startDrag = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault()
    const move = (ev: PointerEvent) => {
      const s = stateRef.current
      const bar = barRef.current
      if (!bar || s.total <= 0) return
      const rect = bar.getBoundingClientRect()
      const frac = Math.min(Math.max((ev.clientX - rect.left) / rect.width, 0), 1)
      const a = s.participants[i]
      const b = s.participants[i + 1]
      const lower = (s.prefix[i] ?? 0) - (s.shares[a] ?? 0) // left edge of a
      const upper = (s.prefix[i] ?? 0) + (s.shares[b] ?? 0) // right edge of b
      const nv = Math.min(Math.max(frac * s.total, lower), upper)
      s.onChange(
        reconcile(
          { ...s.shares, [a]: round2(nv - lower), [b]: round2(upper - nv) },
          s.participants,
          s.total
        )
      )
    }
    const up = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      document.body.style.userSelect = ""
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
    document.body.style.userSelect = "none"
  }

  const commitDraft = (name: string, field: "value" | "pct", text: string) => {
    const parsed = normalizeNumber(text)
    if (parsed === null) {
      setDraft(null)
      return
    }
    const value = field === "pct" ? (Math.min(Math.max(parsed, 0), 100) / 100) * total : parsed
    onChange(redistribute(shares, participants, total, name, round2(value)))
    setDraft(null)
  }

  const fieldKey = (name: string, field: string) => `${name}|${field}`

  const displayValue = (name: string, field: "value" | "pct") => {
    const key = fieldKey(name, field)
    if (draft && draft.key === key) return draft.text
    if (field === "value") {
      const v = shares[name] ?? 0
      return v === 0 ? "" : String(round2(v)).replace(".", ",")
    }
    const p = pct(name)
    return p === 0 ? "" : (Math.round(p * 10) / 10).toString().replace(".", ",")
  }

  return (
    <div className="space-y-3">
      {/* Visual bar */}
      <div
        ref={barRef}
        className="relative h-10 w-full select-none overflow-hidden rounded-md border border-border bg-muted/40"
      >
        <div className="flex h-full w-full">
          {participants.map((name) => {
            const width = total > 0 ? `${pct(name)}%` : `${100 / participants.length}%`
            const hex = colorOf(name)
            const showLabel = pct(name) >= 12
            return (
              <div
                key={name}
                className="flex h-full items-center justify-center overflow-hidden text-[10px] font-medium tabular-nums transition-[width] duration-75"
                style={{
                  width,
                  backgroundColor: `${hex}2e`,
                  color: hex,
                }}
                title={name}
              >
                {showLabel && (
                  <span className="truncate px-1">
                    {name.split(" ")[0]} · {Math.round(pct(name))}%
                  </span>
                )}
              </div>
            )
          })}
        </div>
        {/* Draggable handles between segments */}
        {participants.slice(0, -1).map((_, i) => {
          const left = total > 0 ? `${((prefix[i] ?? 0) / total) * 100}%` : "0%"
          return (
            <div
              key={i}
              onPointerDown={startDrag(i)}
              className="group absolute top-0 z-10 h-full w-4 -translate-x-1/2 cursor-ew-resize touch-none"
              style={{ left }}
              role="separator"
              aria-orientation="vertical"
            >
              <div className="mx-auto h-full w-px bg-foreground/30 transition-colors group-hover:w-0.5 group-hover:bg-foreground/60" />
              <div className="absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background shadow-sm transition-transform group-hover:scale-110" />
            </div>
          )
        })}
      </div>

      {/* Per-participant value + % inputs */}
      <div className="space-y-1.5">
        {participants.map((name) => {
          const hex = colorOf(name)
          return (
            <div key={name} className="flex items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: hex }}
              />
              <span className="flex-1 truncate text-sm">{name}</span>
              <div className="relative w-[120px]">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  R$
                </span>
                <Input
                  inputMode="decimal"
                  aria-label={`Valor de ${name}`}
                  className="h-8 pl-8 text-right tabular-nums"
                  value={displayValue(name, "value")}
                  placeholder="0,00"
                  onFocus={() =>
                    setDraft({
                      key: fieldKey(name, "value"),
                      text: displayValue(name, "value"),
                    })
                  }
                  onChange={(e) =>
                    setDraft({ key: fieldKey(name, "value"), text: e.target.value })
                  }
                  onBlur={(e) => commitDraft(name, "value", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commitDraft(name, "value", (e.target as HTMLInputElement).value)
                    }
                  }}
                />
              </div>
              <div className="relative w-[78px]">
                <Input
                  inputMode="decimal"
                  aria-label={`Porcentagem de ${name}`}
                  className="h-8 pr-6 text-right tabular-nums"
                  value={displayValue(name, "pct")}
                  placeholder="0"
                  onFocus={() =>
                    setDraft({
                      key: fieldKey(name, "pct"),
                      text: displayValue(name, "pct"),
                    })
                  }
                  onChange={(e) =>
                    setDraft({ key: fieldKey(name, "pct"), text: e.target.value })
                  }
                  onBlur={(e) => commitDraft(name, "pct", e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      commitDraft(name, "pct", (e.target as HTMLInputElement).value)
                    }
                  }}
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { reconcile as reconcileShares }
