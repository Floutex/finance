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
  const memberLine = args.members.length
    ? `- Membros do app: ${args.members.join(", ")}\n`
    : ""
  const participantLine = args.participants.length
    ? `- Participantes ativos: ${args.participants.join(", ")}\n`
    : ""
  return `Você é o assistente do app de finanças compartilhadas "Gastos". Responda dúvidas do usuário de forma curta, clara e em português brasileiro. Sem markdown pesado, sem blocos de código — apenas texto direto.

Contexto:
- Usuário logado: ${args.currentUser}
${memberLine}${participantLine}- Data de hoje: ${args.today}`
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
