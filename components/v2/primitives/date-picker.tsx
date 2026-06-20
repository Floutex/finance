"use client"

import * as React from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarDays, X } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/components/v2/primitives/utils"
import { Calendar } from "@/components/v2/primitives/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/v2/primitives/popover"

// ── ISO <-> Date helpers (local time, never UTC — avoids off-by-one) ──

/** Parse "YYYY-MM-DD" into a local Date (no timezone shift). */
export function parseISODate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return undefined
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? undefined : d
}

/** Format a local Date to "YYYY-MM-DD". */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

const triggerBase =
  "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-sm ring-offset-background transition-colors hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

function formatLabel(date: Date) {
  return format(date, "dd/MM/yyyy", { locale: ptBR })
}

// ── DatePicker (single) ──

type DatePickerProps = {
  /** ISO "YYYY-MM-DD" or "". */
  value: string
  onChange: (value: string) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: "start" | "center" | "end"
  /** Show a clear (×) button when a date is set. */
  clearable?: boolean
  "aria-label"?: string
}

export function DatePicker({
  value,
  onChange,
  id,
  placeholder = "Selecionar data",
  disabled,
  className,
  align = "start",
  clearable = false,
  "aria-label": ariaLabel,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseISODate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(triggerBase, !selected && "text-muted-foreground", className)}
        >
          <CalendarDays className="size-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">
            {selected ? formatLabel(selected) : placeholder}
          </span>
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpar data"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange("")
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (date) onChange(toISODate(date))
            setOpen(false)
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

// ── DateRangePicker ──

type DateRangePickerProps = {
  start: string
  end: string
  onChange: (next: { start: string; end: string }) => void
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: "start" | "center" | "end"
  numberOfMonths?: number
  "aria-label"?: string
}

export function DateRangePicker({
  start,
  end,
  onChange,
  id,
  placeholder = "Período",
  disabled,
  className,
  align = "end",
  numberOfMonths = 2,
  "aria-label": ariaLabel,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const from = parseISODate(start)
  const to = parseISODate(end)
  const range: DateRange | undefined = from || to ? { from, to } : undefined

  const label = (() => {
    if (from && to) return `${formatLabel(from)} – ${formatLabel(to)}`
    if (from) return `${formatLabel(from)} – …`
    if (to) return `… – ${formatLabel(to)}`
    return placeholder
  })()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(triggerBase, !from && !to && "text-muted-foreground", className)}
        >
          <CalendarDays className="size-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate tabular-nums">{label}</span>
          {(from || to) && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Limpar período"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onChange({ start: "", end: "" })
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="range"
          selected={range}
          defaultMonth={from ?? to}
          numberOfMonths={numberOfMonths}
          onSelect={(next) =>
            onChange({
              start: next?.from ? toISODate(next.from) : "",
              end: next?.to ? toISODate(next.to) : "",
            })
          }
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
