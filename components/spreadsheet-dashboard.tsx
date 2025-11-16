"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { format, isSameMonth, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSupabaseClient, bulkDeleteByIds, bulkUpdateByIds } from "@/lib/supabase"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types"
import { BalanceChart } from "@/components/balance-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { cn } from "@/components/ui/utils"
import {
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  FilterX,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X
} from "lucide-react"

type Transaction = Tables<"shared_transactions">
type TransactionInsert = TablesInsert<"shared_transactions">
type TransactionUpdate = TablesUpdate<"shared_transactions">

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const toISODate = (value: string) => {
  try {
    return format(parseISO(value), "yyyy-MM-dd")
  } catch {
    return value
  }
}

type SortField = "date" | "description" | "amount" | "amount_owed" | "paid_by" | "category" | "created_at"

type FormState = {
  description: string
  category: string
  paid_by: string
  date: string
  amount: string
  amount_owed: string
}

type ExtractedTransaction = {
  description: string
  date: string
  amount: number
  amount_owed: number
  paid_by: string
  category: string
}

const initialFormState = (): FormState => {
  const today = new Date().toISOString().slice(0, 10)
  return {
    description: "",
    category: "",
    paid_by: "",
    date: today,
    amount: "",
    amount_owed: ""
  }
}

const normalizeNumber = (value: string) => {
  if (!value.trim()) {
    return null
  }
  const parsed = Number(value.replace(",", "."))
  return Number.isFinite(parsed) ? parsed : null
}

const normalizeText = (value: string | null) => value?.trim() || ""

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

export const SpreadsheetDashboard = () => {
  const supabase = getSupabaseClient()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [createForm, setCreateForm] = useState<FormState>(initialFormState)
  const [createPending, setCreatePending] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([])
  const [savePending, setSavePending] = useState(false)
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [editRowId, setEditRowId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(initialFormState)
  const [editPending, setEditPending] = useState(false)
  const [selectedRows, setSelectedRows] = useState<string[]>([])
  const selectAllRef = useRef<HTMLInputElement>(null)
  const [deletePendingId, setDeletePendingId] = useState<string | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [bulkQuickEditOpen, setBulkQuickEditOpen] = useState(false)
  const [bulkAdvancedEditOpen, setBulkAdvancedEditOpen] = useState(false)
  const [bulkPending, setBulkPending] = useState(false)
  const [bulkError, setBulkError] = useState<string | null>(null)
  const [quickField, setQuickField] = useState<"category" | "paid_by">("category")
  const [quickValue, setQuickValue] = useState<string>("")
  const [advancedCategory, setAdvancedCategory] = useState<string>("")
  const [advancedPaidBy, setAdvancedPaidBy] = useState<string>("")
  const [advancedDate, setAdvancedDate] = useState<string>("")
  const searchInputRef = useRef<HTMLInputElement>(null)
  const createFirstFieldRef = useRef<HTMLInputElement>(null)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const createDialogTitleId = "create-transaction-title"
  const createDialogDescriptionId = "create-transaction-description"
  const tableCaptionId = "transactions-table-caption"
  const tableSummaryId = "transactions-table-summary"

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: fetchError } = await supabase
      .from("shared_transactions")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
    if (fetchError) {
      setError(fetchError.message)
      setTransactions([])
    } else {
      setTransactions(data ?? [])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  useEffect(() => {
    if (!createDialogOpen) {
      return
    }
    const frame = requestAnimationFrame(() => {
      createFirstFieldRef.current?.focus()
    })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [createDialogOpen])

  useEffect(() => {
    if (!uploadDialogOpen) {
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handlePaste = async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) {
        return
      }
      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.startsWith("image/")) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) {
            setUploadedFile(file)
            const reader = new FileReader()
            reader.onload = e => {
              setUploadedImage(e.target?.result as string)
            }
            reader.readAsDataURL(file)
            setExtractedTransactions([])
            setError(null)
          }
          break
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("paste", handlePaste)
    }
  }, [uploadDialogOpen])

  const filteredTransactions = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    const start = startDate ? parseISO(startDate) : null
    const end = endDate ? parseISO(endDate) : null
    return transactions.filter(transaction => {
      const matchesSearch =
        !searchValue ||
        normalizeText(transaction.description).toLowerCase().includes(searchValue) ||
        normalizeText(transaction.category).toLowerCase().includes(searchValue) ||
        transaction.paid_by.toLowerCase().includes(searchValue)
      if (!matchesSearch) {
        return false
      }
      const transactionDate = parseISO(transaction.date)
      const afterStart = start ? transactionDate >= start : true
      const beforeEnd = end ? transactionDate <= end : true
      return afterStart && beforeEnd
    })
  }, [transactions, search, startDate, endDate])

  const sortedTransactions = useMemo(() => {
    const copy = [...filteredTransactions]
    copy.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortField === "amount" || sortField === "amount_owed") {
        const first = (a[sortField] ?? 0) as number
        const second = (b[sortField] ?? 0) as number
        return (first - second) * direction
      }
      if (sortField === "date" || sortField === "created_at") {
        const first = parseISO(a[sortField])
        const second = parseISO(b[sortField])
        return (first.getTime() - second.getTime()) * direction
      }
      const first = normalizeText(a[sortField]).toLowerCase()
      const second = normalizeText(b[sortField]).toLowerCase()
      if (first < second) {
        return -1 * direction
      }
      if (first > second) {
        return 1 * direction
      }
      return 0
    })
    return copy
  }, [filteredTransactions, sortField, sortDirection])

  const hasActiveFilters = useMemo(() => {
    return Boolean(search.trim() || startDate || endDate)
  }, [search, startDate, endDate])

  const createAmountValue = useMemo(() => normalizeNumber(createForm.amount), [createForm.amount])
  const createAmountOwedValue = useMemo(() => {
    if (createForm.amount.trim() && createForm.paid_by) {
      const amount = normalizeNumber(createForm.amount)
      if (amount !== null) {
        return createForm.paid_by === "Júlia" ? -amount / 2 : amount / 2
      }
    }
    return normalizeNumber(createForm.amount_owed)
  }, [createForm.amount, createForm.paid_by, createForm.amount_owed])
  const createAmountInvalid = createForm.amount.trim().length > 0 && createAmountValue === null
  const createAmountOwedInvalid = false

  const isCreateFormValid = useMemo(() => {
    const descriptionValid = createForm.description.trim().length > 0
    const paidByValid = createForm.paid_by === "Antônio" || createForm.paid_by === "Júlia"
    const dateValid = createForm.date.length > 0
    const amountValid = !createAmountInvalid && createAmountValue !== null
    return descriptionValid && paidByValid && dateValid && amountValid
  }, [
    createAmountInvalid,
    createAmountValue,
    createForm.date,
    createForm.description,
    createForm.paid_by
  ])

  useEffect(() => {
    setSelectedRows(previous => previous.filter(id => sortedTransactions.some(transaction => transaction.id === id)))
  }, [sortedTransactions])

  useEffect(() => {
    if (!selectAllRef.current) {
      return
    }
    selectAllRef.current.indeterminate =
      selectedRows.length > 0 && selectedRows.length < sortedTransactions.length
  }, [selectedRows, sortedTransactions.length])

  const handleToggleRow = (id: string) => {
    setSelectedRows(previous => {
      if (previous.includes(id)) {
        return previous.filter(item => item !== id)
      }
      return [...previous, id]
    })
  }

  const handleToggleAll = () => {
    if (selectedRows.length === sortedTransactions.length) {
      setSelectedRows([])
      return
    }
    setSelectedRows(sortedTransactions.map(transaction => transaction.id))
  }

  const handleResetFilters = () => {
    setSearch("")
    setStartDate("")
    setEndDate("")
    searchInputRef.current?.focus()
  }
  const handleClearSelection = () => {
    setSelectedRows([])
  }

  const netBalance = useMemo(() => {
    return sortedTransactions.reduce((total, transaction) => total + (transaction.amount_owed ?? 0), 0)
  }, [sortedTransactions])

  const currentMonthStats = useMemo(() => {
    const currentDate = new Date()
    let total = 0
    let count = 0
    sortedTransactions.forEach(transaction => {
      if (isSameMonth(parseISO(transaction.date), currentDate)) {
        total += transaction.amount_owed ?? 0
        count += 1
      }
    })
    return { total, count }
  }, [sortedTransactions])

  const monthLabel = useMemo(() => capitalize(format(new Date(), "MMMM", { locale: ptBR })), [])
  const totalTransactions = sortedTransactions.length

  const visibleCount = sortedTransactions.length
  const selectedCount = selectedRows.length
  const resultsSummary = visibleCount === 1 ? "1 transação listada" : `${visibleCount} transações listadas`
  const selectionSummary =
    selectedCount === 0
      ? null
      : selectedCount === 1
        ? "1 transação selecionada"
        : `${selectedCount} transações selecionadas`

  const chartSeries = useMemo(() => {
    if (sortedTransactions.length === 0) {
      return []
    }
    const grouped = new Map<string, number>()
    sortedTransactions.forEach(transaction => {
      const key = transaction.date
      const amount = transaction.amount_owed ?? 0
      grouped.set(key, (grouped.get(key) ?? 0) + amount)
    })
    const dates = Array.from(grouped.keys()).sort(
      (first, second) => parseISO(first).getTime() - parseISO(second).getTime()
    )
    let running = 0
    return dates.map(date => {
      running += grouped.get(date) ?? 0
      return {
        date,
        balance: Number(running.toFixed(2))
      }
    })
  }, [sortedTransactions])

  const juliaMessage =
    netBalance > 0
      ? `Júlia me deve ${formatCurrency(netBalance)}`
      : netBalance < 0
        ? `Eu devo ${formatCurrency(Math.abs(netBalance))} para a Júlia`
        : "Estamos quites por enquanto"

  const [localCategories, setLocalCategories] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem("categoriesOptions")
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setLocalCategories(parsed.filter(item => typeof item === "string"))
        }
      }
    } catch {}
  }, [])

  const categoriesOptions = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach(t => {
      const c = normalizeText(t.category)
      if (c) set.add(c)
    })
    localCategories.forEach(c => {
      const v = normalizeText(c)
      if (v) set.add(v)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"))
  }, [transactions, localCategories])

  const handleAddCategoryOption = (value: string) => {
    const v = normalizeText(value)
    if (!v) return
    if (categoriesOptions.includes(v)) return
    const next = [...new Set([...(localCategories ?? []), v])].sort((a, b) => a.localeCompare(b, "pt-BR"))
    setLocalCategories(next)
    try {
      localStorage.setItem("categoriesOptions", JSON.stringify(next))
    } catch {}
  }

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection(field === "date" || field === "created_at" ? "desc" : "asc")
    }
  }

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreatePending(true)
    setError(null)
    if (createAmountOwedValue === null) {
      setCreatePending(false)
      setError("Informe um saldo válido.")
      return
    }
    const payload: TransactionInsert = {
      description: createForm.description.trim(),
      category: createForm.category.trim() || null,
      paid_by: createForm.paid_by.trim(),
      date: createForm.date,
      amount: createAmountValue,
      amount_owed: createAmountOwedValue
    }
    const { data, error: insertError } = await supabase
      .from("shared_transactions")
      .insert(payload)
      .select("*")
      .single()
    if (insertError) {
      setError(insertError.message)
    } else if (data) {
      setTransactions(previous => [data, ...previous])
      setCreateForm(initialFormState())
      setCreateDialogOpen(false)
    }
    setCreatePending(false)
  }

  const handleOpenCreateDialog = () => {
    setCreateForm(initialFormState())
    setError(null)
    setCreateDialogOpen(true)
  }

  const handleCloseCreateDialog = () => {
    if (createPending) {
      return
    }
    setCreateDialogOpen(false)
    setError(null)
    setCreateForm(initialFormState())
    requestAnimationFrame(() => {
      createButtonRef.current?.focus()
    })
  }

  const handleCreateDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !createPending) {
      event.stopPropagation()
      handleCloseCreateDialog()
    }
  }

  const handleEdit = (transaction: Transaction) => {
    setEditRowId(transaction.id)
    setEditForm({
      description: transaction.description,
      category: normalizeText(transaction.category),
      paid_by: transaction.paid_by,
      date: toISODate(transaction.date),
      amount: transaction.amount !== null ? String(transaction.amount) : "",
      amount_owed: transaction.amount_owed !== null ? String(transaction.amount_owed) : ""
    })
  }

  const handleCancelEdit = () => {
    setEditRowId(null)
    setEditForm(initialFormState())
  }

  const handleSaveEdit = async (transactionId: string) => {
    setEditPending(true)
    setError(null)
    const amountValue = normalizeNumber(editForm.amount)
    const amountOwedValue = normalizeNumber(editForm.amount_owed)
    const updatePayload: TransactionUpdate = {
      description: editForm.description.trim(),
      category: editForm.category.trim() || null,
      paid_by: editForm.paid_by.trim(),
      date: editForm.date,
      amount: amountValue,
      amount_owed: amountOwedValue
    }
    const { data, error: updateError } = await supabase
      .from("shared_transactions")
      .update(updatePayload)
      .eq("id", transactionId)
      .select("*")
      .single()
    if (updateError) {
      setError(updateError.message)
    } else if (data) {
      setTransactions(previous =>
        previous.map(item => {
          if (item.id === transactionId) {
            return data
          }
          return item
        })
      )
      handleCancelEdit()
    }
    setEditPending(false)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setCreateForm(previous => {
      const updated = { ...previous, [name]: value }
      if (name === "amount" || name === "paid_by") {
        const amount = normalizeNumber(updated.amount)
        if (amount !== null && (updated.paid_by === "Antônio" || updated.paid_by === "Júlia")) {
          updated.amount_owed = String(updated.paid_by === "Júlia" ? -amount / 2 : amount / 2)
        }
      }
      return updated
    })
  }

  const handlePaidByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setCreateForm(previous => {
      const updated = { ...previous, paid_by: value }
      const amount = normalizeNumber(updated.amount)
      if (amount !== null && (value === "Antônio" || value === "Júlia")) {
        updated.amount_owed = String(value === "Júlia" ? -amount / 2 : amount / 2)
      }
      return updated
    })
  }

  const handleEditInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setEditForm(previous => ({ ...previous, [name]: value }))
  }

  const handleDelete = async (transactionId: string) => {
    setDeletePendingId(transactionId)
    setError(null)
    const { error: deleteError } = await supabase.from("shared_transactions").delete().eq("id", transactionId)
    if (deleteError) {
      setError(deleteError.message)
      setDeletePendingId(null)
      return
    }
    setTransactions(previous => previous.filter(item => item.id !== transactionId))
    setSelectedRows(previous => previous.filter(item => item !== transactionId))
    if (editRowId === transactionId) {
      setEditRowId(null)
      setEditForm(initialFormState())
    }
    setDeletePendingId(null)
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione um arquivo de imagem")
      return
    }
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = e => {
      setUploadedImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    setExtractedTransactions([])
    setError(null)
  }

  const handleAnalyzeImage = async () => {
    if (!uploadedFile) {
      return
    }
    setAnalyzing(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append("image", uploadedFile)
      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Erro ao analisar imagem")
      }
      const data = await response.json()
      const transactions: ExtractedTransaction[] = data.transactions.map((t: any) => ({
        description: t.description,
        date: t.date,
        amount: t.amount,
        amount_owed: 0,
        paid_by: "",
        category: ""
      }))
      setExtractedTransactions(transactions)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao analisar imagem")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleUpdateExtractedTransaction = (index: number, field: keyof ExtractedTransaction, value: string | number) => {
    setExtractedTransactions(previous =>
      previous.map((t, i) => {
        if (i === index) {
          const updated = { ...t, [field]: value }
          if (field === "amount" || field === "paid_by") {
            const amount = field === "amount" ? (value as number) : updated.amount
            const paidBy = field === "paid_by" ? (value as string) : updated.paid_by
            if (paidBy === "Júlia") {
              updated.amount_owed = -amount / 2
            } else if (paidBy === "Antônio") {
              updated.amount_owed = amount / 2
            } else {
              updated.amount_owed = amount / 2
            }
          }
          return updated
        }
        return t
      })
    )
  }

  const handleSaveExtractedTransactions = async () => {
    const invalidTransactions = extractedTransactions.filter(
      t => !t.description.trim() || (t.paid_by !== "Antônio" && t.paid_by !== "Júlia") || !t.date
    )
    if (invalidTransactions.length > 0) {
      setError("Preencha todos os campos obrigatórios (descrição, data e pago por) em todas as transações")
      return
    }
    setSavePending(true)
    setError(null)
    try {
      const payloads: TransactionInsert[] = extractedTransactions.map(t => ({
        description: t.description.trim(),
        category: t.category.trim() || null,
        paid_by: t.paid_by.trim(),
        date: t.date,
        amount: t.amount,
        amount_owed: t.amount_owed
      }))
      const { data, error: insertError } = await supabase
        .from("shared_transactions")
        .insert(payloads)
        .select("*")
      if (insertError) {
        setError(insertError.message)
      } else if (data) {
        setTransactions(previous => [...data, ...previous])
        handleCloseUploadDialog()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar transações")
    } finally {
      setSavePending(false)
    }
  }

  const handleOpenUploadDialog = () => {
    setUploadDialogOpen(true)
    setUploadedImage(null)
    setUploadedFile(null)
    setExtractedTransactions([])
    setError(null)
  }

  const handleCloseUploadDialog = () => {
    if (analyzing || savePending) {
      return
    }
    setUploadDialogOpen(false)
    setUploadedImage(null)
    setUploadedFile(null)
    setExtractedTransactions([])
    setError(null)
    requestAnimationFrame(() => {
      createButtonRef.current?.focus()
    })
  }

  const handleUploadDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !analyzing && !savePending) {
      event.stopPropagation()
      handleCloseUploadDialog()
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return null
    }
    return sortDirection === "asc" ? (
      <ChevronUp className="ml-1 h-4 w-4" aria-hidden="true" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" aria-hidden="true" />
    )
  }

  const getSortState = (field: SortField): "ascending" | "descending" | "none" => {
    if (sortField !== field) {
      return "none"
    }
    return sortDirection === "asc" ? "ascending" : "descending"
  }

  const handleConfirmBulkDelete = async () => {
    if (selectedRows.length === 0) {
      return
    }
    setBulkPending(true)
    setBulkError(null)
    const { error } = await bulkDeleteByIds("shared_transactions", selectedRows)
    if (error) {
      setBulkError(error.message)
      setBulkPending(false)
      return
    }
    await loadTransactions()
    setSelectedRows([])
    setBulkPending(false)
    setBulkDeleteOpen(false)
  }

  const handleConfirmQuickEdit = async () => {
    if (selectedRows.length === 0) {
      return
    }
    const values: any = {}
    if (quickField === "category") {
      values.category = quickValue.trim() || null
    } else if (quickField === "paid_by") {
      values.paid_by = quickValue.trim()
    }
    setBulkPending(true)
    setBulkError(null)
    const { error } = await bulkUpdateByIds("shared_transactions", selectedRows, values)
    if (error) {
      setBulkError(error.message)
      setBulkPending(false)
      return
    }
    await loadTransactions()
    setSelectedRows([])
    setBulkPending(false)
    setBulkQuickEditOpen(false)
    setQuickValue("")
  }

  const handleConfirmAdvancedEdit = async () => {
    if (selectedRows.length === 0) {
      return
    }
    const values: any = {}
    if (advancedCategory.trim().length > 0) {
      values.category = advancedCategory.trim()
    }
    if (advancedPaidBy.trim().length > 0) {
      values.paid_by = advancedPaidBy.trim()
    }
    if (advancedDate.trim().length > 0) {
      values.date = advancedDate.trim()
    }
    if (Object.keys(values).length === 0) {
      return
    }
    setBulkPending(true)
    setBulkError(null)
    const { error } = await bulkUpdateByIds("shared_transactions", selectedRows, values)
    if (error) {
      setBulkError(error.message)
      setBulkPending(false)
      return
    }
    await loadTransactions()
    setSelectedRows([])
    setBulkPending(false)
    setBulkAdvancedEditOpen(false)
    setAdvancedCategory("")
    setAdvancedPaidBy("")
    setAdvancedDate("")
  }

  const sortableColumns: Array<{ key: SortField; label: string; align?: "right"; labelClassName?: string }> = [
    { key: "description", label: "Descrição" },
    { key: "category", label: "Categoria" },
    { key: "date", label: "Data" },
    { key: "paid_by", label: "Pago por", labelClassName: "whitespace-nowrap" },
    { key: "amount", label: "Valor total", align: "right", labelClassName: "whitespace-nowrap" },
    { key: "amount_owed", label: "Saldo", align: "right" }
  ]

  return (
    <div className="space-y-8">
      <datalist id="categories-list">
        {categoriesOptions.map(option => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Saldo líquido</CardTitle>
            <p className="text-sm text-muted-foreground">Situação geral</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{formatCurrency(netBalance)}</p>
            <p className={cn("text-sm", netBalance === 0 ? "text-muted-foreground" : "text-primary")}>
              {juliaMessage}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>{`Saldo em ${monthLabel}`}</CardTitle>
            <p className="text-sm text-muted-foreground">Movimentação mensal</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{formatCurrency(currentMonthStats.total)}</p>
            <p className="text-sm text-muted-foreground">
              {currentMonthStats.count === 1
                ? "1 lançamento no mês"
                : `${currentMonthStats.count} lançamentos no mês`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Número de lançamentos</CardTitle>
            <p className="text-sm text-muted-foreground">Visíveis no período</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{totalTransactions}</p>
            <p className="text-sm text-muted-foreground">
              {totalTransactions === 1 ? "Transação listada" : "Transações listadas"}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <BalanceChart series={chartSeries} />
      </section>

      {createDialogOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleCloseCreateDialog}
            aria-hidden="true"
          />
          <div className="relative flex h-full items-center justify-center p-4" onKeyDown={handleCreateDialogKeyDown}>
            <div
              className="w-full max-w-3xl rounded-lg border border-border bg-card p-6 shadow-lg outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby={createDialogTitleId}
              aria-describedby={createDialogDescriptionId}
            >
              <div className="flex items-center justify-between">
                <p id={createDialogTitleId} className="text-lg font-semibold">
                  Adicionar transação
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseCreateDialog}
                  disabled={createPending}
                  aria-label="Fechar formulário de criação"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p id={createDialogDescriptionId} className="mt-2 text-sm text-muted-foreground">
                Informe os campos obrigatórios. Valores aceitam vírgula ou ponto.
              </p>
              <form onSubmit={handleCreate} className="mt-6 grid gap-4 md:grid-cols-2" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    ref={createFirstFieldRef}
                    id="description"
                    name="description"
                    autoComplete="off"
                    value={createForm.description}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Input
                    id="category"
                    name="category"
                    list="categories-list"
                    autoComplete="off"
                    value={createForm.category}
                    onChange={handleInputChange}
                  />
                  {createForm.category.trim() && !categoriesOptions.includes(createForm.category.trim()) && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddCategoryOption(createForm.category)}
                      >
                        Adicionar "{createForm.category.trim()}"
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_by">Pago por</Label>
                  <Select
                    id="paid_by"
                    name="paid_by"
                    value={createForm.paid_by}
                    onChange={handlePaidByChange}
                    required
                  >
                    <option value="">Selecione...</option>
                    <option value="Antônio">Antônio</option>
                    <option value="Júlia">Júlia</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={createForm.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor total</Label>
                  <Input
                    id="amount"
                    name="amount"
                    autoComplete="off"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={createForm.amount}
                    onChange={handleInputChange}
                    aria-invalid={createAmountInvalid}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_owed">Saldo</Label>
                  <Input
                    id="amount_owed"
                    name="amount_owed"
                    autoComplete="off"
                    inputMode="decimal"
                    placeholder="0,00"
                    value={createForm.amount_owed}
                    readOnly
                    className="bg-muted"
                    aria-invalid={createAmountOwedInvalid}
                  />
                  <p className="text-xs text-muted-foreground">
                    Calculado automaticamente: metade do valor total (negativo se Júlia pagou, positivo se Antônio pagou)
                  </p>
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <Button type="submit" disabled={createPending || !isCreateFormValid} aria-busy={createPending}>
                    {createPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                        Adicionar transação
                      </>
                    )}
                  </Button>
                </div>
              </form>
              {error && (
                <p className="mt-4 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {uploadDialogOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={handleCloseUploadDialog}
            aria-hidden="true"
          />
          <div className="relative flex h-full items-center justify-center p-4" onKeyDown={handleUploadDialogKeyDown}>
            <div
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg border border-border bg-card p-6 shadow-lg outline-none"
              role="dialog"
              aria-modal="true"
              aria-labelledby="upload-dialog-title"
              aria-describedby="upload-dialog-description"
            >
              <div className="flex items-center justify-between">
                <p id="upload-dialog-title" className="text-lg font-semibold">
                  Adicionar transações por imagem
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseUploadDialog}
                  disabled={analyzing || savePending}
                  aria-label="Fechar formulário de upload"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p id="upload-dialog-description" className="mt-2 text-sm text-muted-foreground">
                Faça upload de uma imagem contendo transações ou cole uma imagem (Ctrl+V). O sistema irá extrair automaticamente as informações.
              </p>

              <div className="mt-6 space-y-6">
                {!uploadedImage ? (
                  <div className="space-y-2">
                    <Label htmlFor="image-upload">Selecionar imagem ou colar (Ctrl+V)</Label>
                    <Input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground">
                      Você também pode colar uma imagem usando Ctrl+V quando este dialog estiver aberto
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Imagem selecionada</Label>
                      <div className="relative">
                        <img
                          src={uploadedImage}
                          alt="Preview"
                          className="max-h-64 w-full rounded-md border border-border object-contain"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setUploadedImage(null)
                            setUploadedFile(null)
                            setExtractedTransactions([])
                          }}
                          className="absolute right-2 top-2"
                          aria-label="Remover imagem"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {extractedTransactions.length === 0 && (
                      <Button
                        type="button"
                        onClick={handleAnalyzeImage}
                        disabled={analyzing}
                        className="w-full"
                      >
                        {analyzing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analisando imagem...
                          </>
                        ) : (
                          <>
                            <ImageIcon className="mr-2 h-4 w-4" />
                            Analisar imagem
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                {extractedTransactions.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {extractedTransactions.length === 1
                          ? "1 transação extraída"
                          : `${extractedTransactions.length} transações extraídas`}
                      </p>
                    </div>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {extractedTransactions.map((transaction, index) => (
                        <div key={index} className="rounded-lg border border-border p-4 space-y-3">
                          <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`desc-${index}`}>Descrição</Label>
                              <Input
                                id={`desc-${index}`}
                                value={transaction.description}
                                onChange={e =>
                                  handleUpdateExtractedTransaction(index, "description", e.target.value)
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`date-${index}`}>Data</Label>
                              <Input
                                id={`date-${index}`}
                                type="date"
                                value={transaction.date}
                                onChange={e => handleUpdateExtractedTransaction(index, "date", e.target.value)}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`amount-${index}`}>Valor total</Label>
                              <Input
                                id={`amount-${index}`}
                                type="number"
                                step="0.01"
                                value={transaction.amount}
                                onChange={e =>
                                  handleUpdateExtractedTransaction(index, "amount", parseFloat(e.target.value) || 0)
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`paid_by-${index}`}>Pago por</Label>
                              <Select
                                id={`paid_by-${index}`}
                                value={transaction.paid_by}
                                onChange={e => handleUpdateExtractedTransaction(index, "paid_by", e.target.value)}
                                required
                              >
                                <option value="">Selecione...</option>
                                <option value="Antônio">Antônio</option>
                                <option value="Júlia">Júlia</option>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`amount_owed-${index}`}>Valor devido</Label>
                              <Input
                                id={`amount_owed-${index}`}
                                type="number"
                                step="0.01"
                                value={transaction.amount_owed}
                                readOnly
                                className="bg-muted"
                                required
                              />
                              <p className="text-xs text-muted-foreground">
                                Calculado automaticamente
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`category-${index}`}>Categoria</Label>
                              <div>
                                <Input
                                  id={`category-${index}`}
                                  list="categories-list"
                                  value={transaction.category}
                                  onChange={e => handleUpdateExtractedTransaction(index, "category", e.target.value)}
                                />
                                {transaction.category.trim() &&
                                  !categoriesOptions.includes(transaction.category.trim()) && (
                                    <div className="pt-1">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAddCategoryOption(transaction.category)}
                                      >
                                        Adicionar "{transaction.category.trim()}"
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCloseUploadDialog}
                        disabled={savePending}
                      >
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleSaveExtractedTransactions} disabled={savePending}>
                        {savePending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar todas as transações
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              {error && (
                <p className="mt-4 text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setBulkDeleteOpen(false)} aria-hidden="true" />
          <div className="relative flex h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg outline-none" role="dialog" aria-modal="true" aria-labelledby="bulk-delete-title">
              <div className="flex items-center justify-between">
                <p id="bulk-delete-title" className="text-lg font-semibold">Excluir transações selecionadas</p>
                <Button type="button" variant="ghost" size="icon" onClick={() => setBulkDeleteOpen(false)} disabled={bulkPending} aria-label="Fechar" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedRows.length === 1 ? "Deseja excluir 1 transação?" : `Deseja excluir ${selectedRows.length} transações?`}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setBulkDeleteOpen(false)} disabled={bulkPending}>Cancelar</Button>
                <Button type="button" onClick={handleConfirmBulkDelete} disabled={bulkPending}>
                  {bulkPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Excluindo...</> : <><Trash2 className="mr-2 h-4 w-4" />Excluir</>}
                </Button>
              </div>
              {bulkError && <p className="mt-4 text-sm text-destructive" role="alert">{bulkError}</p>}
            </div>
          </div>
        </div>
      )}

      {bulkQuickEditOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setBulkQuickEditOpen(false)} aria-hidden="true" />
          <div className="relative flex h-full items-center justify-center p-4">
            <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg outline-none" role="dialog" aria-modal="true" aria-labelledby="bulk-quick-title">
              <div className="flex items-center justify-between">
                <p id="bulk-quick-title" className="text-lg font-semibold">Edição rápida</p>
                <Button type="button" variant="ghost" size="icon" onClick={() => setBulkQuickEditOpen(false)} disabled={bulkPending} aria-label="Fechar" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="quick-field">Campo</Label>
                  <Select id="quick-field" value={quickField} onChange={e => setQuickField(e.target.value as any)}>
                    <option value="category">Categoria</option>
                    <option value="paid_by">Pago por</option>
                  </Select>
                </div>
                {quickField === "category" ? (
                  <div className="space-y-2">
                    <Label htmlFor="quick-value">Novo valor</Label>
                    <Input id="quick-value" value={quickValue} onChange={e => setQuickValue(e.target.value)} list="categories-list" />
                    {quickValue.trim() && !categoriesOptions.includes(quickValue.trim()) && (
                      <div className="pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddCategoryOption(quickValue)}
                        >
                          Adicionar "{quickValue.trim()}"
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="quick-paid-by">Pago por</Label>
                    <Select id="quick-paid-by" value={quickValue} onChange={e => setQuickValue(e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="Antônio">Antônio</option>
                      <option value="Júlia">Júlia</option>
                    </Select>
                  </div>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setBulkQuickEditOpen(false)} disabled={bulkPending}>Cancelar</Button>
                <Button type="button" onClick={handleConfirmQuickEdit} disabled={bulkPending || (quickField === "paid_by" && !quickValue)}>
                  {bulkPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Aplicar</>}
                </Button>
              </div>
              {bulkError && <p className="mt-4 text-sm text-destructive" role="alert">{bulkError}</p>}
            </div>
          </div>
        </div>
      )}

      {bulkAdvancedEditOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setBulkAdvancedEditOpen(false)} aria-hidden="true" />
          <div className="relative flex h-full items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-lg outline-none" role="dialog" aria-modal="true" aria-labelledby="bulk-adv-title">
              <div className="flex items-center justify-between">
                <p id="bulk-adv-title" className="text-lg font-semibold">Edição avançada</p>
                <Button type="button" variant="ghost" size="icon" onClick={() => setBulkAdvancedEditOpen(false)} disabled={bulkPending} aria-label="Fechar" className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adv-category">Categoria</Label>
                  <Input id="adv-category" value={advancedCategory} onChange={e => setAdvancedCategory(e.target.value)} list="categories-list" />
                  {advancedCategory.trim() && !categoriesOptions.includes(advancedCategory.trim()) && (
                    <div className="pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddCategoryOption(advancedCategory)}
                      >
                        Adicionar "{advancedCategory.trim()}"
                      </Button>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adv-paid-by">Pago por</Label>
                  <Select id="adv-paid-by" value={advancedPaidBy} onChange={e => setAdvancedPaidBy(e.target.value)}>
                    <option value="">Selecione...</option>
                    <option value="Antônio">Antônio</option>
                    <option value="Júlia">Júlia</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adv-date">Data</Label>
                  <Input id="adv-date" type="date" value={advancedDate} onChange={e => setAdvancedDate(e.target.value)} />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setBulkAdvancedEditOpen(false)} disabled={bulkPending}>Cancelar</Button>
                <Button type="button" onClick={handleConfirmAdvancedEdit} disabled={bulkPending || (!advancedCategory && !advancedPaidBy && !advancedDate)}>
                  {bulkPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : <><Save className="mr-2 h-4 w-4" />Aplicar</>}
                </Button>
              </div>
              {bulkError && <p className="mt-4 text-sm text-destructive" role="alert">{bulkError}</p>}
            </div>
          </div>
        </div>
      )}

      <section className="space-y-4">
        <div className="rounded-2xl border border-border bg-card/70 p-6 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="flex w-full flex-col gap-2">
              <Label htmlFor="search" className="text-sm font-semibold">
                Buscar
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-muted-foreground">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </span>
                <Input
                  ref={searchInputRef}
                  id="search"
                  type="search"
                  placeholder="Descrição, categoria ou quem pagou"
                  autoComplete="off"
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  className={cn(
                    "h-11 w-full rounded-xl border border-border bg-background/80 pl-11 text-sm transition-all",
                    search.trim() && "border-primary/60 bg-primary/5 text-foreground shadow-sm"
                  )}
                  aria-controls="transactions-table"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="startDate" className="text-sm font-semibold">
                    Data inicial
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={event => setStartDate(event.target.value)}
                    className={cn(
                      "h-11 rounded-xl border border-border bg-background/80 text-sm transition-all focus-visible:ring-0 sm:w-44",
                      startDate && "border-primary/60 bg-primary/5 text-foreground shadow-sm"
                    )}
                  />
                </div>
                <div className="flex items-center justify-center pb-2 sm:px-2">
                  <span className="text-xs font-medium text-muted-foreground">até</span>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="endDate" className="text-sm font-semibold">
                    Data final
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={event => setEndDate(event.target.value)}
                    className={cn(
                      "h-11 rounded-xl border border-border bg-background/80 text-sm transition-all focus-visible:ring-0 sm:w-44",
                      endDate && "border-primary/60 bg-primary/5 text-foreground shadow-sm"
                    )}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters}
                  className={cn(
                    "h-11 rounded-xl border px-5 text-sm font-semibold transition-all",
                    hasActiveFilters
                      ? "border-primary/60 bg-primary/10 text-primary hover:bg-primary/20"
                      : "border-dashed border-border text-muted-foreground"
                  )}
                >
                  <FilterX className="mr-2 h-4 w-4" aria-hidden="true" />
                  Limpar filtros
                </Button>
                <div className="relative">
                  <Button
                    ref={createButtonRef}
                    type="button"
                    onClick={() => setAddMenuOpen(!addMenuOpen)}
                    aria-haspopup="menu"
                    aria-expanded={addMenuOpen}
                    className="h-11 rounded-xl"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar transação
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                  {addMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setAddMenuOpen(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setAddMenuOpen(false)
                            handleOpenCreateDialog()
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                        >
                          <Plus className="mr-2 inline h-4 w-4" />
                          Adicionar manualmente
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAddMenuOpen(false)
                            handleOpenUploadDialog()
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-accent"
                        >
                          <Upload className="mr-2 inline h-4 w-4" />
                          Adicionar por imagem
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p id={tableSummaryId} className="text-sm text-muted-foreground" aria-live="polite">
            {resultsSummary}
          </p>
          {selectionSummary && (
            <div className="flex items-center gap-3">
              <p className="text-sm font-medium text-foreground" role="status" aria-live="polite">
                {selectionSummary}
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setBulkQuickEditOpen(true)} disabled={selectedRows.length === 0}>
                  <Pencil className="mr-2 h-3 w-3" />
                  Editar
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setBulkAdvancedEditOpen(true)} disabled={selectedRows.length === 0}>
                  <Pencil className="mr-2 h-3 w-3" />
                  Edição avançada…
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setBulkDeleteOpen(true)}
                  disabled={selectedRows.length === 0}
                >
                  <Trash2 className="mr-2 h-3 w-3" />
                  Excluir
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={handleClearSelection}>
                  <X className="mr-2 h-3 w-3" />
                  Limpar seleção
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-slate-950/80">
          <table
            id="transactions-table"
            className="min-w-full divide-y divide-slate-800 text-slate-100"
            aria-describedby={tableSummaryId}
          >
            <caption id={tableCaptionId} className="px-4 py-2 text-left text-sm text-muted-foreground">
              Tabela de transações compartilhadas
            </caption>
            <thead className="bg-slate-900/60">
              <tr>
                <th
                  scope="col"
                  className="w-12 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={sortedTransactions.length > 0 && selectedRows.length === sortedTransactions.length}
                    onChange={handleToggleAll}
                    className="h-4 w-4 cursor-pointer rounded border border-slate-600 bg-slate-900 accent-indigo-500"
                    aria-label="Selecionar todas as transações visíveis"
                  />
                </th>
                {sortableColumns.map(column => {
                  const isActive = sortField === column.key
                  const alignmentClasses =
                    column.align === "right"
                      ? "justify-end text-right"
                      : "justify-start text-left"
                  return (
                    <th
                      key={column.key}
                      className={cn(
                        "px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400",
                        column.align === "right" ? "text-right" : "text-left"
                      )}
                      scope="col"
                      aria-sort={getSortState(column.key)}
                    >
                      <button
                        type="button"
                        onClick={() => handleSortToggle(column.key)}
                        className={cn(
                          "flex w-full items-center gap-1 text-slate-400 transition-colors hover:text-slate-200",
                          alignmentClasses,
                          isActive && "text-slate-100"
                        )}
                      >
                        <span className={column.labelClassName}>{column.label}</span>
                        {isActive ? renderSortIcon(column.key) : <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden="true" />}
                      </button>
                    </th>
                  )
                })}
                <th
                  scope="col"
                  className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400"
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Carregando transações...
                  </td>
                </tr>
              ) : sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              ) : (
                sortedTransactions.map(transaction => {
                  const isEditing = editRowId === transaction.id
                  return (
                    <tr
                      key={transaction.id}
                      className={cn(
                        "transition-colors hover:bg-slate-900/50",
                        selectedRows.includes(transaction.id) ? "bg-slate-900/70" : ""
                      )}
                      aria-selected={selectedRows.includes(transaction.id)}
                    >
                      <td className="px-4 py-1.5 align-middle whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(transaction.id)}
                            onChange={() => handleToggleRow(transaction.id)}
                            className="h-4 w-4 cursor-pointer rounded border border-slate-600 bg-slate-900 accent-indigo-500"
                            aria-label={`Selecionar ${transaction.description}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-1.5 align-middle">
                        <div className="flex items-center">
                          {isEditing ? (
                            <Input
                              name="description"
                              value={editForm.description}
                              onChange={handleEditInputChange}
                              required
                            />
                          ) : (
                            <span className="text-sm font-semibold text-slate-100">{transaction.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 align-middle text-sm text-slate-300">
                        <div className="flex items-center">
                          {isEditing ? (
                            <div className="w-full">
                              <Input name="category" value={editForm.category} onChange={handleEditInputChange} list="categories-list" />
                              {editForm.category.trim() && !categoriesOptions.includes(editForm.category.trim()) && (
                                <div className="pt-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddCategoryOption(editForm.category)}
                                  >
                                    Adicionar "{editForm.category.trim()}"
                                  </Button>
                                </div>
                              )}
                            </div>
                          ) : (
                            normalizeText(transaction.category) || "—"
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 align-middle text-sm text-slate-300">
                        <div className="flex items-center">
                          {isEditing ? (
                            <Input
                              name="date"
                              type="date"
                              value={editForm.date}
                              onChange={handleEditInputChange}
                              required
                            />
                          ) : (
                            format(parseISO(transaction.date), "dd/MM/yyyy")
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 align-middle">
                        <div className="flex items-center">
                          {isEditing ? (
                            <Input name="paid_by" value={editForm.paid_by} onChange={handleEditInputChange} required />
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-0.5 text-xs font-medium text-indigo-300">
                              {transaction.paid_by}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-right align-middle text-sm text-slate-300 whitespace-nowrap">
                        <div className="flex justify-end">
                          {isEditing ? (
                            <Input name="amount" value={editForm.amount} onChange={handleEditInputChange} />
                          ) : (
                            transaction.amount !== null ? formatCurrency(transaction.amount) : "—"
                          )}
                        </div>
                      </td>
                      <td
                        className={cn(
                          "px-4 py-1.5 text-right align-middle text-sm font-semibold",
                          (transaction.amount_owed ?? 0) < 0 ? "text-red-400" : "text-emerald-400"
                        )}
                      >
                        <div className="flex justify-end">
                          {isEditing ? (
                            <Input
                              name="amount_owed"
                              value={editForm.amount_owed}
                              onChange={handleEditInputChange}
                              required
                            />
                          ) : (
                            formatCurrency(transaction.amount_owed ?? 0)
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-right align-middle">
                        <div className="flex justify-end items-center gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={handleCancelEdit}
                                disabled={editPending}
                                aria-label="Cancelar edição"
                                className="h-8 w-8"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                onClick={() => handleSaveEdit(transaction.id)}
                                disabled={editPending}
                                aria-label="Salvar edição"
                                className="h-8 w-8"
                              >
                                {editPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Save className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleEdit(transaction)}
                                aria-label="Editar transação"
                                className="h-8 w-8"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => handleDelete(transaction.id)}
                                disabled={deletePendingId === transaction.id}
                                aria-label="Excluir transação"
                                className="h-8 w-8"
                              >
                                {deletePendingId === transaction.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
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
      </section>
    </div>
  )
}

