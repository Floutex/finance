import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { simplifyDebts } from "@/lib/debt-simplification"

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!

const VALID_PEOPLE: Record<string, string> = {
  antonio: "Antonio",
  antônio: "Antonio",
  julia: "Julia",
  júlia: "Julia",
  simoes: "Simões",
  simões: "Simões",
  pietro: "Pietro",
}

async function sendMessage(chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  })
}

function resolvePerson(name: string): string | null {
  const normalized = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  return VALID_PEOPLE[normalized] ?? VALID_PEOPLE[name.toLowerCase()] ?? null
}

export async function POST(req: NextRequest) {
  const update = await req.json()
  const message = update.message
  if (!message?.text) return NextResponse.json({ ok: true })

  const chatId: number = message.chat.id
  const text: string = message.text.trim()

  if (text.startsWith("/add")) {
    // /add <descrição> <valor> <quem pagou> [participantes...]
    const parts = text.slice(4).trim().split(/\s+/)

    if (parts.length < 3) {
      await sendMessage(
        chatId,
        "Uso: `/add <descrição> <valor> <quem pagou> [participantes...]`\n" +
          "Ex: `/add Mercado 150 Antonio Julia Pietro`"
      )
      return NextResponse.json({ ok: true })
    }

    const description = parts[0]
    const amount = parseFloat(parts[1].replace(",", "."))
    const paidByRaw = parts[2]
    const participantRaws = parts.length > 3 ? parts.slice(2) : [paidByRaw]

    if (isNaN(amount)) {
      await sendMessage(chatId, "Valor inválido. Use número como `150` ou `150.50`")
      return NextResponse.json({ ok: true })
    }

    const paid_by = resolvePerson(paidByRaw)
    if (!paid_by) {
      await sendMessage(
        chatId,
        `Pessoa não reconhecida: *${paidByRaw}*\nPessoas válidas: Antonio, Julia, Simões, Pietro`
      )
      return NextResponse.json({ ok: true })
    }

    const participants: string[] = []
    for (const p of participantRaws) {
      const resolved = resolvePerson(p)
      if (!resolved) {
        await sendMessage(
          chatId,
          `Participante não reconhecido: *${p}*\nPessoas válidas: Antonio, Julia, Simões, Pietro`
        )
        return NextResponse.json({ ok: true })
      }
      if (!participants.includes(resolved)) participants.push(resolved)
    }

    const date = new Date().toISOString().slice(0, 10)
    const supabase = getSupabaseClient()
    const { error } = await supabase
      .from("shared_transactions")
      .insert({ description, date, amount, paid_by, participants })
      .select("*")
      .single()

    if (error) {
      await sendMessage(chatId, `Erro ao salvar: ${error.message}`)
    } else {
      await sendMessage(
        chatId,
        `✅ Transação adicionada!\n*${description}* — R$ ${amount.toFixed(2)}\nPago por: ${paid_by}\nParticipantes: ${participants.join(", ")}`
      )
    }
  } else if (text.startsWith("/saldo")) {
    const supabase = getSupabaseClient()
    const [{ data: transactions }, { data: incomes }] = await Promise.all([
      supabase.from("shared_transactions").select("*").eq("is_hidden", false),
      supabase.from("monthly_incomes").select("*"),
    ])

    const incomeMap = new Map<string, Map<string, number>>()
    for (const inc of incomes ?? []) {
      if (!incomeMap.has(inc.year_month)) incomeMap.set(inc.year_month, new Map())
      incomeMap.get(inc.year_month)!.set(inc.person, inc.amount)
    }

    const debts = simplifyDebts(
      (transactions ?? [])
        .filter((t) => t.paid_by && t.amount && t.participants)
        .map((t) => ({ paid_by: t.paid_by, amount: t.amount!, date: t.date, participants: t.participants! })),
      incomeMap
    )

    if (debts.length === 0) {
      await sendMessage(chatId, "Ninguém deve nada a ninguém! 🎉")
    } else {
      const lines = debts.map((d) => `• ${d.from} → ${d.to}: R$ ${d.amount.toFixed(2)}`)
      await sendMessage(chatId, `*Saldos atuais:*\n${lines.join("\n")}`)
    }
  } else if (text.startsWith("/help")) {
    await sendMessage(
      chatId,
      "*Comandos disponíveis:*\n" +
        "`/add <descrição> <valor> <quem pagou> [participantes...]` — adiciona gasto\n" +
        "Ex: `/add Mercado 150 Antonio Julia Pietro`\n\n" +
        "`/saldo` — mostra quem deve quanto pra quem"
    )
  }

  return NextResponse.json({ ok: true })
}
