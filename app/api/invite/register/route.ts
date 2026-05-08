import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

function genToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

// POST { token, name, color }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const inviteToken = String(body?.token ?? "").trim()
  const name = String(body?.name ?? "").trim()
  const color = String(body?.color ?? "").trim()

  if (!inviteToken) return NextResponse.json({ error: "token obrigatório" }, { status: 400 })
  if (!name || name.length > 40) return NextResponse.json({ error: "Nome inválido" }, { status: 400 })
  if (!HEX_RE.test(color)) return NextResponse.json({ error: "Cor inválida" }, { status: 400 })

  const supabase = getSupabaseClient()

  const { data: invite, error: inviteError } = await supabase
    .from("participant_tokens")
    .select("token,kind,revoked_at")
    .eq("token", inviteToken)
    .maybeSingle()
  if (inviteError) return NextResponse.json({ error: inviteError.message }, { status: 500 })
  if (!invite || invite.kind !== "invite" || invite.revoked_at) {
    return NextResponse.json({ error: "Convite inválido ou expirado" }, { status: 404 })
  }

  // Reject duplicate name (case-insensitive)
  const { data: dupes, error: dupeError } = await supabase
    .from("participants")
    .select("id,name")
    .ilike("name", name)
  if (dupeError) return NextResponse.json({ error: dupeError.message }, { status: 500 })
  if (dupes && dupes.length > 0) {
    return NextResponse.json({ error: "Já existe um participante com esse nome" }, { status: 409 })
  }

  const { data: participant, error: pError } = await supabase
    .from("participants")
    .insert({ name, color, kind: "guest" })
    .select("*")
    .single()
  if (pError || !participant) {
    return NextResponse.json({ error: pError?.message ?? "Falha ao criar participante" }, { status: 500 })
  }

  const personalToken = genToken()
  const { error: tokenError } = await supabase
    .from("participant_tokens")
    .insert({ token: personalToken, participant_id: participant.id, kind: "personal" })
  if (tokenError) return NextResponse.json({ error: tokenError.message }, { status: 500 })

  return NextResponse.json({ personalToken, participant })
}
