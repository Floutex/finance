"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/components/ui/utils"
import {
  ChevronDown,
  FilterX,
  HandCoins,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react"

interface SearchActionsBarProps {
  search: string
  visibleCount: number
  selectedCount: number
  onSearchChange: (value: string) => void
  onOpenCreateDialog: () => void
  onOpenUploadDialog: () => void
  onOpenRequestDialog: () => void
  onOpenBulkQuickEdit: () => void
  onOpenBulkDelete: () => void
  onClearSelection: () => void
}

export function SearchActionsBar({
  search,
  visibleCount,
  selectedCount,
  onSearchChange,
  onOpenCreateDialog,
  onOpenUploadDialog,
  onOpenRequestDialog,
  onOpenBulkQuickEdit,
  onOpenBulkDelete,
  onClearSelection,
}: SearchActionsBarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [addMenuOpen, setAddMenuOpen] = useState(false)

  const resultsSummary = visibleCount === 1 ? "1 transação listada" : `${visibleCount} transações listadas`
  const selectionSummary =
    selectedCount === 0
      ? null
      : selectedCount === 1
        ? "1 transação selecionada"
        : `${selectedCount} transações selecionadas`

  return (
    <>
      <div className="rounded-3xl border border-border/50 bg-black/20 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-6">
          {/* Search Bar Row */}
          <div className="relative">
            <Label htmlFor="search" className="sr-only">Buscar</Label>
            <div className="relative group">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground transition-colors group-focus-within:text-primary">
                <Search className="h-5 w-5" />
              </span>
              <Input
                ref={searchInputRef}
                id="search"
                type="search"
                placeholder="Buscar por descrição, categoria ou quem pagou..."
                autoComplete="off"
                value={search}
                onChange={event => onSearchChange(event.target.value)}
                className={cn(
                  "h-12 w-full rounded-2xl border-border/50 bg-black/40 pl-12 text-base shadow-sm transition-all focus:border-primary/50 focus:bg-black/60 focus:ring-4 focus:ring-primary/10",
                  search.trim() && "border-primary/50 bg-primary/5"
                )}
              />
            </div>
          </div>

          {/* Actions Row */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              {search.trim() && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => { onSearchChange(""); searchInputRef.current?.focus() }}
                  className="h-10 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                >
                  <FilterX className="mr-2 h-4 w-4" />
                  Limpar busca
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex">
                <Button
                  onClick={onOpenCreateDialog}
                  className="h-10 rounded-l-xl rounded-r-none bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 pr-3"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Transação
                </Button>
                <Button
                  onClick={() => setAddMenuOpen(!addMenuOpen)}
                  className="h-10 rounded-l-none rounded-r-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all border-l border-primary-foreground/20 px-2"
                >
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </Button>

                {addMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border/50 bg-black/90 p-1 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                      <button
                        onClick={() => { setAddMenuOpen(false); onOpenUploadDialog() }}
                        className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10"
                      >
                        <Upload className="mr-3 h-4 w-4 text-blue-400" />
                        Por Imagem via IA
                      </button>
                      <div className="my-1 border-t border-white/10" />
                      <button
                        onClick={() => { setAddMenuOpen(false); onOpenRequestDialog() }}
                        className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium text-amber-500 transition-colors hover:bg-amber-500/10"
                      >
                        <HandCoins className="mr-3 h-4 w-4" />
                        Solicitar Dinheiro
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Summary & Bulk Actions */}
      <div className="flex min-h-[40px] flex-wrap items-center justify-between gap-4 px-2">
        <div className="text-sm text-muted-foreground/80">
          {resultsSummary}
        </div>

        {selectionSummary && (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300">
            <span className="text-sm font-medium px-3 py-1 bg-primary/10 text-primary rounded-full">
              {selectionSummary}
            </span>
            <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-border/50">
              <Button variant="ghost" size="sm" onClick={onOpenBulkQuickEdit} className="h-8 w-8 p-0 rounded-md hover:bg-white/10">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={onOpenBulkDelete} className="h-8 w-8 p-0 rounded-md hover:bg-destructive/20 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-8 px-2 text-xs rounded-md hover:bg-white/10">
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
