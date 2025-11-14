# Finanças do Casal

Aplicação Next.js para acompanhar lançamentos da tabela `shared_transactions` no Supabase.

## Requisitos

- Node.js 18 ou superior
- Contas e credenciais Supabase com acesso anônimo à tabela

## Variáveis de ambiente

Crie um arquivo `.env.local` com:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Desenvolvimento

1. Instale dependências com `npm install`.
2. Rode `npm run dev` para iniciar o servidor.
3. Acesse `http://localhost:3000`.

## Scripts úteis

- `npm run typecheck` para checar tipos TypeScript.
- `npm run lint` para garantir que o código está dentro dos padrões.

