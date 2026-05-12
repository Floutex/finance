"use client"

import * as React from "react"
import { Plus, Sparkles } from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/v2/primitives/command"
import { TransactionSheet } from "@/components/v2/transactions/transaction-sheet"
import type { TransactionFormSubmit, TransactionFormValues } from "@/components/v2/transactions/transaction-form"
import { Currency } from "@/components/v2/finance/currency"

type QuickAddProps = {
  currentUser: string
  defaultParticipants: string[]
  onSubmit: (values: TransactionFormSubmit) => Promise<void>
}

/**
 * Cmd+K command palette to add transactions quickly. Supports:
 * - Empty query → "Adicionar transação" opens the full sheet.
 * - "Almoço 45,90" → parses last numeric token as amount, the rest as description.
 *   "Enter" opens the sheet pre-filled.
 */
export function QuickAdd({ currentUser, defaultParticipants, onSubmit }: QuickAddProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [prefill, setPrefill] = React.useState<Partial<TransactionFormValues> | null>(null)

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const parsed = React.useMemo(() => parseQuickEntry(query), [query])

  const openSheetEmpty = () => {
    setPrefill({})
    setOpen(false)
  }

  const openSheetWithParsed = () => {
    setPrefill({
      description: parsed?.description ?? "",
      amount: parsed?.amount ?? "",
      participants: defaultParticipants,
      paid_by: currentUser,
    })
    setOpen(false)
  }

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Digite uma despesa ou comando…"
        />
        <CommandList>
          <CommandEmpty>Nenhuma ação encontrada.</CommandEmpty>

          {parsed && (
            <CommandGroup heading="Atalho rápido">
              <CommandItem onSelect={openSheetWithParsed}>
                <Sparkles />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate">
                    {parsed.description || "Nova transação"}
                  </span>
                  {parsed.amount && (
                    <Currency
                      value={Number(parsed.amount.replace(",", "."))}
                      className="ml-auto text-muted-foreground"
                    />
                  )}
                </div>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          )}

          <CommandGroup heading="Ações">
            <CommandItem onSelect={openSheetEmpty}>
              <Plus />
              Adicionar transação
              <CommandShortcut>{parsed ? "" : "↵"}</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <TransactionSheet
        open={prefill !== null}
        onOpenChange={(o) => {
          if (!o) setPrefill(null)
        }}
        mode="create"
        currentUser={currentUser}
        createDefaults={prefill ?? {}}
        onSubmit={async (v) => {
          await onSubmit(v)
          setPrefill(null)
          setQuery("")
        }}
      />
    </>
  )
}

/**
 * "Almoço com pessoal 45,90" → { description: "Almoço com pessoal", amount: "45,90" }
 * Returns null when the query is empty so we don't show a placeholder shortcut.
 */
function parseQuickEntry(input: string): { description: string; amount: string } | null {
  const s = input.trim()
  if (!s) return null
  const match = s.match(/(.*?)\s*(-?\d+(?:[.,]\d+)?)\s*$/)
  if (match) {
    const description = match[1].trim()
    const amount = match[2].replace(".", ",")
    return { description, amount }
  }
  return { description: s, amount: "" }
}
