import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

// POST { description?, date, amount, member }
// Restricted to payback: paid_by = guest, participants = [member], no custom shares.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  if (!token) return NextResponse.json({ error: "token obrigatório" }, { status: 400 })

  const body = await req.json()
  const description = String(body?.description ?? "").trim() || "Acerto de contas"
  const date = String(body?.date ?? "").trim()
  const amount = typeof body?.amount === "number" ? body.amount : Number(String(body?.amount ?? "").replace(",", "."))
  const member = String(body?.member ?? "").trim()

  if (!date) return NextResponse.json({ error: "data obrigatória" }, { status: 400 })
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "valor inválido" }, { status: 400 })
  }
  if (!member) return NextResponse.json({ error: "member obrigatório" }, { status: 400 })

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

  const { data: guest } = await supabase
    .from("participants")
    .select("name,is_archived")
    .eq("id", tokenRow.participant_id)
    .maybeSingle()
  if (!guest || guest.is_archived) {
    return NextResponse.json({ error: "Participante arquivado" }, { status: 404 })
  }

  // Validate member exists, is a member, not archived
  const { data: target } = await supabase
    .from("participants")
    .select("name,kind,is_archived")
    .eq("name", member)
    .maybeSingle()
  if (!target || target.kind !== "member" || target.is_archived) {
    return NextResponse.json({ error: "Member alvo inválido" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("shared_transactions")
    .insert({
      description,
      date,
      amount,
      paid_by: guest.name,
      participants: [target.name],
      category: "Acerto de contas",
      last_edited_by: guest.name,
      last_edited_at: new Date().toISOString(),
    })
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
