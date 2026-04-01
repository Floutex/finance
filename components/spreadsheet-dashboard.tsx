"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTransactions } from "@/hooks/use-transactions"
import { format, isSameMonth, parseISO, subMonths, subYears } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getSupabaseClient, bulkDeleteByIds, bulkUpdateByIds, getMonthlyIncomes } from "@/lib/supabase"
import type { Tables } from "@/lib/database.types"
import { PARTICIPANTS, normalizeNumber, normalizeText, capitalize, PENDING_MARKER, formatCurrency } from "@/lib/constants"
import { simplifyDebts } from "@/lib/debt-simplification"
import { buildIncomeMap, calculateShares } from "@/lib/proportional-split"

import {
  StatsCards,
  ChartsSection,
  PendingRequests,
  DateRangeSelector,
  SearchActionsBar,
  TransactionTable,
  CreateTransactionDialog,
  RequestDialog,
  UploadDialog,
  BulkDeleteDialog,
  BulkQuickEditDialog,
  BulkAdvancedEditDialog,
  WEBHOOK_URLS,
  ITEMS_PER_PAGE,
} from "@/components/dashboard"
import type {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  FormState,
  RequestFormState,
  ExtractedTransaction,
  SortField,
} from "@/components/dashboard"

const toISODate = (value: string) => {
  try {
    return format(parseISO(value), "yyyy-MM-dd")
  } catch {
    return value
  }
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

export const SpreadsheetDashboard = ({ currentUser }: { currentUser: string }) => {
  const supabase = getSupabaseClient()
  const { transactions, loading, error: fetchError, updateCache, reload } = useTransactions()

  // ── Error state ──
  const [localError, setLocalError] = useState<string | null>(null)
  const error = localError || fetchError
  const setError = (err: string | null) => setLocalError(err)

  // ── Filters & sort ──
  const [search, setSearch] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [activeRange, setActiveRange] = useState<"1M" | "3M" | "6M" | "1A" | "ALL" | null>(null)
  const [sortField, setSortField] = useState<SortField>("date")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)

  // ── Create dialog ──
  const [createForm, setCreateForm] = useState<FormState>(() => initialFormState(currentUser))
  const [createPending, setCreatePending] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // ── Upload dialog ──
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [extractedTransactions, setExtractedTransactions] = useState<ExtractedTransaction[]>([])
  const [savePending, setSavePending] = useState(false)

  // ── Edit row ──
  const [editRowId, setEditRowId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(() => initialFormState(currentUser))
  const [editPending, setEditPending] = useState(false)

  // ── Selection & bulk ──
  const [selectedRows, setSelectedRows] = useState<string[]>([])
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

  // ── Money Request ──
  const [requestDialogOpen, setRequestDialogOpen] = useState(false)
  const [requestForm, setRequestForm] = useState<RequestFormState>({ description: "", amount: "", date: new Date().toISOString().slice(0, 10), pix: "" })
  const [requestPending, setRequestPending] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)

  // ── Monthly incomes ──
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

  // ── Derived data ──

  const pendingRequests = useMemo(() =>
    transactions.filter(t => t.paid_by === PENDING_MARKER), [transactions])

  const userTransactions = useMemo(() =>
    transactions.filter(t => {
      if (t.paid_by === PENDING_MARKER) return false
      if (currentUser === "Antônio") return true
      return t.paid_by === currentUser || (t.participants ?? []).includes(currentUser)
    }), [transactions, currentUser])

  const filteredTransactions = useMemo(() => {
    const searchValue = search.trim().toLowerCase()
    const start = startDate ? parseISO(startDate) : null
    const end = endDate ? parseISO(endDate) : null

    return userTransactions.filter(transaction => {
      const matchesSearch =
        !searchValue ||
        normalizeText(transaction.description).toLowerCase().includes(searchValue) ||
        normalizeText(transaction.category).toLowerCase().includes(searchValue) ||
        transaction.paid_by.toLowerCase().includes(searchValue)
      if (!matchesSearch) return false
      const transactionDate = parseISO(transaction.date)
      return (!start || transactionDate >= start) && (!end || transactionDate <= end)
    })
  }, [userTransactions, search, startDate, endDate])

  const sortedTransactions = useMemo(() => {
    const copy = [...filteredTransactions]
    copy.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1
      if (sortField === "amount") return ((a.amount ?? 0) - (b.amount ?? 0)) * direction
      if (sortField === "date" || sortField === "created_at") {
        return (parseISO(a[sortField]).getTime() - parseISO(b[sortField]).getTime()) * direction
      }
      if (sortField === "participants") {
        const first = [...(a.participants ?? [])].sort().join(", ").toLowerCase()
        const second = [...(b.participants ?? [])].sort().join(", ").toLowerCase()
        return first < second ? -1 * direction : first > second ? 1 * direction : 0
      }
      const first = normalizeText(a[sortField as "description" | "category" | "paid_by"]).toLowerCase()
      const second = normalizeText(b[sortField as "description" | "category" | "paid_by"]).toLowerCase()
      return first < second ? -1 * direction : first > second ? 1 * direction : 0
    })
    return copy
  }, [filteredTransactions, sortField, sortDirection])

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE)
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedTransactions.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedTransactions, currentPage])

  useEffect(() => { setCurrentPage(1) }, [search, startDate, endDate])

  const createAmountValue = useMemo(() => normalizeNumber(createForm.amount), [createForm.amount])
  const createAmountInvalid = createForm.amount.trim().length > 0 && createAmountValue === null
  const isCreateFormValid = useMemo(() => {
    return createForm.description.trim().length > 0
      && PARTICIPANTS.includes(createForm.paid_by)
      && createForm.date.length > 0
      && normalizeNumber(createForm.amount) !== null
      && createForm.participants.length > 0
  }, [createForm])

  const requestAmountValue = useMemo(() => normalizeNumber(requestForm.amount), [requestForm.amount])
  const isRequestFormValid = useMemo(() =>
    requestForm.description.trim().length > 0 && requestAmountValue !== null && requestForm.date.length > 0
  , [requestForm, requestAmountValue])

  // ── Selection sync ──
  useEffect(() => {
    setSelectedRows(prev => prev.filter(id => sortedTransactions.some(t => t.id === id)))
  }, [sortedTransactions])

  // ── Date range ──
  const dateRange = useMemo(() => {
    if (userTransactions.length === 0) return { min: "", max: "" }
    const dates = userTransactions.map(t => t.date).sort()
    return { min: dates[0], max: dates[dates.length - 1] }
  }, [userTransactions])

  const applyQuickRange = useCallback((range: "1M" | "3M" | "6M" | "1A" | "ALL") => {
    if (!dateRange.max) return
    const lastDate = parseISO(dateRange.max)
    const firstDate = parseISO(dateRange.min)
    if (range === "ALL") { setStartDate(""); setEndDate(""); setActiveRange(range); return }
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

  // ── Stats ──
  const periodStats = useMemo(() => {
    let mySpend = 0, totalSpend = 0
    sortedTransactions.forEach(t => {
      totalSpend += (t.amount ?? 0)
      if (t.paid_by === currentUser) mySpend += (t.amount ?? 0)
    })
    return { mySpend, totalSpend }
  }, [sortedTransactions, currentUser])

  // ── Category totals ──
  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    sortedTransactions.forEach(t => {
      if (t.paid_by === currentUser) {
        const key = normalizeText(t.category) || "Sem categoria"
        map.set(key, (map.get(key) ?? 0) + (t.amount ?? 0))
      }
    })
    return Array.from(map.entries()).map(([category, total]) => ({ category, total })).sort((a, b) => a.category.localeCompare(b.category, "pt-BR"))
  }, [sortedTransactions, currentUser])

  const totalCategoryAmount = useMemo(() => categoryTotals.reduce((s, i) => s + i.total, 0), [categoryTotals])

  const globalCategoryTotals = useMemo(() => {
    const map = new Map<string, number>()
    sortedTransactions.forEach(t => {
      const key = normalizeText(t.category) || "Sem categoria"
      map.set(key, (map.get(key) ?? 0) + (t.amount ?? 0))
    })
    return Array.from(map.entries()).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total)
  }, [sortedTransactions])

  const totalGlobalCategoryAmount = useMemo(() => globalCategoryTotals.reduce((s, i) => s + i.total, 0), [globalCategoryTotals])

  const topTransactions = useMemo(() =>
    [...sortedTransactions].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0)).slice(0, 10)
      .map(t => ({ category: normalizeText(t.description) || "Sem descrição", total: t.amount ?? 0 }))
  , [sortedTransactions])

  const totalTopTransactions = useMemo(() => topTransactions.reduce((s, i) => s + i.total, 0), [topTransactions])

  // ── Chart series ──
  const chartSeries = useMemo(() => {
    if (transactions.length === 0) return []
    const sorted = [...transactions].sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
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
      if (userIsPayer && userIsParticipant) runningBalance += amount - myShare
      else if (userIsPayer && !userIsParticipant) runningBalance += amount
      else if (!userIsPayer && userIsParticipant) runningBalance -= myShare
      dateBalanceMap.set(t.date, runningBalance)
    }
    return Array.from(dateBalanceMap.entries()).map(([date, balance]) => ({ date, balance: Number(balance.toFixed(2)) }))
  }, [transactions, currentUser, incomeMap])

  // ── Debt simplification ──
  const simplifiedDebts = useMemo(() => {
    const allTransactions = transactions.map(t => ({
      paid_by: t.paid_by, amount: t.amount ?? 0,
      participants: t.participants ?? ["Antônio", "Júlia"], date: t.date,
    }))
    return simplifyDebts(allTransactions, incomeMap)
  }, [transactions, incomeMap])

  const myDebts = simplifiedDebts.filter(d => d.from === currentUser || d.to === currentUser)
  const totalBalance = useMemo(() =>
    myDebts.reduce((acc, d) => d.from === currentUser ? acc - d.amount : d.to === currentUser ? acc + d.amount : acc, 0)
  , [myDebts, currentUser])

  // ──────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────

  const handleSortToggle = (field: SortField) => {
    setCurrentPage(1)
    if (sortField === field) setSortDirection(prev => prev === "asc" ? "desc" : "asc")
    else { setSortField(field); setSortDirection(field === "date" || field === "created_at" ? "desc" : "asc") }
  }

  const handleToggleRow = (id: string) => setSelectedRows(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const handleToggleAll = () => setSelectedRows(prev => prev.length === sortedTransactions.length ? [] : sortedTransactions.map(t => t.id))

  // ── Create ──
  const handleOpenCreateDialog = () => { setCreateForm(initialFormState(currentUser)); setError(null); setCreateDialogOpen(true) }
  const handleCloseCreateDialog = () => { if (createPending) return; setCreateDialogOpen(false); setError(null); setCreateForm(initialFormState(currentUser)) }

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setCreatePending(true); setError(null)
    if (!createForm.participants.includes(currentUser) && createForm.paid_by !== currentUser) {
      setError("Você não pode criar uma transação na qual não está envolvido (pagando ou participando).")
      setCreatePending(false); return
    }
    const payload: TransactionInsert = {
      description: createForm.description.trim(), category: createForm.category.trim() || null,
      paid_by: createForm.paid_by.trim(), date: createForm.date,
      amount: createAmountValue, participants: createForm.participants,
    }
    const { data, error: insertError } = await supabase.from("shared_transactions").insert(payload).select("*").single()
    if (insertError) setError(insertError.message)
    else if (data) { updateCache(prev => [data, ...prev]); setCreateForm(initialFormState(currentUser)); setCreateDialogOpen(false) }
    setCreatePending(false)
  }

  const handleCreateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCreateForm(prev => ({ ...prev, [name]: value }))
  }

  // ── Edit row ──
  const handleEdit = (transaction: Transaction) => {
    setEditRowId(transaction.id)
    setEditForm({
      description: transaction.description, category: normalizeText(transaction.category),
      paid_by: transaction.paid_by, date: toISODate(transaction.date),
      amount: transaction.amount !== null ? String(transaction.amount) : "",
      participants: transaction.participants ?? PARTICIPANTS,
    })
  }

  const handleCancelEdit = () => { setEditRowId(null); setEditForm(initialFormState(currentUser)) }

  const handleSaveEdit = async (transactionId: string) => {
    setEditPending(true); setError(null)
    if (!editForm.participants.includes(currentUser) && editForm.paid_by !== currentUser) {
      setError("Você não pode editar uma transação para não estar mais envolvido nela.")
      setEditPending(false); return
    }
    const amountValue = normalizeNumber(editForm.amount)
    const updatePayload: TransactionUpdate = {
      description: editForm.description.trim(), category: editForm.category.trim() || null,
      paid_by: editForm.paid_by.trim(), date: editForm.date,
      amount: amountValue, participants: editForm.participants,
    }
    const { data, error: updateError } = await supabase.from("shared_transactions").update(updatePayload).eq("id", transactionId).select("*").single()
    if (updateError) setError(updateError.message)
    else if (data) { updateCache(prev => prev.map(i => i.id === transactionId ? data : i)); handleCancelEdit() }
    setEditPending(false)
  }

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  // ── Delete ──
  const handleDelete = async (transactionId: string) => {
    const transaction = transactions.find(t => t.id === transactionId)
    if (!transaction) return
    if (currentUser !== "Antônio" && transaction.paid_by !== currentUser) { setError("Você só pode deletar transações que você pagou."); return }
    setDeletePendingId(transactionId); setError(null)
    const { error: deleteError } = await supabase.from("shared_transactions").update({ is_hidden: true }).eq("id", transactionId)
    if (deleteError) { setError(deleteError.message); setDeletePendingId(null); return }
    updateCache(prev => prev.filter(i => i.id !== transactionId))
    setSelectedRows(prev => prev.filter(i => i !== transactionId))
    if (editRowId === transactionId) { setEditRowId(null); setEditForm(initialFormState(currentUser)) }
    setDeletePendingId(null)
  }

  // ── Image upload ──
  const handleOpenUploadDialog = () => { setUploadDialogOpen(true); setUploadedImage(null); setUploadedFile(null); setExtractedTransactions([]); setError(null) }
  const handleCloseUploadDialog = () => { if (analyzing || savePending) return; setUploadDialogOpen(false); setUploadedImage(null); setUploadedFile(null); setExtractedTransactions([]); setError(null) }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { setError("Por favor, selecione um arquivo de imagem"); return }
    setUploadedFile(file)
    const reader = new FileReader()
    reader.onload = ev => setUploadedImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    setExtractedTransactions([]); setError(null)
  }

  const handleAnalyzeImage = async () => {
    if (!uploadedFile) return
    setAnalyzing(true); setError(null)
    try {
      const formData = new FormData()
      formData.append("image", uploadedFile)
      const response = await fetch("/api/analyze-image", { method: "POST", body: formData })
      if (!response.ok) { const ed = await response.json(); throw new Error(ed.error || "Erro ao analisar imagem") }
      const data = await response.json()
      setExtractedTransactions(data.transactions.map((t: any) => ({
        description: t.description, date: t.date, amount: t.amount,
        participants: PARTICIPANTS, paid_by: "", category: "",
      })))
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao analisar imagem") }
    finally { setAnalyzing(false) }
  }

  const handleUpdateExtractedTransaction = (index: number, field: keyof ExtractedTransaction, value: string | number) => {
    setExtractedTransactions(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const handleSaveExtractedTransactions = async () => {
    const invalid = extractedTransactions.filter(t => !t.description.trim() || !PARTICIPANTS.includes(t.paid_by) || !t.date)
    if (invalid.length > 0) { setError("Preencha todos os campos obrigatórios (descrição, data e pago por) em todas as transações"); return }
    const uninvolved = extractedTransactions.filter(t => t.paid_by !== currentUser && !t.participants.includes(currentUser))
    if (uninvolved.length > 0) { setError("Você não pode salvar transações nas quais não está envolvido (pagando ou participando)."); return }
    setSavePending(true); setError(null)
    try {
      const payloads: TransactionInsert[] = extractedTransactions.map(t => ({
        description: t.description.trim(), category: t.category.trim() || null,
        paid_by: t.paid_by.trim(), date: t.date, amount: t.amount, participants: t.participants,
      }))
      const { data, error: insertError } = await supabase.from("shared_transactions").insert(payloads).select("*")
      if (insertError) setError(insertError.message)
      else if (data) { updateCache(prev => [...data, ...prev]); handleCloseUploadDialog() }
    } catch (err) { setError(err instanceof Error ? err.message : "Erro ao salvar transações") }
    finally { setSavePending(false) }
  }

  // ── Money Request ──
  const handleOpenRequestDialog = () => { setRequestForm({ description: "", amount: "", date: new Date().toISOString().slice(0, 10), pix: "" }); setError(null); setRequestDialogOpen(true) }
  const handleCloseRequestDialog = () => { if (requestPending) return; setRequestDialogOpen(false); setError(null) }

  const handleSubmitRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setRequestPending(true); setError(null)
    const amountVal = requestAmountValue
    if (amountVal === null) { setError("Valor inválido"); setRequestPending(false); return }
    const description = `💰 ${requestForm.description.trim()}${requestForm.pix.trim() ? ` | PIX: ${requestForm.pix.trim()}` : ""}`
    const payload: TransactionInsert = {
      description, category: "Solicitação", paid_by: PENDING_MARKER,
      date: requestForm.date, amount: amountVal, participants: [currentUser],
    }
    const { data, error: insertError } = await supabase.from("shared_transactions").insert(payload).select("*").single()
    if (insertError) { setError(insertError.message); setRequestPending(false); return }
    if (data) updateCache(prev => [data, ...prev])
    // Webhooks (fire and forget)
    const webhookPayload = {
      type: "money_request", requested_by: currentUser, paid_by: "",
      description: requestForm.description.trim(), pix: requestForm.pix.trim(),
      amount: amountVal, date: requestForm.date, transaction_id: data?.id ?? null,
      timestamp: new Date().toISOString(),
    }
    PARTICIPANTS.filter(p => p !== currentUser).forEach(target => {
      const url = WEBHOOK_URLS[target]
      if (url) fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookPayload) }).catch(() => {})
    })
    setRequestForm({ description: "", amount: "", date: new Date().toISOString().slice(0, 10), pix: "" })
    setRequestDialogOpen(false); setRequestPending(false)
  }

  const handleMarkAsPaid = async (transactionId: string) => {
    setMarkingPaidId(transactionId); setError(null)
    const { data, error: updateError } = await supabase.from("shared_transactions").update({ paid_by: currentUser } as TransactionUpdate).eq("id", transactionId).select("*").single()
    if (updateError) { setError(updateError.message); setMarkingPaidId(null); return }
    if (data) {
      updateCache(prev => prev.map(i => i.id === transactionId ? data : i))
      const webhookPayload = {
        type: "money_request_paid", requested_by: (data.participants ?? [])[0] ?? "Desconhecido",
        paid_by: currentUser, description: data.description, pix: "", amount: data.amount,
        date: data.date, transaction_id: transactionId, timestamp: new Date().toISOString(),
      }
      PARTICIPANTS.forEach(target => {
        const url = WEBHOOK_URLS[target]
        if (url) fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(webhookPayload) }).catch(() => {})
      })
    }
    setMarkingPaidId(null)
  }

  // ── Bulk operations ──
  const handleConfirmBulkDelete = async () => {
    if (selectedRows.length === 0) return
    const toDelete = transactions.filter(t => selectedRows.includes(t.id))
    const unauthorized = toDelete.filter(t => currentUser !== "Antônio" && t.paid_by !== currentUser)
    if (unauthorized.length > 0) { setBulkError(`Você não pode deletar ${unauthorized.length} transações selecionadas pois não foi você quem pagou.`); return }
    setBulkPending(true); setBulkError(null)
    const { error } = await bulkDeleteByIds("shared_transactions", selectedRows)
    if (error) { setBulkError(error.message); setBulkPending(false); return }
    await reload(); setSelectedRows([]); setBulkPending(false); setBulkDeleteOpen(false)
  }

  const handleConfirmQuickEdit = async () => {
    if (selectedRows.length === 0) return
    const values: any = {}
    if (quickField === "category") values.category = quickValue.trim() || null
    else if (quickField === "paid_by") values.paid_by = quickValue.trim()
    setBulkPending(true); setBulkError(null)
    const { error } = await bulkUpdateByIds("shared_transactions", selectedRows, values)
    if (error) { setBulkError(error.message); setBulkPending(false); return }
    await reload(); setSelectedRows([]); setBulkPending(false); setBulkQuickEditOpen(false); setQuickValue("")
  }

  const handleConfirmAdvancedEdit = async () => {
    if (selectedRows.length === 0) return
    const values: any = {}
    if (advancedCategory.trim()) values.category = advancedCategory.trim()
    if (advancedPaidBy.trim()) values.paid_by = advancedPaidBy.trim()
    if (advancedDate.trim()) values.date = advancedDate.trim()
    if (Object.keys(values).length === 0) return
    setBulkPending(true); setBulkError(null)
    const { error } = await bulkUpdateByIds("shared_transactions", selectedRows, values)
    if (error) { setBulkError(error.message); setBulkPending(false); return }
    await reload(); setSelectedRows([]); setBulkPending(false); setBulkAdvancedEditOpen(false)
    setAdvancedCategory(""); setAdvancedPaidBy(""); setAdvancedDate("")
  }

  // ──────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <DateRangeSelector
          activeRange={activeRange}
          startDate={startDate}
          endDate={endDate}
          dateRangeMin={dateRange.min}
          dateRangeMax={dateRange.max}
          transactionCount={sortedTransactions.length}
          onApplyQuickRange={applyQuickRange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />

        <StatsCards
          totalBalance={totalBalance}
          mySpend={periodStats.mySpend}
          totalSpend={periodStats.totalSpend}
        />

        <ChartsSection
          categoryTotals={categoryTotals}
          totalCategoryAmount={totalCategoryAmount}
          globalCategoryTotals={globalCategoryTotals}
          totalGlobalCategoryAmount={totalGlobalCategoryAmount}
          topTransactions={topTransactions}
          totalTopTransactions={totalTopTransactions}
          chartSeries={chartSeries}
          currentUser={currentUser}
          startDate={startDate || undefined}
          endDate={endDate || undefined}
        />

        <PendingRequests
          requests={pendingRequests}
          markingPaidId={markingPaidId}
          onMarkAsPaid={handleMarkAsPaid}
          onOpenRequestDialog={handleOpenRequestDialog}
        />
      </div>

      <RequestDialog
        open={requestDialogOpen}
        form={requestForm}
        pending={requestPending}
        formValid={isRequestFormValid}
        error={requestDialogOpen ? error : null}
        onClose={handleCloseRequestDialog}
        onSubmit={handleSubmitRequest}
        onFormChange={(updates) => setRequestForm(prev => ({ ...prev, ...updates }))}
      />

      <CreateTransactionDialog
        open={createDialogOpen}
        form={createForm}
        pending={createPending}
        amountInvalid={createAmountInvalid}
        formValid={isCreateFormValid}
        error={createDialogOpen ? error : null}
        currentUser={currentUser}
        onClose={handleCloseCreateDialog}
        onSubmit={handleCreate}
        onInputChange={handleCreateInputChange}
        onFormChange={(updates) => setCreateForm(prev => ({ ...prev, ...updates }))}
      />

      <UploadDialog
        open={uploadDialogOpen}
        uploadedImage={uploadedImage}
        analyzing={analyzing}
        savePending={savePending}
        extractedTransactions={extractedTransactions}
        error={uploadDialogOpen ? error : null}
        currentUser={currentUser}
        onClose={handleCloseUploadDialog}
        onImageUpload={handleImageUpload}
        onRemoveImage={() => { setUploadedImage(null); setUploadedFile(null); setExtractedTransactions([]) }}
        onAnalyze={handleAnalyzeImage}
        onUpdateTransaction={handleUpdateExtractedTransaction}
        onSave={handleSaveExtractedTransactions}
        onSetUploadedImage={setUploadedImage}
        onSetUploadedFile={setUploadedFile}
        onSetExtractedTransactions={setExtractedTransactions}
        onSetError={setError}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        count={selectedRows.length}
        pending={bulkPending}
        error={bulkError}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleConfirmBulkDelete}
      />

      <BulkQuickEditDialog
        open={bulkQuickEditOpen}
        pending={bulkPending}
        error={bulkError}
        quickField={quickField}
        quickValue={quickValue}
        currentUser={currentUser}
        onClose={() => setBulkQuickEditOpen(false)}
        onConfirm={handleConfirmQuickEdit}
        onFieldChange={setQuickField}
        onValueChange={setQuickValue}
      />

      <BulkAdvancedEditDialog
        open={bulkAdvancedEditOpen}
        pending={bulkPending}
        error={bulkError}
        category={advancedCategory}
        paidBy={advancedPaidBy}
        date={advancedDate}
        currentUser={currentUser}
        onClose={() => setBulkAdvancedEditOpen(false)}
        onConfirm={handleConfirmAdvancedEdit}
        onCategoryChange={setAdvancedCategory}
        onPaidByChange={setAdvancedPaidBy}
        onDateChange={setAdvancedDate}
      />

      <section className="space-y-6 animate-fade-in [animation-delay:850ms]">
        <SearchActionsBar
          search={search}
          visibleCount={sortedTransactions.length}
          selectedCount={selectedRows.length}
          onSearchChange={setSearch}
          onOpenCreateDialog={handleOpenCreateDialog}
          onOpenUploadDialog={handleOpenUploadDialog}
          onOpenRequestDialog={handleOpenRequestDialog}
          onOpenBulkQuickEdit={() => setBulkQuickEditOpen(true)}
          onOpenBulkDelete={() => setBulkDeleteOpen(true)}
          onClearSelection={() => setSelectedRows([])}
        />

        <TransactionTable
          loading={loading}
          paginatedTransactions={paginatedTransactions}
          sortedTransactions={sortedTransactions}
          sortField={sortField}
          sortDirection={sortDirection}
          selectedRows={selectedRows}
          editRowId={editRowId}
          editForm={editForm}
          editPending={editPending}
          deletePendingId={deletePendingId}
          currentUser={currentUser}
          currentPage={currentPage}
          totalPages={totalPages}
          onSortToggle={handleSortToggle}
          onToggleRow={handleToggleRow}
          onToggleAll={handleToggleAll}
          onEdit={handleEdit}
          onCancelEdit={handleCancelEdit}
          onSaveEdit={handleSaveEdit}
          onEditFormChange={(updates) => setEditForm(prev => ({ ...prev, ...updates }))}
          onEditInputChange={handleEditInputChange}
          onDelete={handleDelete}
          onPageChange={setCurrentPage}
        />
      </section>
    </div>
  )
}
