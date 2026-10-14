"use client"

import * as React from "react"
import { CalendarHeart, Check, ChevronsUpDown, Plus, Tag, X, type LucideIcon } from "lucide-react"

import { cn } from "@/components/v2/primitives/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/v2/primitives/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/v2/primitives/popover"

type Category = { id: string; name: string }

type CategoryComboboxProps = {
  value: string
  onChange: (value: string) => void
  categories: Category[]
  id?: string
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Allow typing a brand-new category that isn't in the list. Default true. */
  allowCreate?: boolean
  /** Offer a "Sem categoria" option to clear the value. Default true. */
  allowEmpty?: boolean
  icon?: LucideIcon
  labels?: Partial<typeof categoryLabels>
}

const categoryLabels = {
  search: "Buscar categoria…",
  empty: "Nenhuma categoria.",
  none: "Sem categoria",
  group: "Categorias",
}

/** lowercase + strip accents for forgiving search */
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()

/**
 * Dropdown de categoria com pesquisa (igual ao "Pago por", mas filtrável).
 * Lista as categorias existentes; permite criar uma categoria nova digitando
 * (a opção "Usar …" aparece quando o texto não casa com nenhuma existente).
 */
export function CategoryCombobox({
  value,
  onChange,
  categories,
  id,
  placeholder = "Selecionar categoria",
  disabled,
  className,
  allowCreate = true,
  allowEmpty = true,
  icon: Icon = Tag,
  labels: labelOverrides,
}: CategoryComboboxProps) {
  const labels = { ...categoryLabels, ...labelOverrides }
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = norm(query)
    if (!q) return categories
    return categories.filter((c) => norm(c.name).includes(q))
  }, [categories, query])

  const exactMatch = React.useMemo(
    () => categories.some((c) => norm(c.name) === norm(query)),
    [categories, query]
  )

  const select = (next: string) => {
    onChange(next)
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-sm ring-offset-background transition-colors hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Icon className="size-4 shrink-0 opacity-70" />
          <span className="flex-1 truncate">{value || placeholder}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-[14rem] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={labels.search}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {filtered.length === 0 && !(allowCreate && query.trim()) && (
              <CommandEmpty>{labels.empty}</CommandEmpty>
            )}

            {allowEmpty && (
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  onSelect={() => select("")}
                  className="text-muted-foreground"
                >
                  <X className="size-4 opacity-70" />
                  {labels.none}
                  {!value && <Check className="ml-auto size-4" />}
                </CommandItem>
              </CommandGroup>
            )}

            {filtered.length > 0 && (
              <CommandGroup heading={labels.group}>
                {filtered.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={c.name}
                    onSelect={() => select(c.name)}
                  >
                    <Icon className="size-4 opacity-70" />
                    <span className="truncate">{c.name}</span>
                    {value === c.name && <Check className="ml-auto size-4" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {allowCreate && query.trim() && !exactMatch && (
              <CommandGroup heading="Criar">
                <CommandItem
                  value={`__create__${query}`}
                  onSelect={() => select(query.trim())}
                  className="text-primary"
                >
                  <Plus className="size-4" />
                  Usar “{query.trim()}”
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function EventCombobox({
  events,
  placeholder = "Sem evento",
  labels,
  ...props
}: Omit<CategoryComboboxProps, "categories" | "icon"> & {
  events: Category[]
}) {
  return (
    <CategoryCombobox
      {...props}
      categories={events}
      placeholder={placeholder}
      icon={CalendarHeart}
      labels={{
        search: "Buscar ou criar evento…",
        empty: "Nenhum evento.",
        none: "Sem evento",
        group: "Eventos",
        ...labels,
      }}
    />
  )
}
