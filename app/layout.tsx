import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ReactNode } from "react"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Gastos Compartilhados",
  description: "Dashboard compartilhado de despesas",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
}

export default function RootLayout(props: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {props.children}
      </body>
    </html>
  )
}

