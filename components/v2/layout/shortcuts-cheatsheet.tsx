"use client"

import * as React from "react"
import { Keyboard } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/v2/primitives/dialog"
import { useHotkeys } from "@/hooks/use-hotkeys"

type Group = { title: string; items: Array<{ keys: string[]; label: string }> }

const GROUPS: Group[] = [
  {
    title: "Geral",
    items: [
      { keys: ["⌘", "K"], label: "Abrir quick-add" },
      { keys: ["?"], label: "Mostrar esta lista" },
      { keys: ["Esc"], label: "Fechar diálogo / popover" },
    ],
  },
  {
    title: "Transações",
    items: [
      { keys: ["N"], label: "Nova transação" },
      { keys: ["/"], label: "Focar busca" },
    ],
  },
]

/**
 * Renderizada uma única vez no shell. Escuta `?` (shift+/) e abre o diálogo
 * com a lista de atalhos.
 */
export function ShortcutsCheatsheet() {
  const [open, setOpen] = React.useState(false)

  useHotkeys([
    {
      key: "shift+/",
      handler: (e) => {
        e.preventDefault()
        setOpen((o) => !o)
      },
    },
  ])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="size-5" />
            Atalhos
          </DialogTitle>
          <DialogDescription>
            Funcionam em qualquer tela do v2 (exceto enquanto você digita em um
            campo de texto).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {GROUPS.map((g) => (
            <section key={g.title} className="space-y-2">
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {g.title}
              </h3>
              <ul className="flex flex-col gap-1.5">
                {g.items.map((item) => (
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
