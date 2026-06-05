import { NextRequest, NextResponse } from "next/server"
import { getOpenRouterClient, OPENROUTER_MODEL } from "@/lib/openrouter"

export const runtime = "nodejs"

/**
 * One-shot quick-add: recebe um texto livre ("mercado 80 dividido com a Ana")
 * e extrai UMA transação estruturada. Nunca faz pergunta de follow-up — se não
 * der pra extrair valor/descrição, devolve `{ ok: false, error }`.
 */
type RequestBody = {
  /** Texto livre digitado pelo usuário. */
  text: string
  /** Usuário logado — pagador padrão quando o texto não diz quem pagou. */
  currentUser: string
  /** Nomes que podem ser "pago por" (membros, ou só o convidado no guest). */
  members: string[]
  /** Nomes de participantes ativos que podem entrar na divisão. */
  participants: string[]
  /** Participantes padrão da divisão quando o texto não menciona ninguém. */
  defaultParticipants: string[]
  /** Data de hoje (YYYY-MM-DD) no fuso do cliente. */
  today: string
}

type Extracted = {
  ok: boolean
  description?: string
  amount?: number
  date?: string
  paid_by?: string
  category?: string | null
  participants?: string[]
  error?: string
}

function systemPrompt(args: {
  currentUser: string
  members: string[]
  participants: string[]
  defaultParticipants: string[]
  today: string
}) {
  return `Você extrai UMA despesa a partir de um texto curto em português. Responda APENAS com um objeto JSON, sem markdown, sem explicações.

Contexto:
- Data de hoje: ${args.today}
- Usuário logado (pagador padrão): ${args.currentUser}
- Nomes válidos para "paid_by": ${args.members.join(", ") || args.currentUser}
- Participantes ativos (para a divisão): ${args.participants.join(", ") || args.currentUser}
- Participantes padrão da divisão: ${args.defaultParticipants.join(", ") || args.currentUser}

Regras:
- NUNCA faça perguntas. Extraia o que der do texto e preencha o resto com os padrões.
- "amount": número positivo, ponto como separador decimal. Interprete "80", "80 reais", "R$ 80,50", "1.200,00".
- Se NÃO houver um valor numérico claro ou uma descrição, responda {"ok": false, "error": "<motivo curto>"}.
- "date": resolva datas relativas ("hoje", "ontem", "anteontem", dia da semana) em relação à data de hoje. Padrão = hoje.
- "paid_by": um nome da lista de "paid_by". Se o texto disser "eu paguei" ou não mencionar pagador, use exatamente "${args.currentUser}". Combine nomes ignorando maiúsculas/acentos e devolva o nome exato da lista.
- "participants": nomes da lista de participantes ativos mencionados (ex.: "dividido com a Ana" → inclua "${args.currentUser}" e "Ana"). Se ninguém for mencionado, use os participantes padrão.
- "category": uma categoria curta se for óbvia (ex.: Mercado, Transporte, Restaurante, Lazer, Saúde, Casa, Contas), senão null.

Formato exato em caso de sucesso:
{"ok": true, "description": "string", "amount": 0, "date": "YYYY-MM-DD", "paid_by": "string", "category": "string ou null", "participants": ["string"]}
Em caso de falha:
{"ok": false, "error": "string"}`
}

function parseJsonObject(text: string): Extracted | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0]) as Extracted
  } catch {
    return null
  }
}

/** Normaliza um nome contra uma lista, ignorando caixa/acentos. */
function matchName(value: string | undefined, options: string[]): string | null {
  if (!value) return null
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .trim()
      .toLowerCase()
  const target = norm(value)
  return options.find((o) => norm(o) === target) ?? null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    const text = (body.text || "").trim()
    if (!text) {
      return NextResponse.json({ ok: false, error: "Escreva o gasto." }, { status: 400 })
    }

    const validPayers =
      body.members && body.members.length ? body.members : [body.currentUser]
    const validParticipants =
      body.participants && body.participants.length
        ? body.participants
        : [body.currentUser]
    const defaultParticipants =
      body.defaultParticipants && body.defaultParticipants.length
        ? body.defaultParticipants
        : [body.currentUser]

    const client = getOpenRouterClient()
    const response = await client.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content: systemPrompt({
            currentUser: body.currentUser,
            members: validPayers,
            participants: validParticipants,
            defaultParticipants,
            today: body.today,
          }),
        },
        { role: "user", content: text },
      ],
      max_tokens: 500,
      response_format: { type: "json_object" },
    })

    const raw = response.choices[0]?.message?.content ?? ""
    const parsed = parseJsonObject(raw)

    if (!parsed || parsed.ok === false) {
      return NextResponse.json({
        ok: false,
        error: parsed?.error || "Não consegui entender o gasto. Tente algo como “mercado 80”.",
      })
    }

    // Validação/normalização server-side — o modelo é best-effort.
    const description = String(parsed.description || "").trim()
    const amount =
      typeof parsed.amount === "number"
        ? parsed.amount
        : parseFloat(String(parsed.amount ?? "").replace(/\./g, "").replace(",", ".")) || 0

    if (!description || !(amount > 0)) {
      return NextResponse.json({
        ok: false,
        error: "Faltou o valor ou a descrição. Tente algo como “mercado 80”.",
      })
    }

    const paid_by =
      matchName(parsed.paid_by, validPayers) ?? body.currentUser

    const dateRaw = String(parsed.date || body.today).trim()
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : body.today

    let participants = Array.isArray(parsed.participants)
      ? parsed.participants
          .map((p) => matchName(p, validParticipants))
          .filter((p): p is string => p !== null)
      : []
    if (participants.length === 0) participants = defaultParticipants

    const category =
      parsed.category && String(parsed.category).trim()
        ? String(parsed.category).trim()
        : null

    return NextResponse.json({
      ok: true,
      transaction: { description, amount, date, paid_by, category, participants },
    })
  } catch (error) {
    console.error("[quick-add] erro:", error)
    const details = error instanceof Error ? error.message : "Erro desconhecido"
    return NextResponse.json({ ok: false, error: "Erro no assistente", details }, { status: 500 })
  }
}
