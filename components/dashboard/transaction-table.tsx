"use client"

import { format, parseISO } from "date-fns"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CategorySelector, PayerSelector } from "@/components/transaction-selectors"
import { cn } from "@/components/ui/utils"
import { getUserColorClasses, PARTICIPANTS, normalizeText, formatCurrency } from "@/lib/constants"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Loader2,
  Pencil,
  Trash2,
  X,
} from "lucide-react"
import type { Transaction, FormState, SortField } from "./types"
import { ITEMS_PER_PAGE } from "./types"

interface TransactionTableProps {
  loading: boolean
  paginatedTransactions: Transaction[]
  sortedTransactions: Transaction[]
  sortField: SortField
  sortDirection: "asc" | "desc"
  selectedRows: string[]
  editRowId: string | null
  editForm: FormState
  editPending: boolean
  deletePendingId: string | null
  currentUser: string
  currentPage: number
  totalPages: number
  onSortToggle: (field: SortField) => void
  onToggleRow: (id: string) => void
  onToggleAll: () => void
  onEdit: (transaction: Transaction) => void
  onCancelEdit: () => void
  onSaveEdit: (id: string) => void
  onEditFormChange: (updates: Partial<FormState>) => void
  onEditInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDelete: (id: string) => void
  onPageChange: (page: number) => void
}

const sortableColumns: Array<{ key: SortField; label: string }> = [
  { key: "description", label: "Descrição" },
  { key: "category", label: "Categoria" },
  { key: "date", label: "Data" },
  { key: "paid_by", label: "Pago por" },
  { key: "amount", label: "Valor total" },
  { key: "participants", label: "Participantes" },
]

export function TransactionTable({
  loading,
  paginatedTransactions,
  sortedTransactions,
  sortField,
  sortDirection,
  selectedRows,
  editRowId,
  editForm,
  editPending,
  deletePendingId,
  currentUser,
  currentPage,
  totalPages,
  onSortToggle,
  onToggleRow,
  onToggleAll,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onEditFormChange,
  onEditInputChange,
  onDelete,
  onPageChange,
}: TransactionTableProps) {
  return (
    <div className="overflow-hidden rounded-3xl border border-border/50 bg-black/30 backdrop-blur-xl shadow-2xl">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/5">
            <tr>
              <th className="w-12 px-6 py-4">
                <input
                  type="checkbox"
                  checked={sortedTransactions.length > 0 && selectedRows.length === sortedTransactions.length}
                  onChange={onToggleAll}
                  className="h-4 w-4 rounded border-white/20 bg-black/40 checked:bg-primary checked:border-primary transition-all"
                />
              </th>
              {sortableColumns.map(col => (
                <th key={col.key} className={cn("px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs", col.key === "amount" && "text-right")}>
                  <button
                    onClick={() => onSortToggle(col.key)}
                    className="flex items-center gap-2 hover:text-foreground transition-colors group"
                  >
                    {col.label}
                    <div className={cn("transition-opacity", sortField === col.key ? "opacity-100 text-primary" : "opacity-0 group-hover:opacity-50")}>
                      {sortField === col.key && (sortDirection === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      {sortField !== col.key && <ChevronsUpDown className="h-3 w-3" />}
                    </div>
                  </button>
                </th>
              ))}
              <th className="px-6 py-4 text-right font-semibold text-muted-foreground uppercase tracking-wider text-xs">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-50 mb-2" />
                  Carregando transações...
                </td>
              </tr>
            ) : sortedTransactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                  Nenhuma transação encontrada para os filtros aplicados.
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((transaction, idx) => {
                const isEditing = editRowId === transaction.id
                const isSelected = selectedRows.includes(transaction.id)

                return (
                  <tr
                    key={transaction.id}
                    className={cn(
                      "group transition-colors duration-200",
                      isEditing ? "bg-primary/5" : "hover:bg-white/5",
                      isSelected && !isEditing && "bg-primary/5",
                      idx % 2 === 0 && !isEditing && !isSelected && "bg-white/[0.02]"
                    )}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleRow(transaction.id)}
                        className="h-4 w-4 rounded border-white/20 bg-black/40 checked:bg-primary checked:border-primary transition-all cursor-pointer opacity-50 group-hover:opacity-100"
                      />
                    </td>

                    {/* Description */}
                    <td className="px-6 py-4 max-w-[300px]">
                      {isEditing ? (
                        <Input
                          name="description"
                          value={editForm.description}
                          onChange={onEditInputChange}
                          className="h-8 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="truncate font-medium text-foreground/90">
                          {transaction.description}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <CategorySelector
                          value={editForm.category}
                          onChange={(val) => onEditFormChange({ category: val })}
                        />
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/5 text-muted-foreground border border-white/5">
                          {normalizeText(transaction.category) || "Sem categoria"}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-muted-foreground tabular-nums">
                      {isEditing ? (
                        <Input
                          type="date"
                          name="date"
                          value={editForm.date}
                          onChange={onEditInputChange}
                          className="h-8 text-sm w-36"
                        />
                      ) : (
                        format(parseISO(transaction.date), "dd/MM/yyyy")
                      )}
                    </td>

                    {/* Paid By */}
                    <td className="px-6 py-4">
                      {isEditing ? (
                        <PayerSelector
                          value={editForm.paid_by}
                          onChange={val => onEditFormChange({ paid_by: val })}
                          currentUser={currentUser}
                        />
                      ) : (
                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset", getUserColorClasses(transaction.paid_by))}>
                          {transaction.paid_by}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 text-right font-medium tabular-nums">
                      {isEditing ? (
                        <Input
                          name="amount"
                          value={editForm.amount}
                          onChange={onEditInputChange}
                          className="h-8 text-right w-24 ml-auto"
                        />
                      ) : (
                        <span className={(transaction.amount || 0) > 1000 ? "text-foreground" : "text-muted-foreground"}>
                          {formatCurrency(transaction.amount || 0)}
                        </span>
                      )}
                    </td>

                    {/* Participants */}
                    <td className="px-6 py-4">
                      <div className="flex -space-x-1 overflow-hidden py-1">
                        {isEditing ? (
                          <div className="flex gap-2">
                            {PARTICIPANTS.map(p => (
                              <label key={p} className={cn("cursor-pointer px-2 py-1 rounded text-xs border", editForm.participants.includes(p) ? getUserColorClasses(p) : "border-border text-muted-foreground")}>
                                <input type="checkbox" className="sr-only" checked={editForm.participants.includes(p)}
                                  onChange={e => {
                                    const checked = e.target.checked
                                    onEditFormChange({
                                      participants: checked
                                        ? [...editForm.participants, p]
                                        : editForm.participants.filter(x => x !== p)
                                    })
                                  }}
                                />
                                {p.charAt(0)}
                              </label>
                            ))}
                          </div>
                        ) : (
                          transaction.participants?.map(p => (
                            <div key={p} className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-background text-[10px] font-bold", getUserColorClasses(p).replace('bg-', 'bg-opacity-100 bg-'))}>
                              {p.charAt(0)}
                            </div>
                          ))
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {isEditing ? (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10" onClick={() => onSaveEdit(transaction.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={onCancelEdit}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            {(currentUser === "Antônio" || transaction.paid_by === currentUser) && (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => onEdit(transaction)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-400" onClick={() => onDelete(transaction.id)}>
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 bg-black/20 px-6 py-4">
          <div className="text-xs text-muted-foreground">
            Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, sortedTransactions.length)} de {sortedTransactions.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
