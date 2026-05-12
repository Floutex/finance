import { PinPad } from "@/components/v2/access/pin-pad"

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="surface-2 flex w-full max-w-sm flex-col items-center gap-8 rounded-2xl p-10">
        <div className="space-y-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Gastos Compartilhados
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Acessar
          </h1>
        </div>
        <PinPad />
      </div>
    </div>
  )
}
