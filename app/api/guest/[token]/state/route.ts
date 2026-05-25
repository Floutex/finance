import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

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

  // Active participants (members + non-archived guests) — needed for the
  // rich dashboard so badges/avatars/pies can color by participant.
  const { data: participants, error: participantsError } = await supabase
    .from("participants")
    .select("id,name,color,kind,is_archived,created_at")
    .eq("is_archived", false)
    .order("name")
  if (participantsError) {
    return NextResponse.json({ error: participantsError.message }, { status: 500 })
  }

  const members = (participants ?? []).filter((p) => p.kind === "member")

  // Return the FULL transactions set (minus hidden). `computeDashboardMetrics`
  // does its own visibility filter from `currentUser`, and needs the full set
  // to render the debt simplification and chart series correctly.
  const { data: rawTransactions, error: txError } = await supabase
    .from("shared_transactions")
    .select("*")
    .eq("is_hidden", false)
    .order("date", { ascending: false })
  if (txError) return NextResponse.json({ error: txError.message }, { status: 500 })

  const { data: incomes, error: incomesError } = await supabase
    .from("monthly_incomes")
    .select("*")
  if (incomesError) {
    return NextResponse.json({ error: incomesError.message }, { status: 500 })
  }

  return NextResponse.json({
    participant,
    members,
    participants: participants ?? [],
    transactions: rawTransactions ?? [],
    monthlyIncomes: incomes ?? [],
  })
}
