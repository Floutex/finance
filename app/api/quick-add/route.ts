import { NextRequest, NextResponse } from "next/server"
import { getOpenRouterClient, OPENROUTER_MODEL } from "@/lib/openrouter"

export const runtime = "nodejs"

type ClientMessage = {
  role: "user" | "assistant"
  /** Free text from the user / model. */
  text?: string
  /** Optional inline base64 image (with data: prefix), only on user messages. */
  imageDataUrl?: string
}

type RequestBody = {
  messages: ClientMessage[]
  currentUser: string
  members: string[]
  participants: string[]
  today: string
}

function systemPrompt(args: {
  currentUser: string
  members: string[]
  participants: string[]
  today: string
}) {
  return `Você é o assistente do app de finanças compartilhadas "Gastos". Você ajuda o usuário a registrar despesas, ler recibos e responder dúvidas rápidas sobre as transações dele.

Contexto:
- Usuário logado: ${args.currentUser}
- Membros do app (podem ser "pago por"): ${args.members.join(", ")}
- Participantes ativos (podem rachar a conta): ${args.participants.join(", ")}
- Data de hoje: ${args.today}

Quando o usuário quiser registrar UMA transação, responda SOMENTE com um bloco de código JSON neste formato exato:
\`\`\`json
{
  "intent": "create_transaction",
  "data": {
    "description": "...",
    "amount": 0.00,
    "date": "YYYY-MM-DD",
    "paid_by": "Nome de um dos membros",
    "participants": ["nome", "nome"],
    "category": "categoria opcional ou null"
  },
  "summary": "frase curta em português confirmando o que vai criar"
}
\`\`\`

Quando o usuário enviar uma imagem de recibo (ou pedir explicitamente pra extrair várias transações), responda com:
\`\`\`json
{
  "intent": "create_transactions_batch",
  "items": [
    { "description": "...", "amount": 0.00, "date": "YYYY-MM-DD", "paid_by": "...", "participants": ["..."], "category": null }
  ],
  "summary": "N transações extraídas do recibo"
}
\`\`\`

Regras:
- "paid_by" deve ser EXATAMENTE um dos membros listados acima. Default: ${args.currentUser}.
- "participants" deve ser um subset dos participantes listados. Default: todos os participantes ativos.
- "date" no formato YYYY-MM-DD. Se não houver data, use hoje (${args.today}).
- "amount" sempre em número (ponto decimal). Sem símbolo de moeda.
- Se a pergunta for conversa/dúvida (não registro), responda em texto natural curto, sem JSON.
- Nunca invente nomes que não estejam na lista de membros.
- Sempre confirme com o usuário antes de salvar — você só PROPÕE; o app pede confirmação dele.
- Responda sempre em português brasileiro.`
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestBody
    if (!body.messages || body.messages.length === 0) {
      return NextResponse.json({ error: "Sem mensagens" }, { status: 400 })
    }

    const client = getOpenRouterClient()

    const llmMessages: any[] = [
      { role: "system", content: systemPrompt(body) },
    ]

    for (const m of body.messages) {
      if (m.role === "user") {
        if (m.imageDataUrl) {
          llmMessages.push({
            role: "user",
            content: [
              { type: "image_url", image_url: { url: m.imageDataUrl } },
              { type: "text", text: m.text || "Analise este recibo." },
            ],
          })
        } else {
          llmMessages.push({ role: "user", content: m.text || "" })
        }
      } else {
        llmMessages.push({ role: "assistant", content: m.text || "" })
      }
    }

    const response = await client.chat.completions.create({
      model: OPENROUTER_MODEL,
      messages: llmMessages,
      max_tokens: 2000,
    })

    const text = response.choices[0]?.message?.content ?? ""

    let intent: any = null
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (jsonMatch) {
      try {
        intent = JSON.parse(jsonMatch[1].trim())
      } catch {
        intent = null
      }
    }

    return NextResponse.json({ text, intent })
  } catch (error) {
    console.error("[quick-add] erro:", error)
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
    return NextResponse.json(
      { error: "Erro no assistente", details: errorMessage },
      { status: 500 }
    )
  }
}
