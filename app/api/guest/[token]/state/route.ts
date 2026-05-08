import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { simplifyDebts } from "@/lib/debt-simplification"
import { buildIncomeMap } from "@/lib/proportional-split"

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  if (!token) return NextResponse.json({ error: "token obrigatório" }, { status: 400 })

  const supabase = getSupabaseClient()

  const { data: tokenRow, error: tokenError } = await supabase
    .from("participant_tokens")
    .select("token,kind,revoked_at,participant_id")
    .eq("token", token)
    .maybeSingle()
  if (tokenError) return NextResponse.json({ error: tokenError.message }, { status: 500 })
  if (!tokenRow || tokenRow.kind !== "personal" || tokenRow.revoked_at || !tokenRow.participant_id) {
    return NextResponse.json({ error: "Link inválido ou expirado" }, { status: 404 })
  }

  const { data: participant, error: pError } = await supabase
    .from("participants")
    .select("*")
    .eq("id", tokenRow.participant_id)
    .maybeSingle()
  if (pError) return NextResponse.json({ error: pError.message }, { status: 500 })
  if (!participant || participant.is_archived) {
    return NextResponse.json({ error: "Participante arquivado" }, { status: 404 })
  }

  const { data: members, error: membersError } = await supabase
    .from("participants")
    .select("id,name,color,kind,is_archived")
    .eq("kind", "member")
    .eq("is_archived", false)
    .order("name")
  if (membersError) return NextResponse.json({ error: membersError.message }, { status: 500 })

  const { data: rawTransactions, error: txError } = await supabase
    .from("shared_transactions")
    .select("*")
    .eq("is_hidden", false)
    .order("date", { ascending: false })
  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  const all = rawTransactions ?? []
  const visibleTransactions = all.filter(t =>
    t.paid_by === participant.name || (t.participants ?? []).includes(participant.name)
  )

  const { data: incomes } = await supabase.from("monthly_incomes").select("*")
  const months = Array.from(new Set(all.map(t => t.date.slice(0, 7))))
  const incomeMap = buildIncomeMap(incomes ?? [], months)

  const debtInputs = all.map(t => ({
    paid_by: t.paid_by,
    amount: t.amount ?? 0,
    participants: t.participants ?? [],
    date: t.date,
    custom_shares: (t.custom_shares as Record<string, number> | null) ?? null,
  }))
  const allDebts = simplifyDebts(debtInputs, incomeMap)
  const myDebts = allDebts.filter(d => d.from === participant.name || d.to === participant.name)

  return NextResponse.json({
    participant,
    members,
    transactions: visibleTransactions,
    debts: myDebts,
  })
}
