"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTransactions } from "@/hooks/use-transactions"
import { format, isSameMonth, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSupabaseClient, bulkDeleteByIds, bulkUpdateByIds } from "@/lib/supabase"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types"
import { BalanceChart } from "@/components/balance-chart"
import { CategoryPieChart } from "@/components/category-pie-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { CategorySelector, PayerSelector } from "@/components/transaction-selectors"
import { cn, getUserColorClasses } from "@/components/ui/utils"
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

import { simplifyDebts, type Debt } from "@/lib/debt-simplification"

type Transaction = Tables<"shared_transactions">
type TransactionInsert = TablesInsert<"shared_transactions">
type TransactionUpdate = TablesUpdate<"shared_transactions">

const PARTICIPANTS = ["Antônio", "Júlia", "Simões", "Pietro"]

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value)

const toISODate = (value: string) => {
  try {
    return format(parseISO(value), "yyyy-MM-dd")
  } catch {
    return value
  }
}

type SortField = "date" | "description" | "amount" | "participants" | "paid_by" | "category" | "created_at"

type FormState = {
  description: string
  category: string
  paid_by: string
  date: string
  amount: string
  participants: string[]
}

type ExtractedTransaction = {
  description: string
  date: string
  amount: number
  participants: string[]
  paid_by: string
  category: string
}

const initialFormState = (defaultPayer: string = ""): FormState => {
  const today = new Date().toISOString().slice(0, 10)
  return {
    description: "",
    category: "",
    paid_by: defaultPayer,
    date: today,
    amount: "",
    participants: PARTICIPANTS,
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

export const SpreadsheetDashboard = ({ currentUser }: { currentUser: string }) => {
  const supabase = getSupabaseClient()
  const { transactions, loading, error: fetchError, updateCache, reload } = useTransactions()
  const [localError, setLocalError] = useState<string | null>(null)
  const error = localError || fetchError
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [createForm, setCreateForm] = useState<FormState>(() => initialFormState(currentUser))
  // const [createOnlyBalance, setCreateOnlyBalance] = useState(false) // Deprecated
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
  const [editForm, setEditForm] = useState<FormState>(() => initialFormState(currentUser))
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
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20
  const createFirstFieldRef = useRef<HTMLInputElement>(null)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const createDialogTitleId = "create-transaction-title"
  const createDialogDescriptionId = "create-transaction-description"
  const tableCaptionId = "transactions-table-caption"
  const tableSummaryId = "transactions-table-summary"

  // Helper to clear local error
  const setError = (err: string | null) => setLocalError(err)

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
    // First filter by user involvement (paid or participated)
    const userTransactions = transactions.filter(t => {
      const isPayer = t.paid_by === currentUser
      const isParticipant = (t.participants ?? []).includes(currentUser)
      return isPayer || isParticipant
    })

    // Then apply search and date filters
    const searchValue = search.trim().toLowerCase()
    const start = startDate ? parseISO(startDate) : null
    const end = endDate ? parseISO(endDate) : null
    return userTransactions.filter(transaction => {
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
  }, [transactions, currentUser, search, startDate, endDate])

  const sortedTransactions = useMemo(() => {
    const copy = [...filteredTransactions]
    copy.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortField === "amount") {
        const first = (a[sortField] ?? 0) as number
        const second = (b[sortField] ?? 0) as number
        return (first - second) * direction
      }
      if (sortField === "date" || sortField === "created_at") {
        const first = parseISO(a[sortField])
        const second = parseISO(b[sortField])
        return (first.getTime() - second.getTime()) * direction
      }
      if (sortField === "participants") {
        const first = a.participants ?? []
        const second = b.participants ?? []
        const firstStr = first.sort().join(", ").toLowerCase()
        const secondStr = second.sort().join(", ").toLowerCase()
        if (firstStr < secondStr) return -1 * direction
        if (firstStr > secondStr) return 1 * direction
        return 0
      }

      const first = normalizeText(a[sortField as "description" | "category" | "paid_by"]).toLowerCase()
      const second = normalizeText(b[sortField as "description" | "category" | "paid_by"]).toLowerCase()
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

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedTransactions.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedTransactions, currentPage])

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, startDate, endDate])

  const hasActiveFilters = useMemo(() => {
    return Boolean(search.trim() || startDate || endDate)
  }, [search, startDate, endDate])

  const createAmountValue = useMemo(() => {
    return normalizeNumber(createForm.amount)
  }, [createForm.amount])

  const createAmountInvalid = createForm.amount.trim().length > 0 && createAmountValue === null

  const isCreateFormValid = useMemo(() => {
    const descriptionValid = createForm.description.trim().length > 0
    const paidByValid = PARTICIPANTS.includes(createForm.paid_by)
    const dateValid = createForm.date.length > 0
    const amountValid = normalizeNumber(createForm.amount) !== null
    const participantsValid = createForm.participants.length > 0
    return descriptionValid && paidByValid && dateValid && amountValid && participantsValid
  }, [createForm])

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

  const calculateUserShare = useMemo(() => {
    return (transaction: Transaction) => {
      const participants = transaction.participants ?? []
      if (participants.length === 0) return 0
      if (!participants.includes(currentUser)) return 0
      return (transaction.amount ?? 0) / participants.length
    }
  }, [currentUser])

  const netBalance = useMemo(() => {
    return sortedTransactions.reduce((total, transaction) => total + (transaction.amount_owed ?? 0), 0)
  }, [sortedTransactions])

  const totalAmount = useMemo(() => {
    return sortedTransactions.reduce((total, transaction) => {
      if (transaction.paid_by === currentUser) {
        return total + (transaction.amount ?? 0)
      }
      return total
    }, 0)
  }, [sortedTransactions, currentUser])

  const currentMonthStats = useMemo(() => {
    const currentDate = new Date()
    let total = 0
    let totalAmountInMonth = 0
    let count = 0
    sortedTransactions.forEach(transaction => {
      if (isSameMonth(parseISO(transaction.date), currentDate)) {
        total += transaction.amount_owed ?? 0
        if (transaction.paid_by === currentUser) {
          totalAmountInMonth += (transaction.amount ?? 0)
        }
        count += 1
      }
    })
    return { total, totalAmountInMonth, count }
  }, [sortedTransactions, currentUser])

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    sortedTransactions.forEach(transaction => {
      if (transaction.paid_by === currentUser) {
        const key = normalizeText(transaction.category) || "Sem categoria"
        const amount = transaction.amount ?? 0
        map.set(key, (map.get(key) ?? 0) + amount)
      }
    })
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((first, second) => first.category.localeCompare(second.category, "pt-BR"))
  }, [sortedTransactions, currentUser])

  const totalCategoryAmount = useMemo(() => {
    if (categoryTotals.length === 0) {
      return 0
    }
    return categoryTotals.reduce((total, item) => total + item.total, 0)
  }, [categoryTotals])

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
    if (transactions.length === 0) {
      return []
    }

    // Get all unique dates from transactions sorted chronologically
    const allDates = Array.from(
      new Set(transactions.map(t => t.date))
    ).sort((a, b) => parseISO(a).getTime() - parseISO(b).getTime())

    // Calculate cumulative balance at each date
    return allDates.map(date => {
      // Get all transactions up to and including this date
      const transactionsUpToDate = transactions.filter(
        t => parseISO(t.date).getTime() <= parseISO(date).getTime()
      )

      // Calculate simplified debts for this point in time
      const transactionsForDebt = transactionsUpToDate.map(t => ({
        paid_by: t.paid_by,
        amount: t.amount ?? 0,
        participants: t.participants ?? ["Antônio", "Júlia"]
      }))

      const debts = simplifyDebts(transactionsForDebt)
      const myDebtsAtDate = debts.filter(d => d.from === currentUser || d.to === currentUser)

      // Calculate balance at this date
      const balanceAtDate = myDebtsAtDate.reduce((acc, debt) => {
        if (debt.from === currentUser) return acc - debt.amount
        if (debt.to === currentUser) return acc + debt.amount
        return acc
      }, 0)

      return {
        date,
        balance: Number(balanceAtDate.toFixed(2))
      }
    })
  }, [transactions, currentUser])

  const simplifiedDebts = useMemo(() => {
    const allTransactions = transactions.map(t => ({
      paid_by: t.paid_by,
      amount: t.amount ?? 0,
      participants: t.participants ?? ["Antônio", "Júlia"] // Default for legacy
    }))
    return simplifyDebts(allTransactions)
  }, [transactions])

  const myDebts = simplifiedDebts.filter(d => d.from === currentUser || d.to === currentUser)

  const totalBalance = useMemo(() => {
    return myDebts.reduce((acc, debt) => {
      if (debt.from === currentUser) return acc - debt.amount
      if (debt.to === currentUser) return acc + debt.amount
      return acc
    }, 0)
  }, [myDebts, currentUser])



  const handleSortToggle = (field: SortField) => {
    setCurrentPage(1)
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

    const isParticipant = createForm.participants.includes(currentUser)
    const isPayer = createForm.paid_by === currentUser

    if (!isParticipant && !isPayer) {
      setError("Você não pode criar uma transação na qual não está envolvido (pagando ou participando).")
      setCreatePending(false)
      return
    }

    const payload: TransactionInsert = {
      description: createForm.description.trim(),
      category: createForm.category.trim() || null,
      paid_by: createForm.paid_by.trim(),
      date: createForm.date,
      amount: createAmountValue,
      participants: createForm.participants
    }
    const { data, error: insertError } = await supabase
      .from("shared_transactions")
      .insert(payload)
      .select("*")
      .single()
    if (insertError) {
      setError(insertError.message)
    } else if (data) {
      updateCache(previous => [data, ...previous])
      setCreateForm(initialFormState(currentUser))
      setCreateDialogOpen(false)
    }
    setCreatePending(false)
  }

  const handleOpenCreateDialog = () => {
    setCreateForm(initialFormState(currentUser))
    setError(null)
    setCreateDialogOpen(true)
  }

  const handleCloseCreateDialog = () => {
    if (createPending) {
      return
    }
    setCreateDialogOpen(false)
    setError(null)
    setCreateForm(initialFormState(currentUser))
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
      participants: transaction.participants ?? PARTICIPANTS
    })
  }

  const handleCancelEdit = () => {
    setEditRowId(null)
    setEditForm(initialFormState(currentUser))
  }

  const handleSaveEdit = async (transactionId: string) => {
    setEditPending(true)
    setError(null)

    const isParticipant = editForm.participants.includes(currentUser)
    const isPayer = editForm.paid_by === currentUser

    if (!isParticipant && !isPayer) {
      setError("Você não pode editar uma transação para não estar mais envolvido nela.")
      setEditPending(false)
      return
    }
    const amountValue = normalizeNumber(editForm.amount)
    const updatePayload: TransactionUpdate = {
      description: editForm.description.trim(),
      category: editForm.category.trim() || null,
      paid_by: editForm.paid_by.trim(),
      date: editForm.date,
      amount: amountValue,
      participants: editForm.participants
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
      updateCache(previous =>
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
    setCreateForm(previous => ({ ...previous, [name]: value }))
  }

  const handlePaidByChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setCreateForm(previous => ({ ...previous, paid_by: value }))
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
    updateCache(previous => previous.filter(item => item.id !== transactionId))
    setSelectedRows(previous => previous.filter(item => item !== transactionId))
    if (editRowId === transactionId) {
      setEditRowId(null)
      setEditForm(initialFormState(currentUser))
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
        participants: PARTICIPANTS,
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
          return { ...t, [field]: value }
        }
        return t
      })
    )
  }

  const handleSaveExtractedTransactions = async () => {
    const invalidTransactions = extractedTransactions.filter(
      t => !t.description.trim() || !PARTICIPANTS.includes(t.paid_by) || !t.date
    )
    if (invalidTransactions.length > 0) {
      setError("Preencha todos os campos obrigatórios (descrição, data e pago por) em todas as transações")
      return
    }

    const uninvolvedTransactions = extractedTransactions.filter(t => {
      const isPayer = t.paid_by === currentUser
      const isParticipant = t.participants.includes(currentUser)
      return !isPayer && !isParticipant
    })

    if (uninvolvedTransactions.length > 0) {
      setError("Você não pode salvar transações nas quais não está envolvido (pagando ou participando).")
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
        participants: t.participants
      }))
      const { data, error: insertError } = await supabase
        .from("shared_transactions")
        .insert(payloads)
        .select("*")
      if (insertError) {
        setError(insertError.message)
      } else if (data) {
        updateCache(previous => [...data, ...previous])
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
    await reload()
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
    await reload()
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
    await reload()
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
    { key: "participants", label: "Participantes", align: "right" }
  ]

  return (
    <div className="space-y-8">

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="space-y-1">
            <CardTitle>Saldo Total</CardTitle>
            <p className="text-sm text-muted-foreground">Balanço geral de dívidas</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className={cn("text-3xl font-semibold", totalBalance >= 0 ? "text-green-600" : "text-destructive")}>
              {formatCurrency(totalBalance)}
            </p>
            <p className="text-sm text-muted-foreground">
              {totalBalance > 0 ? "Você tem a receber" : totalBalance < 0 ? "Você deve no total" : "Tudo quitado"}
            </p>
          </CardContent>
        </Card>

        <Card className="md:row-span-2 flex flex-col">
          <CardHeader className="space-y-1">
            <CardTitle>Total por categoria</CardTitle>
            <p className="text-sm text-muted-foreground">Inclui lançamentos sem categoria</p>
          </CardHeader>
          <CardContent className="flex-1 p-6 pt-0 flex items-center justify-center">
            <CategoryPieChart data={categoryTotals} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Total gasto</CardTitle>
            <p className="text-sm text-muted-foreground">Soma dos valores totais no período visível</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>{`Total gasto em ${monthLabel}`}</CardTitle>
            <p className="text-sm text-muted-foreground">Soma de valores totais no mês atual</p>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-3xl font-semibold">{formatCurrency(currentMonthStats.totalAmountInMonth)}</p>
            <p className="text-sm text-muted-foreground">
              {currentMonthStats.count === 1
                ? "1 lançamento no mês"
                : `${currentMonthStats.count} lançamentos no mês`}
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <BalanceChart series={chartSeries} currentUser={currentUser} />
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
                  <CategorySelector
                    value={createForm.category}
                    onChange={(value) => setCreateForm(prev => ({ ...prev, category: value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_by">Pago por</Label>
                  <PayerSelector
                    value={createForm.paid_by}
                    onChange={(value) => setCreateForm(prev => ({ ...prev, paid_by: value }))}
                    currentUser={currentUser}
                  />
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
                  <Label>Participantes</Label>
                  <div className="flex flex-wrap gap-2">
                    {PARTICIPANTS.map(participant => {
                      const isSelected = createForm.participants.includes(participant)
                      return (
                        <label
                          key={participant}
                          className={cn(
                            "flex items-center gap-1.5 cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 border",
                            isSelected
                              ? getUserColorClasses(participant)
                              : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setCreateForm(prev => {
                                const current = prev.participants
                                if (checked) return { ...prev, participants: [...current, participant] }
                                return { ...prev, participants: current.filter(p => p !== participant) }
                              })
                            }}
                            className="sr-only"
                          />
                          {participant}
                        </label>
                      )
                    })}
                  </div>
                  {createForm.participants.length === 0 && (
                    <p className="text-xs text-destructive">Selecione pelo menos um participante</p>
                  )}
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
        </div >
      )}

      {
        uploadDialogOpen && (
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
                                <PayerSelector
                                  value={transaction.paid_by}
                                  onChange={(value) => handleUpdateExtractedTransaction(index, "paid_by", value)}
                                  currentUser={currentUser}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Participantes</Label>
                                <div className="text-xs text-muted-foreground">
                                  {transaction.participants.join(", ")}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor={`category-${index}`}>Categoria</Label>
                                <div>
                                  <CategorySelector
                                    value={transaction.category}
                                    onChange={(value) => handleUpdateExtractedTransaction(index, "category", value)}
                                  />
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
        )
      }

      {
        bulkDeleteOpen && (
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
        )
      }

      {
        bulkQuickEditOpen && (
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
                      <CategorySelector
                        value={quickValue}
                        onChange={(value) => setQuickValue(value)}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="quick-paid-by">Pago por</Label>
                      <PayerSelector
                        value={quickValue}
                        onChange={(value) => setQuickValue(value)}
                        currentUser={currentUser}
                      />
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
        )
      }

      {
        bulkAdvancedEditOpen && (
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
                    <CategorySelector
                      value={advancedCategory}
                      onChange={(value) => setAdvancedCategory(value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adv-paid-by">Pago por</Label>
                    <PayerSelector
                      value={advancedPaidBy}
                      onChange={(value) => setAdvancedPaidBy(value)}
                      currentUser={currentUser}
                    />
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
        )
      }

      <section className="space-y-4">
        <div className="rounded-2xl border border-border bg-black/40 p-6 shadow-sm backdrop-blur-xl">
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
                    "h-11 w-full rounded-xl border border-border bg-black/20 pl-11 text-sm transition-all backdrop-blur-sm",
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
                      "h-11 rounded-xl border border-border bg-black/20 text-sm transition-all focus-visible:ring-0 backdrop-blur-sm sm:w-44",
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
                      "h-11 rounded-xl border border-border bg-black/20 text-sm transition-all focus-visible:ring-0 backdrop-blur-sm sm:w-44",
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
                      <div className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-black/80 shadow-lg backdrop-blur-xl">
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

        <div className="overflow-x-auto rounded-2xl border border-border bg-black/40 backdrop-blur-xl">
          <table
            id="transactions-table"
            className="min-w-full divide-y divide-border text-foreground"
            aria-describedby={tableSummaryId}
          >
            <caption id={tableCaptionId} className="px-4 py-2 text-left text-sm text-muted-foreground">
              Tabela de transações compartilhadas
            </caption>
            <thead className="bg-muted/50">
              <tr>
                <th
                  scope="col"
                  className="w-12 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={sortedTransactions.length > 0 && selectedRows.length === sortedTransactions.length}
                    onChange={handleToggleAll}
                    className="h-4 w-4 cursor-pointer rounded border border-input bg-background accent-primary"
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
                        "px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground",
                        column.align === "right" ? "text-right" : "text-left"
                      )}
                      scope="col"
                      aria-sort={getSortState(column.key)}
                    >
                      <button
                        type="button"
                        onClick={() => handleSortToggle(column.key)}
                        className={cn(
                          "flex w-full items-center gap-1 text-muted-foreground transition-colors hover:text-foreground",
                          alignmentClasses,
                          isActive && "text-foreground"
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
                  className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
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
                paginatedTransactions.map(transaction => {
                  const isEditing = editRowId === transaction.id
                  return (
                    <tr
                      key={transaction.id}
                      className={cn(
                        "transition-all duration-200",
                        isEditing
                          ? "bg-primary/5 ring-1 ring-inset ring-primary/20"
                          : "hover:bg-muted/50",
                        selectedRows.includes(transaction.id) && !isEditing ? "bg-muted/70" : ""
                      )}
                      aria-selected={selectedRows.includes(transaction.id)}
                    >
                      <td className="px-4 py-2 align-middle whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedRows.includes(transaction.id)}
                            onChange={() => handleToggleRow(transaction.id)}
                            className="h-4 w-4 cursor-pointer rounded border border-input bg-background accent-primary"
                            aria-label={`Selecionar ${transaction.description}`}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center">
                          {isEditing ? (
                            <Input
                              name="description"
                              value={editForm.description}
                              onChange={handleEditInputChange}
                              required
                              className="h-9 rounded-lg border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:bg-background"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-foreground">{transaction.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle text-sm text-muted-foreground">
                        <div className="flex items-center">
                          {isEditing ? (
                            <div className="w-full min-w-[140px]">
                              <CategorySelector
                                value={editForm.category}
                                onChange={(value) => setEditForm(prev => ({ ...prev, category: value }))}
                              />
                            </div>
                          ) : (
                            normalizeText(transaction.category) || "—"
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle text-sm text-muted-foreground">
                        <div className="flex items-center">
                          {isEditing ? (
                            <Input
                              name="date"
                              type="date"
                              value={editForm.date}
                              onChange={handleEditInputChange}
                              required
                              className="h-9 rounded-lg border-border/50 bg-background/80 backdrop-blur-sm focus:border-primary/50 focus:bg-background"
                            />
                          ) : (
                            format(parseISO(transaction.date), "dd/MM/yyyy")
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 align-middle">
                        <div className="flex items-center">
                          {isEditing ? (
                            <div className="min-w-[130px]">
                              <PayerSelector
                                value={editForm.paid_by}
                                onChange={(value) => setEditForm(prev => ({ ...prev, paid_by: value }))}
                                currentUser={currentUser}
                              />
                            </div>
                          ) : (
                            <span className={cn(
                              "inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium",
                              getUserColorClasses(transaction.paid_by)
                            )}>
                              {transaction.paid_by}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right align-middle text-sm text-muted-foreground whitespace-nowrap">
                        <div className="flex justify-end">
                          {isEditing ? (
                            <Input
                              name="amount"
                              value={editForm.amount}
                              onChange={handleEditInputChange}
                              inputMode="decimal"
                              placeholder="0,00"
                              className="h-9 w-28 rounded-lg border-border/50 bg-background/80 text-right backdrop-blur-sm focus:border-primary/50 focus:bg-background"
                            />
                          ) : (
                            transaction.amount !== null ? formatCurrency(transaction.amount) : "—"
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right align-middle text-sm text-muted-foreground">
                        <div className="flex justify-end gap-1.5 flex-wrap">
                          {isEditing ? (
                            <div className="flex flex-wrap gap-2 justify-end">
                              {PARTICIPANTS.map(p => {
                                const isSelected = editForm.participants.includes(p)
                                return (
                                  <label
                                    key={p}
                                    className={cn(
                                      "flex items-center gap-1.5 cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 border",
                                      isSelected
                                        ? getUserColorClasses(p)
                                        : "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50"
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        const checked = e.target.checked
                                        setEditForm(prev => {
                                          const current = prev.participants
                                          if (checked) return { ...prev, participants: [...current, p] }
                                          return { ...prev, participants: current.filter(x => x !== p) }
                                        })
                                      }}
                                      className="sr-only"
                                    />
                                    {p}
                                  </label>
                                )
                              })}
                            </div>
                          ) : (
                            (transaction.participants ?? []).map(p => (
                              <span
                                key={p}
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                                  getUserColorClasses(p)
                                )}
                              >
                                {p}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right align-middle">
                        <div className="flex justify-end items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEdit}
                                disabled={editPending}
                                aria-label="Cancelar edição"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                onClick={() => handleSaveEdit(transaction.id)}
                                disabled={editPending}
                                aria-label="Salvar edição"
                                className="h-8 w-8 rounded-lg bg-green-600 hover:bg-green-500 text-white shadow-sm"
                              >
                                {editPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(transaction)}
                                aria-label="Editar transação"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(transaction.id)}
                                disabled={deletePendingId === transaction.id}
                                aria-label="Excluir transação"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                {deletePendingId === transaction.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3.5 w-3.5" />
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pb-8">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div >
  )
}

