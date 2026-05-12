import { PlaceholderPage } from "@/components/v2/layout/placeholder-page"

export default function GuestRegisterPage({
  params,
}: {
  params: { token: string }
}) {
  return (
    <PlaceholderPage
      eyebrow={`Onboarding · ${params.token.slice(0, 8)}…`}
      title="Registrar como convidado"
      description="Escolha nome, cor e crie um PIN inicial."
      phase="Fase 4"
    />
  )
}
