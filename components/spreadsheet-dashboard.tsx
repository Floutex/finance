"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTransactions } from "@/hooks/use-transactions"
import { format, isSameMonth, parseISO, subMonths, subYears } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSupabaseClient, bulkDeleteByIds, bulkUpdateByIds, getMonthlyIncomes } from "@/lib/supabase"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types"
import { BalanceChart } from "@/components/balance-chart"
import { CategoryPieChart } from "@/components/category-pie-chart"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { CategorySelector, PayerSelector } from "@/components/transaction-selectors"
import { cn, getUserColorClasses } from "@/components/ui/utils"
import { AnimatedNumber } from "@/components/ui/animated-number"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  FilterX,
  HandCoins,
  Image as ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Trash2,
  TrendingUp,
  Upload,
  Wallet,
  X
} from "lucide-react"

import { simplifyDebts } from "@/lib/debt-simplification"
import { buildIncomeMap, calculateShares } from "@/lib/proportional-split"

type Transaction = Tables<"shared_transactions">
type TransactionInsert = TablesInsert<"shared_transactions">
type TransactionUpdate = TablesUpdate<"shared_transactions">

const PARTICIPANTS = ["Antônio", "Júlia", "Simões", "Pietro"]

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
const formatCurrency = (value: number) => currencyFormatter.format(value)

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

type RequestFormState = {
  description: string
  amount: string
  date: string
  pix: string
}

type ExtractedTransaction = {
  description: string
  date: string
  amount: number
  participants: string[]
  paid_by: string
  category: string
}

const WEBHOOK_URLS: Record<string, string> = {
  "Antônio": "https://services.leadconnectorhq.com/hooks/YUrVxIRna26XgFlMZ5Kb/webhook-trigger/9479827a-15d2-4333-94e1-191bb60427f7",
  "Júlia": "https://services.leadconnectorhq.com/hooks/YUrVxIRna26XgFlMZ5Kb/webhook-trigger/7e0cf1a9-ddf9-468a-b301-851ac515a4d0",
  "Pietro": "https://services.leadconnectorhq.com/hooks/YUrVxIRna26XgFlMZ5Kb/webhook-trigger/b9a11147-a9e5-42d5-9c7d-dc1533b1e739",
  "Simões": "https://services.leadconnectorhq.com/hooks/YUrVxIRna26XgFlMZ5Kb/webhook-trigger/88fae391-8944-46b6-b9af-34bdc9a53ef2"
}

const PENDING_MARKER = "__PENDENTE__"

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
  const [activeRange, setActiveRange] = useState<"1M" | "3M" | "6M" | "1A" | "ALL" | null>(null)
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

  // Money Request state
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestForm, setRequestForm] = useState<RequestFormState>({ description: "", amount: "", date: new Date().toISOString().slice(0, 10), pix: "" })
  const [requestPending, setRequestPending] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const requestFirstFieldRef = useRef<HTMLInputElement>(null)

  // Monthly incomes for proportional split
  const [monthlyIncomesRaw, setMonthlyIncomesRaw] = useState<Tables<"monthly_incomes">[]>([])

  useEffect(() => {
    const loadIncomes = async () => {
      const { data } = await getMonthlyIncomes()
      if (data) setMonthlyIncomesRaw(data)
    }
    loadIncomes()
  }, [])

  const incomeMap = useMemo(() => {
    const months = new Set(transactions.map(t => t.date.slice(0, 7)))
    return buildIncomeMap(monthlyIncomesRaw, Array.from(months))
  }, [monthlyIncomesRaw, transactions])

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

  // Pending money requests (visible to all)
  const pendingRequests = useMemo(() => {
    return transactions.filter(t => t.paid_by === PENDING_MARKER)
  }, [transactions])

  const userTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Skip pending requests — they are shown separately
      if (t.paid_by === PENDING_MARKER) return false
      // Antônio vê tudo (admin/dev mode implied)
      if (currentUser === "Antônio") return true
      const isPayer = t.paid_by === currentUser
      const isParticipant = (t.participants ?? []).includes(currentUser)
      return isPayer || isParticipant
    })
  }, [transactions, currentUser])

  const filteredTransactions = useMemo(() => {
    // Apply search and date filters
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
  }, [userTransactions, search, startDate, endDate])

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
        const first = [...(a.participants ?? [])]
        const second = [...(b.participants ?? [])]
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
    setActiveRange(null)
    searchInputRef.current?.focus()
  }

  // Date range boundaries from all transactions
  const dateRange = useMemo(() => {
    if (userTransactions.length === 0) return { min: "", max: "" }
    const dates = userTransactions.map(t => t.date).sort()
    return { min: dates[0], max: dates[dates.length - 1] }
  }, [userTransactions])

  const applyQuickRange = useCallback((range: "1M" | "3M" | "6M" | "1A" | "ALL") => {
    if (!dateRange.max) return
    const lastDate = parseISO(dateRange.max)
    const firstDate = parseISO(dateRange.min)

    if (range === "ALL") {
      setStartDate("")
      setEndDate("")
      setActiveRange(range)
      return
    }
    let computedStart = firstDate
    if (range === "1M") computedStart = subMonths(lastDate, 1)
    else if (range === "3M") computedStart = subMonths(lastDate, 3)
    else if (range === "6M") computedStart = subMonths(lastDate, 6)
    else if (range === "1A") computedStart = subYears(lastDate, 1)
    if (computedStart < firstDate) computedStart = firstDate
    setStartDate(format(computedStart, "yyyy-MM-dd"))
    setEndDate(format(lastDate, "yyyy-MM-dd"))
    setActiveRange(range)
  }, [dateRange])

  const handleStartDateChange = useCallback((value: string) => {
    setActiveRange(null)
    setStartDate(value)
    setEndDate(prev => (!prev || (value && prev < value)) ? value : prev)
  }, [])

  const handleEndDateChange = useCallback((value: string) => {
    setActiveRange(null)
    setEndDate(value)
    setStartDate(prev => (!prev || (value && prev > value)) ? value : prev)
  }, [])
  const handleClearSelection = () => {
    setSelectedRows([])
  }

  const calculateUserShare = useMemo(() => {
    return (transaction: Transaction) => {
      const participants = transaction.participants ?? []
      if (participants.length === 0) return 0
      if (!participants.includes(currentUser)) return 0
      const yearMonth = transaction.date.slice(0, 7)
      const monthIncomes = incomeMap.get(yearMonth)
      const shares = calculateShares(
        { amount: transaction.amount ?? 0, participants },
        monthIncomes
      )
      return shares.get(currentUser) ?? (transaction.amount ?? 0) / participants.length
    }
  }, [currentUser, incomeMap])

  const netBalance = useMemo(() => {
    return sortedTransactions.reduce((total, transaction) => total + (transaction.amount_owed ?? 0), 0)
  }, [sortedTransactions])

  const periodStats = useMemo(() => {
    let mySpend = 0
    let totalSpend = 0
    sortedTransactions.forEach(transaction => {
      totalSpend += (transaction.amount ?? 0)
      if (transaction.paid_by === currentUser) {
        mySpend += (transaction.amount ?? 0)
      }
    })
    return { mySpend, totalSpend }
  }, [sortedTransactions, currentUser])

  const currentMonthStats = useMemo(() => {
    const currentDate = new Date()
    let mySpend = 0
    let totalSpend = 0
    let count = 0

    // Usa userTransactions para garantir que mostramos o mês atual
    // independentemente dos filtros de data selecionados na tabela
    userTransactions.forEach(transaction => {
      if (isSameMonth(parseISO(transaction.date), currentDate)) {
        totalSpend += (transaction.amount ?? 0)
        if (transaction.paid_by === currentUser) {
          mySpend += (transaction.amount ?? 0)
        }
        count += 1
      }
    })
    return { mySpend, totalSpend, count }
  }, [userTransactions, currentUser])

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

  // Gastos por categoria geral (todos os usuários, não apenas o currentUser)
  const globalCategoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    sortedTransactions.forEach(transaction => {
      const key = normalizeText(transaction.category) || "Sem categoria"
      const amount = transaction.amount ?? 0
      map.set(key, (map.get(key) ?? 0) + amount)
    })
    return Array.from(map.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((first, second) => second.total - first.total)
  }, [sortedTransactions])

  const totalGlobalCategoryAmount = useMemo(() => {
    return globalCategoryTotals.reduce((total, item) => total + item.total, 0)
  }, [globalCategoryTotals])

  // Maiores transações no período
  const topTransactions = useMemo(() => {
    const top = [...sortedTransactions]
      .sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))
      .slice(0, 10)
    return top.map(t => ({
      category: normalizeText(t.description) || "Sem descrição",
      total: t.amount ?? 0
    }))
  }, [sortedTransactions])

  const totalTopTransactions = useMemo(() => {
    return topTransactions.reduce((total, item) => total + item.total, 0)
  }, [topTransactions])

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

    // Sort transactions chronologically
    const sorted = [...transactions].sort(
      (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
    )

    // Calculate incremental balance: for each transaction, compute how it
    // affects the current user's net balance (positive = owed to user, negative = user owes)
    let runningBalance = 0
    const dateBalanceMap = new Map<string, number>()

    for (const t of sorted) {
      const participants = t.participants ?? ["Antônio", "Júlia"]
      const amount = t.amount ?? 0
      if (participants.length === 0) continue

      const yearMonth = t.date.slice(0, 7)
      const monthIncomes = incomeMap.get(yearMonth)
      const shares = calculateShares({ amount, participants }, monthIncomes)
      const myShare = shares.get(currentUser) ?? (amount / participants.length)

      const userIsParticipant = participants.includes(currentUser)
      const userIsPayer = t.paid_by === currentUser

      if (userIsPayer && userIsParticipant) {
        runningBalance += amount - myShare
      } else if (userIsPayer && !userIsParticipant) {
        runningBalance += amount
      } else if (!userIsPayer && userIsParticipant) {
        runningBalance -= myShare
      }

      dateBalanceMap.set(t.date, runningBalance)
    }

    return Array.from(dateBalanceMap.entries()).map(([date, balance]) => ({
      date,
      balance: Number(balance.toFixed(2))
    }))
  }, [transactions, currentUser, incomeMap])

  const simplifiedDebts = useMemo(() => {
    const allTransactions = transactions.map(t => ({
      paid_by: t.paid_by,
      amount: t.amount ?? 0,
      participants: t.participants ?? ["Antônio", "Júlia"],
      date: t.date
    }))
    return simplifyDebts(allTransactions, incomeMap)
  }, [transactions, incomeMap])

  const myDebts = simplifiedDebts.filter(d => d.from === currentUser || d.to === currentUser)

  const totalBalance = useMemo(() => {
    return myDebts.reduce((acc, debt) => {
      if (debt.from === currentUser) return acc - debt.amount
      if (debt.to === currentUser) return acc + debt.amount
      return acc
    }, 0)
  }, [myDebts, currentUser])


  // ---- Money Request handlers ----

  useEffect(() => {
    if (!requestDialogOpen) return
    const frame = requestAnimationFrame(() => {
      requestFirstFieldRef.current?.focus()
    })
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      cancelAnimationFrame(frame)
      document.body.style.overflow = previousOverflow
    }
  }, [requestDialogOpen])

  const handleOpenRequestDialog = () => {
    setRequestForm({ description: "", amount: "", date: new Date().toISOString().slice(0, 10), pix: "" })
    setError(null)
    setRequestDialogOpen(true)
  }

  const handleCloseRequestDialog = () => {
    if (requestPending) return
    setRequestDialogOpen(false)
    setError(null)
    setRequestForm({ description: "", amount: "", date: new Date().toISOString().slice(0, 10), pix: "" })
  }

  const handleRequestDialogKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !requestPending) {
      event.stopPropagation()
      handleCloseRequestDialog()
    }
  }

  const requestAmountValue = useMemo(() => normalizeNumber(requestForm.amount), [requestForm.amount])
  const isRequestFormValid = useMemo(() => {
    return requestForm.description.trim().length > 0 && requestAmountValue !== null && requestForm.date.length > 0
  }, [requestForm, requestAmountValue])

  const handleSubmitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setRequestPending(true)
    setError(null)

    const amountVal = requestAmountValue
    if (amountVal === null) {
      setError("Valor inválido")
      setRequestPending(false)
      return
    }

    // 1. Create the transaction in Supabase with paid_by = PENDING_MARKER
    const description = `💰 ${requestForm.description.trim()}${requestForm.pix.trim() ? ` | PIX: ${requestForm.pix.trim()}` : ""}`
    const payload: TransactionInsert = {
      description: description,
      category: "Solicitação",
      paid_by: PENDING_MARKER,
      date: requestForm.date,
      amount: amountVal,
      participants: [currentUser]
    }
    const { data, error: insertError } = await supabase
      .from("shared_transactions")
      .insert(payload)
      .select("*")
      .single()
    if (insertError) {
      setError(insertError.message)
      setRequestPending(false)
      return
    }
    if (data) {
      updateCache(previous => [data, ...previous])
    }

    // 2. Send the webhook (fire and forget, don't block the UX)
    const webhookPayload = {
      type: "money_request",
      requested_by: currentUser,
      paid_by: "",
      description: requestForm.description.trim(),
      pix: requestForm.pix.trim(),
      amount: amountVal,
      date: requestForm.date,
      transaction_id: data?.id ?? null,
      timestamp: new Date().toISOString()
    }
    const targets = PARTICIPANTS.filter(p => p !== currentUser)
    Promise.all(targets.map(target => {
      const url = WEBHOOK_URLS[target]
      if (!url) return Promise.resolve()
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookPayload)
      }).catch(() => { })
    }))

    setRequestForm({ description: "", amount: "", date: new Date().toISOString().slice(0, 10), pix: "" })
    setRequestDialogOpen(false)
    setRequestPending(false)
  }

  const handleMarkAsPaid = async (transactionId: string) => {
    setMarkingPaidId(transactionId)
    setError(null)
    const updatePayload: TransactionUpdate = {
      paid_by: currentUser,
    }
    const { data, error: updateError } = await supabase
      .from("shared_transactions")
      .update(updatePayload)
      .eq("id", transactionId)
      .select("*")
      .single()
    if (updateError) {
      setError(updateError.message)
      setMarkingPaidId(null)
      return
    }
    if (data) {
      updateCache(previous =>
        previous.map(item => {
          if (item.id === transactionId) return data
          return item
        })
      )

      // Send webhook notification for payment
      const webhookPayload = {
        type: "money_request_paid",
        requested_by: (data.participants ?? [])[0] ?? "Desconhecido",
        paid_by: currentUser,
        description: data.description,
        pix: "",
        amount: data.amount,
        date: data.date,
        transaction_id: transactionId,
        timestamp: new Date().toISOString()
      }

      Promise.all(PARTICIPANTS.map(target => {
        const url = WEBHOOK_URLS[target]
        if (!url) return Promise.resolve()
        return fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload)
        }).catch(() => { })
      }))
    }
    setMarkingPaidId(null)
  }

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
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return

    const isAntonio = currentUser === "Antônio"
    const isPayer = transaction.paid_by === currentUser

    if (!isAntonio && !isPayer) {
      setError("Você só pode deletar transações que você pagou.")
      return
    }

    setDeletePendingId(transactionId)
    setError(null)
    const { error: deleteError } = await supabase
      .from("shared_transactions")
      .update({ is_hidden: true })
      .eq("id", transactionId)

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

    const transactionsToDelete = transactions.filter(t => selectedRows.includes(t.id))
    const isAntonio = currentUser === "Antônio"
    const unauthorized = transactionsToDelete.filter(t => !isAntonio && t.paid_by !== currentUser)

    if (unauthorized.length > 0) {
      setBulkError(`Você não pode deletar ${unauthorized.length} transações selecionadas pois não foi você quem pagou.`)
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

      <div className="space-y-6">
        {/* ── Global Date Range Selector ── */}
        <div className="flex flex-col gap-4 rounded-2xl border border-border/50 bg-black/20 p-4 backdrop-blur-xl animate-fade-in sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Período do Dashboard</span>
              <p className="text-xs text-muted-foreground">Selecione o período para visualizar todos os dados</p>
            </div>
            <nav className="flex flex-wrap items-center gap-2" aria-label="Filtros rápidos de período">
              <div className="flex flex-wrap gap-1.5 rounded-full bg-muted/50 p-1">
                {(["1M", "3M", "6M", "1A", "ALL"] as const).map(range => (
                  <Button
                    key={range}
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-pressed={activeRange === range}
                    className={cn(
                      "h-8 rounded-full px-3 text-xs font-semibold transition",
                      activeRange === range
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => applyQuickRange(range)}
                  >
                    {range === "ALL" ? "Tudo" : range}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={!startDate && !endDate && !activeRange}
                onClick={() => { setStartDate(""); setEndDate(""); setActiveRange(null) }}
                className={cn(
                  "h-8 rounded-full border px-3 text-xs font-semibold transition",
                  (startDate || endDate || activeRange)
                    ? "border-primary/60 bg-primary/10 text-primary hover:bg-primary/20"
                    : "border-dashed border-border text-muted-foreground"
                )}
              >
                Limpar
              </Button>
            </nav>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="global-start-date" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Início</label>
              <Input
                id="global-start-date"
                type="date"
                className="h-10 rounded-xl border-border/50 bg-black/40 text-sm sm:w-40"
                value={startDate}
                min={dateRange.min}
                max={endDate || dateRange.max}
                onChange={e => handleStartDateChange(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="global-end-date" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fim</label>
              <Input
                id="global-end-date"
                type="date"
                className="h-10 rounded-xl border-border/50 bg-black/40 text-sm sm:w-40"
                value={endDate}
                min={startDate || dateRange.min}
                max={dateRange.max}
                onChange={e => handleEndDateChange(e.target.value)}
              />
            </div>
            <span className="text-xs text-muted-foreground self-center">{sortedTransactions.length} transações no período</span>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Main Hero Card: Saldo Total */}
          <Card
            variant="highlight"
            className="relative overflow-hidden md:col-span-2 group animate-scale-in"
          >
            <div className={`absolute -right-6 -top-6 h-32 w-32 rounded-full opacity-10 blur-3xl transition-all duration-500 group-hover:opacity-20 ${totalBalance >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total
              </CardTitle>
              <Wallet className={`h-4 w-4 ${totalBalance >= 0 ? "text-emerald-500" : "text-red-500"}`} />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <AnimatedNumber
                  value={totalBalance}
                  formatFn={formatCurrency}
                  animateOnMount
                  duration={1200}
                  className={cn(
                    "text-3xl font-bold tracking-tight transition-all duration-300 md:text-4xl",
                    totalBalance >= 0 ? "text-emerald-500" : "text-red-500"
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  {totalBalance > 0
                    ? "Você tem a receber • Balanço geral de dívidas"
                    : totalBalance < 0
                      ? "Você deve no total • Balanço geral de dívidas"
                      : "Tudo quitado • Balanço zerado"
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Period Stats: Total Gasto */}
          <Card className="animate-slide-right [animation-delay:300ms]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Gasto</CardTitle>
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><AnimatedNumber value={periodStats.mySpend} formatFn={formatCurrency} animateOnMount duration={1000} delay={300} /></div>
              <p className="text-xs text-muted-foreground">
                Você pagou no período selecionado
              </p>
              <div className="mt-3 h-1 w-full rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.min((periodStats.mySpend / (periodStats.totalSpend || 1)) * 100, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground text-right">
                {Math.round((periodStats.mySpend / (periodStats.totalSpend || 1)) * 100)}% do total (<AnimatedNumber value={periodStats.totalSpend} formatFn={formatCurrency} animateOnMount delay={300} />)
              </p>
            </CardContent>
          </Card>

          {/* Current Month Stats */}
          <Card className="animate-slide-left [animation-delay:450ms]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em {monthLabel}</CardTitle>
              <Calendar className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><AnimatedNumber value={currentMonthStats.mySpend} formatFn={formatCurrency} animateOnMount duration={1000} delay={450} /></div>
              <p className="text-xs text-muted-foreground">
                Seus pagamentos este mês
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>{currentMonthStats.count} lançamentos</span>
                <span>Total: <AnimatedNumber value={currentMonthStats.totalSpend} formatFn={formatCurrency} animateOnMount delay={450} /></span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts Section ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gastos por Categoria (seus) */}
          <Card className="flex flex-col overflow-hidden animate-blur-in [animation-delay:150ms]">
            <CardHeader className="items-center pb-0">
              <CardTitle className="text-sm font-medium">Meus Gastos por Categoria</CardTitle>
              <CardDescription>Distribuição dos seus pagamentos</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <div className="mx-auto aspect-square max-h-[250px]">
                <CategoryPieChart data={categoryTotals} />
              </div>
            </CardContent>
            <div className="flex justify-center gap-2 pb-4 text-xs text-muted-foreground">
              <span>Total: <AnimatedNumber value={totalCategoryAmount} formatFn={formatCurrency} animateOnMount delay={150} /></span>
            </div>
          </Card>

          {/* Gastos por Categoria Geral */}
          <Card className="flex flex-col overflow-hidden animate-blur-in [animation-delay:200ms]">
            <CardHeader className="items-center pb-0">
              <CardTitle className="text-sm font-medium">Gastos por Categoria (Geral)</CardTitle>
              <CardDescription>Todas as transações no período</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <div className="mx-auto aspect-square max-h-[250px]">
                <CategoryPieChart data={globalCategoryTotals} />
              </div>
            </CardContent>
            <div className="flex justify-center gap-2 pb-4 text-xs text-muted-foreground">
              <span>Total: <AnimatedNumber value={totalGlobalCategoryAmount} formatFn={formatCurrency} animateOnMount delay={200} /></span>
            </div>
          </Card>

          {/* Maiores Transações no Período */}
          <Card className="flex flex-col overflow-hidden animate-blur-in [animation-delay:250ms]">
            <CardHeader className="items-center pb-0">
              <CardTitle className="text-sm font-medium">Maiores Transações</CardTitle>
              <CardDescription>Top 10 transações no período</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
              <div className="mx-auto aspect-square max-h-[250px]">
                <CategoryPieChart data={topTransactions} />
              </div>
            </CardContent>
            <div className="flex justify-center gap-2 pb-4 text-xs text-muted-foreground">
              <span>Soma: <AnimatedNumber value={totalTopTransactions} formatFn={formatCurrency} animateOnMount delay={250} /></span>
            </div>
          </Card>

          {/* Balance Chart */}
          <div className="animate-rise-up [animation-delay:300ms]">
            <BalanceChart series={chartSeries} currentUser={currentUser} startDate={startDate || undefined} endDate={endDate || undefined} />
          </div>
        </div>

        {/* ── Solicitações de Dinheiro (Collapsible/Conditional) ── */}
        <section className="space-y-4 animate-slide-up-fade [animation-delay:750ms]">
          {pendingRequests.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <HandCoins className="h-5 w-5 text-amber-400 animate-pulse" />
                  <h3 className="text-lg font-semibold text-amber-400">Solicitações Pendentes</h3>
                  <span className="ml-2 inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-500 ring-1 ring-inset ring-amber-500/20">
                    {pendingRequests.length}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenRequestDialog}
                  className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10"
                >
                  Nova solicitação
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pendingRequests.map(request => (
                  <div
                    key={request.id}
                    className="group relative overflow-hidden rounded-xl border border-amber-500/20 bg-black/40 p-4 shadow-sm transition-all hover:border-amber-500/40 hover:shadow-md"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-1">
                        <p className="font-medium text-foreground truncate">{request.description}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>De: {getUserColorClasses((request.participants ?? [])[0]).split(' ').slice(0, 1) ? (request.participants ?? [])[0] : 'Desconhecido'}</span>
                          <span>•</span>
                          <span>{format(parseISO(request.date), "dd/MM")}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-400">{formatCurrency(request.amount ?? 0)}</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleMarkAsPaid(request.id)}
                      disabled={markingPaidId === request.id}
                      className="mt-3 w-full h-8 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20"
                    >
                      {markingPaidId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Marcar como Pago"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={handleOpenRequestDialog}
                className="text-muted-foreground hover:text-amber-400 transition-colors"
              >
                <HandCoins className="mr-2 h-4 w-4" />
                Solicitar Dinheiro
              </Button>
            </div>
          )}
        </section>
      </div>

      {
        requestDialogOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              onClick={handleCloseRequestDialog}
              aria-hidden="true"
            />
            <div className="relative flex h-full items-center justify-center p-4" onKeyDown={handleRequestDialogKeyDown}>
              <div
                className="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-lg outline-none"
                role="dialog"
                aria-modal="true"
                aria-labelledby="request-dialog-title"
                aria-describedby="request-dialog-description"
              >
                <div className="flex items-center justify-between">
                  <p id="request-dialog-title" className="text-lg font-semibold flex items-center gap-2">
                    <HandCoins className="h-5 w-5 text-amber-500" />
                    Solicitar Dinheiro
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseRequestDialog}
                    disabled={requestPending}
                    aria-label="Fechar solicitação de dinheiro"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p id="request-dialog-description" className="mt-2 text-sm text-muted-foreground">
                  Envie uma notificação para os outros membros solicitando um pagamento.
                </p>
                <form onSubmit={handleSubmitRequest} className="mt-6 space-y-4" noValidate>
                  <div className="space-y-2">
                    <Label htmlFor="request-description">Descrição da Solicitação</Label>
                    <Input
                      ref={requestFirstFieldRef}
                      id="request-description"
                      name="description"
                      autoComplete="off"
                      value={requestForm.description}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: Conta de luz, Almoço..."
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="request-amount">Valor total</Label>
                      <Input
                        id="request-amount"
                        name="amount"
                        autoComplete="off"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={requestForm.amount}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, amount: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="request-date">Data</Label>
                      <Input
                        id="request-date"
                        type="date"
                        name="date"
                        value={requestForm.date}
                        onChange={(e) => setRequestForm(prev => ({ ...prev, date: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="request-pix">Chave PIX (Opcional)</Label>
                    <Input
                      id="request-pix"
                      name="pix"
                      autoComplete="off"
                      placeholder="Celular, CPF, Email ou Aleatória..."
                      value={requestForm.pix}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, pix: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={requestPending || !isRequestFormValid} className="bg-amber-500 hover:bg-amber-600 text-black border-amber-500/50" aria-busy={requestPending}>
                      {requestPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                          Enviar Solicitação
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
        )
      }

      {
        createDialogOpen && (
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
        )
      }

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

      <section className="space-y-6 animate-fade-in [animation-delay:850ms]">
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
                  onChange={event => setSearch(event.target.value)}
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
                    onClick={() => { setSearch(""); searchInputRef.current?.focus() }}
                    className="h-10 px-4 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                  >
                    <FilterX className="mr-2 h-4 w-4" />
                    Limpar busca
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Button
                    ref={createButtonRef}
                    onClick={() => setAddMenuOpen(!addMenuOpen)}
                    className="h-10 rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Transação
                    <ChevronDown className="ml-2 h-4 w-4 opacity-70" />
                  </Button>

                  {addMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setAddMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border/50 bg-black/90 p-1 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                        <button
                          onClick={() => { setAddMenuOpen(false); handleOpenCreateDialog() }}
                          className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10"
                        >
                          <Plus className="mr-3 h-4 w-4 text-primary" />
                          Manual
                        </button>
                        <button
                          onClick={() => { setAddMenuOpen(false); handleOpenUploadDialog() }}
                          className="flex w-full items-center rounded-xl px-4 py-3 text-sm font-medium transition-colors hover:bg-white/10"
                        >
                          <Upload className="mr-3 h-4 w-4 text-blue-400" />
                          Por Imagem via IA
                        </button>
                        <div className="my-1 border-t border-white/10" />
                        <button
                          onClick={() => { setAddMenuOpen(false); handleOpenRequestDialog() }}
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
                <Button variant="ghost" size="sm" onClick={() => setBulkQuickEditOpen(true)} className="h-8 w-8 p-0 rounded-md hover:bg-white/10">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setBulkDeleteOpen(true)} className="h-8 w-8 p-0 rounded-md hover:bg-destructive/20 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <Button variant="ghost" size="sm" onClick={handleClearSelection} className="h-8 px-2 text-xs rounded-md hover:bg-white/10">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Transactions Table */}
        <div className="overflow-hidden rounded-3xl border border-border/50 bg-black/30 backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 border-b border-white/5">
                <tr>
                  <th className="w-12 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={sortedTransactions.length > 0 && selectedRows.length === sortedTransactions.length}
                      onChange={handleToggleAll}
                      className="h-4 w-4 rounded border-white/20 bg-black/40 checked:bg-primary checked:border-primary transition-all"
                    />
                  </th>
                  {sortableColumns.map(col => (
                    <th key={col.key} className={cn("px-6 py-4 font-semibold text-muted-foreground uppercase tracking-wider text-xs", col.key === "amount" && "text-right")}>
                      <button
                        onClick={() => handleSortToggle(col.key)}
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
                            onChange={() => handleToggleRow(transaction.id)}
                            className="h-4 w-4 rounded border-white/20 bg-black/40 checked:bg-primary checked:border-primary transition-all cursor-pointer opacity-50 group-hover:opacity-100"
                          />
                        </td>

                        {/* Description */}
                        <td className="px-6 py-4 max-w-[300px]">
                          {isEditing ? (
                            <Input
                              name="description"
                              value={editForm.description}
                              onChange={handleEditInputChange}
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
                              onChange={(val) => setEditForm(prev => ({ ...prev, category: val }))}
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
                              onChange={handleEditInputChange}
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
                              onChange={val => setEditForm(prev => ({ ...prev, paid_by: val }))}
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
                              onChange={handleEditInputChange}
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
                                        const checked = e.target.checked;
                                        setEditForm(prev => ({
                                          ...prev,
                                          participants: checked ? [...prev.participants, p] : prev.participants.filter(x => x !== p)
                                        }))
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
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-500/10" onClick={() => handleSaveEdit(transaction.id)}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-400 hover:bg-red-500/10" onClick={handleCancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                {(currentUser === "Antônio" || transaction.paid_by === currentUser) && (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-white/10" onClick={() => handleEdit(transaction)}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-400" onClick={() => handleDelete(transaction.id)}>
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
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

    </div >
  )
}

