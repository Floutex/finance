import OpenAI from "openai"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "OPENAI_API_KEY não configurada" }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get("image") as File | null

    if (!file) {
      return NextResponse.json({ error: "Nenhuma imagem fornecida" }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64Image = buffer.toString("base64")
    const mimeType = file.type

    const openai = new OpenAI({ apiKey })

    const prompt = `Analise esta imagem e extraia todas as transações financeiras presentes. Para cada transação, identifique:

1. Descrição: O que foi comprado ou o nome da transação
2. Data: A data da transação no formato YYYY-MM-DD (se não houver data, use a data de hoje)
3. Valor total: O valor total da transação em número (sem símbolos de moeda, use ponto como separador decimal)

Retorne APENAS um JSON válido no formato:
[
  {
    "description": "descrição da transação",
    "date": "YYYY-MM-DD",
    "amount": 123.45
  }
]

Se houver múltiplas transações na imagem, retorne um array com todas elas. Se houver apenas uma transação, retorne um array com um único objeto.`

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            },
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ],
      max_tokens: 2000
    })

    const text = response.choices[0]?.message?.content
    if (!text) {
      return NextResponse.json({ error: "Resposta vazia da OpenAI" }, { status: 500 })
    }

    let transactions
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error("Resposta da OpenAI não contém JSON válido")
      }
      transactions = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      return NextResponse.json(
        { error: "Erro ao processar resposta da OpenAI", details: text },
        { status: 500 }
      )
    }

    if (!Array.isArray(transactions)) {
      return NextResponse.json({ error: "Resposta da OpenAI não é um array" }, { status: 500 })
    }

    const validatedTransactions = transactions.map((t: any) => {
      const today = new Date().toISOString().slice(0, 10)
      return {
        description: String(t.description || "").trim(),
        date: String(t.date || today).trim(),
        amount: typeof t.amount === "number" ? t.amount : parseFloat(String(t.amount || 0).replace(",", ".")) || 0
      }
    })

    return NextResponse.json({ transactions: validatedTransactions })
  } catch (error) {
    console.error("Erro ao analisar imagem:", error)
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido"
    const errorStack = error instanceof Error ? error.stack : undefined
    console.error("Detalhes do erro:", { errorMessage, errorStack, error })
    return NextResponse.json(
      {
        error: "Erro ao processar imagem",
        details: errorMessage,
        stack: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}
