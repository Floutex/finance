import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

const PAGE_SIZE_DEFAULT = 50
const PAGE_SIZE_MAX = 200

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const actor = url.searchParams.get("actor")
  const action = url.searchParams.get("action")
  const start = url.searchParams.get("start")
  const end = url.searchParams.get("end")
  const transactionId = url.searchParams.get("transactionId")
  const cursor = url.searchParams.get("cursor")
  const pageSizeParam = parseInt(url.searchParams.get("pageSize") ?? "", 10)
  const pageSize = Number.isFinite(pageSizeParam) && pageSizeParam > 0
    ? Math.min(pageSizeParam, PAGE_SIZE_MAX)
    : PAGE_SIZE_DEFAULT

  const supabase = getSupabaseClient()
  let query = supabase
    .from("transaction_audit")
    .select("*")
    .order("id", { ascending: false })
    .limit(pageSize + 1)

  if (actor) query = query.eq("actor", actor)
  if (action) query = query.eq("action", action)
  if (transactionId) query = query.eq("transaction_id", transactionId)
  if (start) query = query.gte("created_at", start)
  if (end) query = query.lte("created_at", end)
  if (cursor) {
    const cursorId = parseInt(cursor, 10)
    if (Number.isFinite(cursorId)) query = query.lt("id", cursorId)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const hasMore = rows.length > pageSize
  const items = hasMore ? rows.slice(0, pageSize) : rows
  const nextCursor = hasMore ? String(items[items.length - 1].id) : null

  return NextResponse.json({ items, nextCursor })
}
