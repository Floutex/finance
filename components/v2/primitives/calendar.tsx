"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ptBR } from "date-fns/locale"

import { cn } from "@/components/v2/primitives/utils"
import { buttonVariants } from "@/components/v2/primitives/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/**
 * Calendário canônico da plataforma — react-day-picker estilizado com os tokens
 * do design system (selecionado = `primary`, hoje = anel sutil, range = trilha
 * em `accent`). Locale pt-BR por padrão. Use sempre via `DatePicker` /
 * `DateRangePicker` em vez de `<input type="date">`.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale = ptBR,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      locale={locale}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        caption: "flex justify-center pt-1 pb-1 relative items-center",
        caption_label: "text-sm font-medium capitalize",
        nav: "flex items-center gap-1",
        nav_button: cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "size-7 rounded-md bg-transparent p-0 text-muted-foreground opacity-80 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.7rem] uppercase tracking-wide",
        row: "flex w-full mt-1.5",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
          "[&:has([aria-selected])]:bg-accent",
          "[&:has([aria-selected].day-range-end)]:rounded-r-md",
          "[&:has([aria-selected].day-range-start)]:rounded-l-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/40",
          "first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 rounded-md p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_start:
          "day-range-start rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary",
        day_range_end:
          "day-range-end rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary",
        day_selected:
          "rounded-md bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        day_today:
          "font-semibold ring-1 ring-inset ring-primary/40 rounded-md",
        day_outside:
          "day-outside text-muted-foreground/50 aria-selected:text-muted-foreground",
        day_disabled: "text-muted-foreground/40 opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ className: c, ...iconProps }) => (
          <ChevronLeft className={cn("size-4", c)} {...iconProps} />
        ),
        IconRight: ({ className: c, ...iconProps }) => (
          <ChevronRight className={cn("size-4", c)} {...iconProps} />
        ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
