import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

function genToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")
}

// GET → return the active invite token (creates one if missing)
export async function GET() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("participant_tokens")
    .select("token,label,created_at")
    .eq("kind", "invite")
    .is("revoked_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!data) {
    const token = genToken()
    const { error: insertError } = await supabase
      .from("participant_tokens")
      .insert({ token, kind: "invite", label: "default" })
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ token, label: "default" })
  }
  return NextResponse.json({ token: data.token, label: data.label })
}

// POST → revoke current invite + create a new one
export async function POST() {
  const supabase = getSupabaseClient()
  const nowIso = new Date().toISOString()
  await supabase
    .from("participant_tokens")
    .update({ revoked_at: nowIso })
    .eq("kind", "invite")
    .is("revoked_at", null)

  const token = genToken()
  const { error: insertError } = await supabase
    .from("participant_tokens")
    .insert({ token, kind: "invite", label: "default" })
  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ token, label: "default" })
}
