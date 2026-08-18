import { PinPad } from "@/components/v2/access/pin-pad"
import { BrandIcon } from "@/components/v2/brand/brand-icon"

export default function LoginPage() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="surface-2 flex w-full max-w-sm flex-col items-center gap-8 rounded-2xl p-10">
        <div className="flex flex-col items-center space-y-2 text-center">
          <BrandIcon className="size-10" />
          <h1 className="font-display text-2xl font-semibold tracking-tight">
            Dividc
          </h1>
          <p className="text-xs text-muted-foreground">
            Acesse com seu PIN
          </p>
        </div>
        <PinPad />
      </div>
    </div>
  )
}
