import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import type { ReactNode } from "react"

import { Toaster } from "@/components/v2/primitives/toaster"
import { TooltipProvider } from "@/components/v2/primitives/tooltip"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Gastos Compartilhados",
  description: "Dashboard compartilhado de despesas",
  icons: { icon: "/icon.svg" },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f10",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <TooltipProvider delayDuration={200}>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  )
}
