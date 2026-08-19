import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { parsePermissions, DEFAULT_PERMISSIONS } from "@/lib/permissions"

function genToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/

// GET → list all participants (members + guests) with their tokens, tx count, last activity, is_admin, permissions
export async function GET() {
  const supabase = getSupabaseClient()

  const [participantsRes, tokensRes, txRes] = await Promise.all([
    supabase
      .from("participants")
      .select("id,name,color,kind,is_admin,permissions,is_archived,created_at")
      .order("kind", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("participant_tokens")
      .select("token,kind,label,participant_id,created_at,revoked_at")
      .not("participant_id", "is", null),
    supabase
      .from("shared_transactions")
      .select("paid_by,participants,last_edited_by,last_edited_at,date")
      .eq("is_hidden", false),
  ])

  if (participantsRes.error) return NextResponse.json({ error: participantsRes.error.message }, { status: 500 })
  if (tokensRes.error) return NextResponse.json({ error: tokensRes.error.message }, { status: 500 })
  if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 })

  const participants = participantsRes.data ?? []
  const tokens = tokensRes.data ?? []
  const transactions = txRes.data ?? []

  const items = participants.map(p => {
    const pTokens = tokens.filter(t => t.participant_id === p.id)
    let txCount = 0
    let lastActivity: string | null = null
    for (const t of transactions) {
      const involved = t.paid_by === p.name || (t.participants ?? []).includes(p.name)
      if (!involved) continue
      txCount++
      const candidate = t.last_edited_at ?? t.date
      if (candidate && (!lastActivity || candidate > lastActivity)) {
        lastActivity = candidate
      }
    }
    return {
      ...p,
      is_admin: Boolean(p.is_admin) || p.name === "Antônio",
      permissions: p.permissions ? parsePermissions(p.permissions) : { ...DEFAULT_PERMISSIONS },
      tokens: pTokens,
      transactionCount: txCount,
      lastActivity,
    }
  })

  return NextResponse.json({ items })
}

// PATCH → update participant fields (name, color, is_admin, permissions, is_archived), or revoke a token
export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const supabase = getSupabaseClient()

  // Revoke a specific token
  if (body?.action === "revokeToken") {
    const token = String(body?.token ?? "").trim()
    if (!token) return NextResponse.json({ error: "token obrigatório" }, { status: 400 })
    const { error } = await supabase
      .from("participant_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token", token)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // Update a participant
  const participantId = String(body?.guestId ?? body?.participantId ?? "").trim()
  if (!participantId) return NextResponse.json({ error: "participantId obrigatório" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (typeof body?.name === "string") {
    const name = body.name.trim()
    if (!name || name.length > 40) return NextResponse.json({ error: "Nome inválido" }, { status: 400 })
    updates.name = name
  }
  if (typeof body?.color === "string") {
    if (!HEX_RE.test(body.color)) return NextResponse.json({ error: "Cor inválida" }, { status: 400 })
    updates.color = body.color
  }
  if (typeof body?.is_archived === "boolean") {
    updates.is_archived = body.is_archived
  }
  if (typeof body?.is_admin === "boolean") {
    updates.is_admin = body.is_admin
  }
  if (body?.permissions && typeof body.permissions === "object") {
    updates.permissions = parsePermissions(body.permissions)
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada a atualizar" }, { status: 400 })
  }

  // If renaming, propagate the new name to existing transactions
  if (typeof updates.name === "string") {
    const { data: current, error: cErr } = await supabase
      .from("participants")
      .select("name")
      .eq("id", participantId)
      .maybeSingle()
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })
    if (current && current.name !== updates.name) {
      const oldName = current.name
      const newName = updates.name as string

      // Reject if new name collides
      const { data: dupes, error: dupeError } = await supabase
        .from("participants")
        .select("id")
        .ilike("name", newName)
        .neq("id", participantId)
      if (dupeError) return NextResponse.json({ error: dupeError.message }, { status: 500 })
      if (dupes && dupes.length > 0) {
        return NextResponse.json({ error: "Já existe um participante com esse nome" }, { status: 409 })
      }

      // Update paid_by occurrences
      await supabase
        .from("shared_transactions")
        .update({ paid_by: newName })
        .eq("paid_by", oldName)

      // Update participants array (server-side requires fetching + writing)
      const { data: tx } = await supabase
        .from("shared_transactions")
        .select("id,participants")
        .contains("participants", [oldName])
      if (tx) {
        for (const t of tx) {
          const next = (t.participants ?? []).map((n: string) => n === oldName ? newName : n)
          await supabase.from("shared_transactions").update({ participants: next }).eq("id", t.id)
        }
      }
    }
  }

  const { data, error } = await supabase
    .from("participants")
    .update(updates)
    .eq("id", participantId)
    .select("*")
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ participant: data, guest: data })
}

// POST → generate a new personal magic-link token for a participant
export async function POST(req: NextRequest) {
  const body = await req.json()
  const participantId = String(body?.guestId ?? body?.participantId ?? "").trim()
  if (!participantId) return NextResponse.json({ error: "participantId obrigatório" }, { status: 400 })

  const supabase = getSupabaseClient()

  // Verify the participant exists
  const { data: participant, error: gErr } = await supabase
    .from("participants")
    .select("id,kind")
    .eq("id", participantId)
    .maybeSingle()
  if (gErr) return NextResponse.json({ error: gErr.message }, { status: 500 })
  if (!participant) return NextResponse.json({ error: "Participante não encontrado" }, { status: 404 })

  const token = genToken()
  const { error } = await supabase
    .from("participant_tokens")
    .insert({ token, participant_id: participantId, kind: "personal" })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ token })
}
