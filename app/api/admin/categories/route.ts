import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

// GET → list categories with usage count
export async function GET() {
  const supabase = getSupabaseClient()

  const [catsRes, txRes] = await Promise.all([
    supabase.from("categories").select("id,name,created_at").order("name"),
    supabase.from("shared_transactions").select("category"),
  ])

  if (catsRes.error) return NextResponse.json({ error: catsRes.error.message }, { status: 500 })
  if (txRes.error) return NextResponse.json({ error: txRes.error.message }, { status: 500 })

  const usage = new Map<string, number>()
  for (const t of txRes.data ?? []) {
    const k = (t.category ?? "").trim()
    if (!k) continue
    usage.set(k, (usage.get(k) ?? 0) + 1)
  }

  const tableNames = new Set((catsRes.data ?? []).map(c => c.name))
  const categories = (catsRes.data ?? []).map(c => ({
    id: c.id,
    name: c.name,
    inTable: true,
    usage: usage.get(c.name) ?? 0,
  }))

  // Add categories that exist only on transactions but not in the table
  for (const [name, count] of usage.entries()) {
    if (!tableNames.has(name)) {
      categories.push({ id: null as unknown as string, name, inTable: false, usage: count })
    }
  }

  categories.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  return NextResponse.json({ categories })
}

// POST { action: "rename"|"merge"|"delete", from: string, to?: string, actor: string }
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { action, from, to, actor } = body as {
    action: "rename" | "merge" | "delete"; from: string; to?: string; actor?: string
  }
  if (!action || !from) {
    return NextResponse.json({ error: "action e from são obrigatórios" }, { status: 400 })
  }

  const supabase = getSupabaseClient()
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
        category: toTrim,
        last_edited_by: actor ?? null,
        last_edited_at: new Date().toISOString(),
      })
      .eq("category", fromTrim)
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    // Ensure target row exists in categories
    const { error: upsertError } = await supabase
      .from("categories")
      .upsert({ name: toTrim }, { onConflict: "name" })
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

    // Drop the source row
    await supabase.from("categories").delete().eq("name", fromTrim)
    return NextResponse.json({ ok: true })
  }

  if (action === "delete") {
    const { count, error: countError } = await supabase
      .from("shared_transactions")
      .select("id", { count: "exact", head: true })
      .eq("category", fromTrim)
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 })
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: `Categoria em uso por ${count} transações. Renomeie/mescle antes de excluir.` }, { status: 409 })
    }
    const { error: delError } = await supabase.from("categories").delete().eq("name", fromTrim)
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 })
}
