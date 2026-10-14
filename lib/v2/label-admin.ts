import { NextRequest, NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSupabaseClient } from "@/lib/supabase"

// The typed client can't narrow `from(table)` / `{ [column]: … }` over a union
// of table names, so these generic handlers go through the untyped client.
const client = () => getSupabaseClient() as unknown as SupabaseClient

type LabelConfig = {
  table: "categories" | "events"
  column: "category" | "event"
  inUseError: (count: number) => string
}

export function labelAdminHandlers({ table, column, inUseError }: LabelConfig) {
  async function GET() {
    const supabase = client()

    const [labelsRes, txRes] = await Promise.all([
      supabase.from(table).select("id,name,created_at").order("name"),
      supabase.from("shared_transactions").select(column),
    ])

    if (labelsRes.error) return NextResponse.json({ error: labelsRes.error.message }, { status: 500 })
    if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 })

    const usage = new Map<string, number>()
    for (const t of (txRes.data ?? []) as Record<string, string | null>[]) {
      const k = (t[column] ?? "").trim()
      if (!k) continue
      usage.set(k, (usage.get(k) ?? 0) + 1)
    }

    const labels = (labelsRes.data ?? []) as { id: string; name: string }[]
    const tableNames = new Set(labels.map((c) => c.name))
    const items = labels.map((c) => ({
      id: c.id as string | null,
      name: c.name,
      inTable: true,
      usage: usage.get(c.name) ?? 0,
    }))

    for (const [name, count] of Array.from(usage.entries())) {
      if (!tableNames.has(name)) {
        items.push({ id: null, name, inTable: false, usage: count })
      }
    }

    items.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    return NextResponse.json({ items })
  }

  // POST { action: "rename"|"merge"|"delete", from: string, to?: string, actor: string }
  async function POST(req: NextRequest) {
    const body = await req.json()
    const { action, from, to, actor } = body as {
      action: "rename" | "merge" | "delete"; from: string; to?: string; actor?: string
    }
    if (!action || !from) {
      return NextResponse.json({ error: "action e from são obrigatórios" }, { status: 400 })
    }

    const supabase = client()
    const fromTrim = from.trim()
    const toTrim = (to ?? "").trim()

    if (action === "rename" || action === "merge") {
      if (!toTrim) return NextResponse.json({ error: "to obrigatório" }, { status: 400 })
      if (fromTrim === toTrim) {
        return NextResponse.json({ error: "Nome de origem e destino são iguais" }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from("shared_transactions")
        .update({
          [column]: toTrim,
          last_edited_by: actor ?? null,
          last_edited_at: new Date().toISOString(),
        })
        .eq(column, fromTrim)
      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

      const { error: upsertError } = await supabase
        .from(table)
        .upsert({ name: toTrim }, { onConflict: "name" })
      if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

      await supabase.from(table).delete().eq("name", fromTrim)
      return NextResponse.json({ ok: true })
    }

    if (action === "delete") {
      const { count, error: countError } = await supabase
        .from("shared_transactions")
        .select("id", { count: "exact", head: true })
        .eq(column, fromTrim)
      if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
      if ((count ?? 0) > 0) {
        return NextResponse.json({ error: inUseError(count ?? 0) }, { status: 409 })
      }
      const { error: delError } = await supabase.from(table).delete().eq("name", fromTrim)
      if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })
  }

  return { GET, POST }
}
