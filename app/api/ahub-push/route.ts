import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"

// Map AHUB names to finance app names
const VALID_PEOPLE = ["Antônio", "Júlia", "Simões", "Pietro"]

function validateAndMapName(name: string): string | null {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  const MAP: Record<string, string> = {
    antonio: "Antônio",
    "antônio": "Antônio",
    julia: "Júlia",
    "júlia": "Júlia",
    simoes: "Simões",
    "simões": "Simões",
    pietro: "Pietro",
  }

  return MAP[normalized] ?? MAP[name.toLowerCase()] ?? (VALID_PEOPLE.includes(name) ? name : null)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { description, amount, date, paid_by, participants, category } = body

    // Validate required fields
    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json(
        { error: "description is required and must be a non-empty string" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "amount is required and must be a positive number" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "date is required and must be a string (YYYY-MM-DD)" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    if (!paid_by || typeof paid_by !== "string") {
      return NextResponse.json(
        { error: "paid_by is required and must be a string" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "participants is required and must be a non-empty array" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    // Validate and map paid_by
    const mappedPaidBy = validateAndMapName(paid_by)
    if (!mappedPaidBy) {
      return NextResponse.json(
        {
          error: `Invalid paid_by: "${paid_by}". Valid values: Antonio, Julia, Simões, Pietro`,
        },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    // Validate and map participants
    const mappedParticipants: string[] = []
    for (const p of participants) {
      const mapped = validateAndMapName(p)
      if (!mapped) {
        return NextResponse.json(
          {
            error: `Invalid participant: "${p}". Valid values: Antonio, Julia, Simões, Pietro`,
          },
          { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
        )
      }
      if (!mappedParticipants.includes(mapped)) {
        mappedParticipants.push(mapped)
      }
    }

    // Insert into Supabase
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("shared_transactions")
      .insert({
        description: description.trim(),
        amount,
        date,
        paid_by: mappedPaidBy,
        participants: mappedParticipants,
        category: category || null,
      })
      .select("*")
      .single()

    if (error) {
      console.error("[ahub-push] Supabase insert error:", error)
      return NextResponse.json(
        { error: "Failed to create transaction", details: error.message },
        { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    return NextResponse.json(
      {
        id: data.id,
        description: data.description,
        amount: data.amount,
        date: data.date,
        paid_by: data.paid_by,
        participants: data.participants,
        category: data.category,
        created_at: data.created_at,
      },
      { status: 201, headers: { "Access-Control-Allow-Origin": "*" } }
    )
  } catch (err) {
    console.error("[ahub-push] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    )
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    { ok: true },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  )
}
