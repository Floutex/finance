import { PlaceholderPage } from "@/components/v2/layout/placeholder-page"

export default function GuestPage({ params }: { params: { token: string } }) {
  return (
    <PlaceholderPage
      eyebrow={`Convidado · ${params.token.slice(0, 8)}…`}
      title="Visão do convidado"
      description="Layout minimal mostrando saldo e transações onde o convidado participa."
      phase="Fase 4"
    />
  )
}
