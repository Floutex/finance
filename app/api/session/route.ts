import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { USERS } from "@/lib/constants"

const unauthorized = (error: string) => NextResponse.json({ error }, { status: 401 })

// POST { token } ou { name } → { name } da sessão válida, 401 se revogada/arquivada
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const token = typeof body?.token === "string" ? body.token.trim() : ""
  const name = typeof body?.name === "string" ? body.name.trim() : ""

  const supabase = getSupabaseClient()

  if (token) {
    const { data: tokenRow, error } = await supabase
      .from("participant_tokens")
      .select("kind,revoked_at,participant_id")
      .eq("token", token)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!tokenRow || tokenRow.kind !== "personal" || tokenRow.revoked_at || !tokenRow.participant_id) {
      return unauthorized("Esse link foi desativado. Peça um link novo para quem administra o grupo.")
    }

    const { data: participant, error: pError } = await supabase
      .from("participants")
      .select("name,is_archived")
      .eq("id", tokenRow.participant_id)
      .maybeSingle()
    if (pError) return NextResponse.json({ error: pError.message }, { status: 500 })
    if (!participant || participant.is_archived) {
      return unauthorized("Seu acesso foi desativado. Fale com quem administra o grupo.")
    }
    return NextResponse.json({ name: participant.name })
  }

  if (name) {
    if (!USERS.some((u) => u.name === name)) return unauthorized("Sessão inválida.")
    const { data: participant, error } = await supabase
      .from("participants")
      .select("name,is_archived")
      .eq("name", name)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (participant?.is_archived) {
      return unauthorized("Seu acesso foi desativado. Fale com quem administra o grupo.")
    }
    return NextResponse.json({ name })
  }

  return NextResponse.json({ error: "token ou name obrigatório" }, { status: 400 })
}
