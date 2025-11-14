import type { Metadata } from "next"
import { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Finanças do Casal",
  description: "Dashboard compartilhado de despesas"
}

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {props.children}
      </body>
    </html>
  )
}

