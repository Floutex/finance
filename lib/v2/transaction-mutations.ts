/**
 * Shared mutation helpers for v2. Wraps `lib/supabase` calls used by the
 * SpreadsheetDashboard (insert, update, soft-delete) and the receipt-upload
 * flow so consumers don't reach into Supabase directly.
 */

import { getSupabaseClient, bulkDeleteByIds, bulkUpdateByIds } from "@/lib/supabase"
import { uploadReceipt } from "@/lib/storage"
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types"

type Transaction = Tables<"shared_transactions">

export type CreatePayload = {
  description: string
  category: string | null
  paid_by: string
  date: string
  amount: number
  participants: string[]
  custom_shares: Record<string, number> | null
  receipt_file?: File | null
  currentUser: string
}

export type UpdatePayload = CreatePayload & { id: string }

const nowIso = () => new Date().toISOString()

async function attachReceipt(
  transactionId: string,
  file: File,
  currentUser: string
): Promise<Transaction | null> {
  const url = await uploadReceipt(file, transactionId)
  const supabase = getSupabaseClient()
  const { data } = await supabase
    .from("shared_transactions")
    .update({
      receipt_url: url,
      last_edited_by: currentUser,
      last_edited_at: nowIso(),
    })
    .eq("id", transactionId)
    .select("*")
    .single()
  return data ?? null
}

export async function createTransaction(p: CreatePayload): Promise<Transaction> {
  const supabase = getSupabaseClient()
  const insert: TablesInsert<"shared_transactions"> = {
    description: p.description,
    category: p.category,
    paid_by: p.paid_by,
    date: p.date,
    amount: p.amount,
    participants: p.participants,
    custom_shares: p.custom_shares,
    last_edited_by: p.currentUser,
    last_edited_at: nowIso(),
  }
  const { data, error } = await supabase
    .from("shared_transactions")
    .insert(insert)
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  let final = data!
  if (p.receipt_file) {
    try {
      const updated = await attachReceipt(final.id, p.receipt_file, p.currentUser)
      if (updated) final = updated
    } catch (e) {
      console.error("Falha ao subir comprovante:", e)
    }
  }
  return final
}

export async function updateTransaction(p: UpdatePayload): Promise<Transaction> {
  const supabase = getSupabaseClient()
  const update: TablesUpdate<"shared_transactions"> = {
    description: p.description,
    category: p.category,
    paid_by: p.paid_by,
    date: p.date,
    amount: p.amount,
    participants: p.participants,
    custom_shares: p.custom_shares,
    last_edited_by: p.currentUser,
    last_edited_at: nowIso(),
  }
  const { data, error } = await supabase
    .from("shared_transactions")
    .update(update)
    .eq("id", p.id)
    .select("*")
    .single()
  if (error) throw new Error(error.message)
  let final = data!
  if (p.receipt_file) {
    try {
      const updated = await attachReceipt(final.id, p.receipt_file, p.currentUser)
      if (updated) final = updated
    } catch (e) {
      console.error("Falha ao subir comprovante:", e)
    }
  }
  return final
}

export async function softDeleteTransaction(
  id: string,
  currentUser: string
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("shared_transactions")
    .update({
      is_hidden: true,
      last_edited_by: currentUser,
      last_edited_at: nowIso(),
    })
    .eq("id", id)
  if (error) throw new Error(error.message)
}

export async function bulkSoftDelete(ids: string[], currentUser: string) {
  const { error } = await bulkDeleteByIds("shared_transactions", ids, currentUser)
  if (error) throw new Error(error.message)
}

export async function bulkUpdate(
  ids: string[],
  values: Partial<TablesUpdate<"shared_transactions">>,
  currentUser: string
) {
  const { error } = await bulkUpdateByIds(
    "shared_transactions",
    ids,
    values,
    currentUser
  )
  if (error) throw new Error(error.message)
}

/**
 * Build a transaction-form-shaped projection from an existing transaction —
 * used to initialize the edit form.
 */
export function transactionToFormValues(t: Transaction) {
  return {
    description: t.description ?? "",
    category: t.category ?? "",
    paid_by: t.paid_by ?? "",
    date: t.date,
    amount: t.amount !== null ? String(t.amount).replace(".", ",") : "",
    participants: t.participants ?? [],
    customShares: (t.custom_shares as Record<string, number> | null) ?? null,
  }
}
