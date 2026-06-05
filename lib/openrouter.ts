import OpenAI from "openai"

export function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada")
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/financas-do-casal",
      "X-Title": "Finanças do Casal",
    },
  })
}

// Modelo fixo no código (não via env) — env var já causou 400 com slug inválido
// sobrescrevendo o default silenciosamente. Slug válido conferido na API do OpenRouter.
export const OPENROUTER_MODEL = "google/gemini-3.5-flash"
