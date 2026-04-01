import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types"

export type Transaction = Tables<"shared_transactions">
export type TransactionInsert = TablesInsert<"shared_transactions">
export type TransactionUpdate = TablesUpdate<"shared_transactions">

export type SortField = "date" | "description" | "amount" | "participants" | "paid_by" | "category" | "created_at"

export type FormState = {
  description: string
  category: string
  paid_by: string
  date: string
  amount: string
  participants: string[]
}

export type RequestFormState = {
  description: string
  amount: string
  date: string
  pix: string
}

export type ExtractedTransaction = {
  description: string
  date: string
  amount: number
  participants: string[]
  paid_by: string
  category: string
}

export const WEBHOOK_URLS: Record<string, string> = {
  "Antônio": "https://services.leadconnectorhq.com/hooks/YUrVxIRna26XgFlMZ5Kb/webhook-trigger/9479827a-15d2-4333-94e1-191bb60427f7",
  "Júlia": "https://services.leadconnectorhq.com/hooks/YUrVxIRna26XgFlMZ5Kb/webhook-trigger/7e0cf1a9-ddf9-468a-b301-851ac515a4d0",
  "Pietro": "https://services.leadconnectorhq.com/hooks/YUrVxIRna26XgFlMZ5Kb/webhook-trigger/b9a11147-a9e5-42d5-9c7d-dc1533b1e739",
  "Simões": "https://services.leadconnectorhq.com/hooks/YUrVxIRna26XgFlMZ5Kb/webhook-trigger/88fae391-8944-46b6-b9af-34bdc9a53ef2",
}

export const ITEMS_PER_PAGE = 20
