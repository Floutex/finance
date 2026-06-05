import { NextRequest, NextResponse } from "next/server"
import { getOpenRouterClient, OPENROUTER_MODEL } from "@/lib/openrouter"

export const runtime = "nodejs"

/**
 * One-shot quick-add: recebe um texto livre e extrai UMA OU VÁRIAS transações
 * de uma vez ("mercado 80, uber 25 ontem, cinema 50 com a Ana"). Nunca faz
 * pergunta de follow-up — se nada puder ser extraído, devolve `{ ok: false }`.
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

type RawTx = {
  description?: string
  amount?: number | string
  date?: string
  paid_by?: string
  category?: string | null
  participants?: string[]
}

type Extracted = {
  ok?: boolean
  transactions?: RawTx[]
  error?: string
}

type CleanTx = {
  description: string
  amount: number
  date: string
  paid_by: string
  category: string | null
  participants: string[]
}

function systemPrompt(args: {
  currentUser: string
  members: string[]
  participants: string[]
  defaultParticipants: string[]
  today: string
}) {
  return `Você extrai UMA OU MAIS despesas a partir de um texto em português. Responda APENAS com um objeto JSON, sem markdown, sem explicações.

Contexto:
- Data de hoje: ${args.today}
- Usuário logado (pagador padrão): ${args.currentUser}
- Nomes válidos para "paid_by": ${args.members.join(", ") || args.currentUser}
- Participantes ativos (para a divisão): ${args.participants.join(", ") || args.currentUser}
- Participantes padrão da divisão: ${args.defaultParticipants.join(", ") || args.currentUser}

Regras:
- NUNCA faça perguntas. Extraia o que der do texto e preencha o resto com os padrões.
- O texto pode conter VÁRIAS despesas (separadas por vírgula, "e", quebras de linha, etc.). Crie um item por despesa. Não invente despesas que não estão no texto.
- "amount": número positivo, ponto como separador decimal. Interprete "80", "80 reais", "R$ 80,50", "1.200,00".
- Ignore qualquer item sem um valor numérico claro ou sem descrição. Se NENHUMA despesa for válida, responda {"ok": false, "error": "<motivo curto>"}.
- "date": resolva datas relativas ("hoje", "ontem", "anteontem", dia da semana) em relação à data de hoje. Padrão = hoje.
- "paid_by": um nome da lista de "paid_by". Se o texto disser "eu paguei" ou não mencionar pagador, use exatamente "${args.currentUser}". Combine nomes ignorando maiúsculas/acentos e devolva o nome exato da lista.
- "participants": nomes da lista de participantes ativos mencionados (ex.: "dividido com a Ana" → inclua "${args.currentUser}" e "Ana"). Se ninguém for mencionado, use os participantes padrão.
- "category": uma categoria curta se for óbvia (ex.: Mercado, Transporte, Restaurante, Lazer, Saúde, Casa, Contas), senão null.

Formato exato em caso de sucesso (sempre um array, mesmo com uma só despesa):
{"ok": true, "transactions": [{"description": "string", "amount": 0, "date": "YYYY-MM-DD", "paid_by": "string", "category": "string ou null", "participants": ["string"]}]}
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

function cleanTransaction(
  raw: RawTx,
  ctx: {
    currentUser: string
    validPayers: string[]
    validParticipants: string[]
    defaultParticipants: string[]
    today: string
  }
): CleanTx | null {
  const description = String(raw.description || "").trim()
  const amount =
    typeof raw.amount === "number"
      ? raw.amount
      : parseFloat(
          String(raw.amount ?? "")
            .replace(/\./g, "")
            .replace(",", ".")
        ) || 0
  if (!description || !(amount > 0)) return null

  const paid_by = matchName(raw.paid_by, ctx.validPayers) ?? ctx.currentUser

  const dateRaw = String(raw.date || ctx.today).trim()
  const date = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : ctx.today

  let participants = Array.isArray(raw.participants)
    ? raw.participants
        .map((p) => matchName(p, ctx.validParticipants))
        .filter((p): p is string => p !== null)
    : []
  if (participants.length === 0) participants = ctx.defaultParticipants

  const category =
    raw.category && String(raw.category).trim()
      ? String(raw.category).trim()
      : null

  return { description, amount, date, paid_by, category, participants }
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
      // Folga pra extrair muitas transações de uma vez sem truncar o JSON.
      max_tokens: 4000,
      response_format: { type: "json_object" },
    })

    const raw = response.choices[0]?.message?.content ?? ""
    const parsed = parseJsonObject(raw)

    if (!parsed || parsed.ok === false || !Array.isArray(parsed.transactions)) {
      return NextResponse.json({
        ok: false,
        error:
          parsed?.error ||
          "Não consegui entender o gasto. Tente algo como “mercado 80”.",
      })
    }

    const ctx = {
      currentUser: body.currentUser,
      validPayers,
      validParticipants,
      defaultParticipants,
      today: body.today,
    }
    const transactions = parsed.transactions
      .map((t) => cleanTransaction(t, ctx))
      .filter((t): t is CleanTx => t !== null)

    if (transactions.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Faltou o valor ou a descrição. Tente algo como “mercado 80”.",
      })
    }

    return NextResponse.json({ ok: true, transactions })
  } catch (error) {
    console.error("[quick-add] erro:", error)
    const details = error instanceof Error ? error.message : "Erro desconhecido"
    return NextResponse.json({ ok: false, error: "Erro no assistente", details }, { status: 500 })
  }
}
