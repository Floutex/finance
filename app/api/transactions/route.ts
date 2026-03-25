import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { description, date, amount, paid_by, participants, category } = body

  if (!description || !date || !amount || !paid_by) {
    return NextResponse.json(
      { error: "description, date, amount e paid_by são obrigatórios" },
      { status: 400 }
    )
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("shared_transactions")
    .insert({
      description,
      date,
      amount,
      paid_by,
      participants: participants ?? null,
      category: category ?? null,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
